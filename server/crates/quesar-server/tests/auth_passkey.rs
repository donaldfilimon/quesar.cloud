//! Passkeys end to end: a software authenticator registers and signs in over
//! the real routes, and every abuse case of the brief is refused.

mod common;
mod passkey_support;

use axum::http::StatusCode;
use common::{COOKIE_NAME, Harness, ORIGIN, Reply};
use passkey_support::{SoftBrowser, b64, unb64};
use serde_json::{Value, json};
use std::time::Duration;

const REGISTER_BINDING: &str = "__Host-quesar.passkey_register_binding";
const SIGN_IN_BINDING: &str = "__Host-quesar.passkey_authenticate_binding";

fn hours(h: u64) -> Duration {
    Duration::from_secs(h * 3600)
}

fn secs(s: u64) -> Duration {
    Duration::from_secs(s)
}

/// The `name=value` pair of the `Set-Cookie` called `name`.
fn pair(reply: &Reply, name: &str) -> String {
    reply
        .set_cookies()
        .iter()
        .find(|cookie| cookie.starts_with(&format!("{name}=")))
        .unwrap_or_else(|| panic!("no {name} cookie in {:?}", reply.set_cookies()))
        .split(';')
        .next()
        .unwrap()
        .to_owned()
}

/// A started ceremony: the flow id, the binding cookie and the options.
struct Ceremony {
    flow_id: String,
    binding: String,
    options: Value,
}

impl Ceremony {
    fn of(reply: &Reply, binding_cookie: &str) -> Self {
        assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
        Self {
            flow_id: reply.result()["flowId"].as_str().unwrap().to_owned(),
            binding: pair(reply, binding_cookie),
            options: reply.result()["options"].clone(),
        }
    }
}

async fn register_options(h: &Harness, session: &str) -> Reply {
    h.post(
        "/passkey/register/options",
        &json!({}),
        &[("cookie", session)],
    )
    .await
}

async fn start_registration(h: &Harness, session: &str) -> Ceremony {
    Ceremony::of(&register_options(h, session).await, REGISTER_BINDING)
}

async fn register_verify(
    h: &Harness,
    session: &str,
    ceremony: &Ceremony,
    credential: &Value,
    name: Option<&str>,
) -> Reply {
    let mut body = json!({ "flowId": ceremony.flow_id, "credential": credential });
    if let Some(name) = name {
        body["name"] = json!(name);
    }
    h.post(
        "/passkey/register/verify",
        &body,
        &[("cookie", &format!("{session}; {}", ceremony.binding))],
    )
    .await
}

/// Registers one passkey; returns its credential id (base64url).
async fn register(h: &Harness, session: &str, browser: &mut SoftBrowser) -> String {
    let ceremony = start_registration(h, session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    let reply = register_verify(h, session, &ceremony, &credential, None).await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    credential["id"].as_str().unwrap().to_owned()
}

async fn start_sign_in(h: &Harness) -> Ceremony {
    let reply = h
        .post("/passkey/authenticate/options", &json!({}), &[])
        .await;
    Ceremony::of(&reply, SIGN_IN_BINDING)
}

async fn sign_in_verify(h: &Harness, ceremony: &Ceremony, credential: &Value) -> Reply {
    h.post(
        "/passkey/authenticate/verify",
        &json!({ "flowId": ceremony.flow_id, "credential": credential }),
        &[("cookie", &ceremony.binding)],
    )
    .await
}

/// A full, successful sign-in.
async fn sign_in(h: &Harness, browser: &mut SoftBrowser, credential_id: &str) -> Reply {
    let ceremony = start_sign_in(h).await;
    let credential = browser.get(ORIGIN, &ceremony.options, credential_id);
    sign_in_verify(h, &ceremony, &credential).await
}

async fn count(h: &Harness, sql: &str) -> i64 {
    sqlx::query_scalar(sql).fetch_one(&h.db.pool).await.unwrap()
}

fn assert_failed_sign_in(reply: &Reply) {
    assert_eq!(reply.status, StatusCode::UNAUTHORIZED, "{}", reply.text());
    assert_eq!(reply.error_code(), "PASSKEY_AUTHENTICATION_FAILED");
    assert!(reply.session_cookie().is_none());
}

async fn user_with_passkey(h: &Harness, email: &str) -> (String, SoftBrowser, String) {
    let session = h.sign_up(email).await.session_cookie().unwrap();
    let mut browser = SoftBrowser::new();
    let credential_id = register(h, &session, &mut browser).await;
    (session, browser, credential_id)
}

#[tokio::test]
async fn register_then_sign_in() {
    let h = Harness::new().await;
    let up = h.sign_up("pk@example.com").await;
    let session = up.session_cookie().unwrap();
    let user_id = up.result()["user"]["id"].as_str().unwrap().to_owned();

    // Options: the shape `@simplewebauthn/browser` takes.
    let reply = register_options(&h, &session).await;
    let ceremony = Ceremony::of(&reply, REGISTER_BINDING);
    let options = &ceremony.options;
    assert_eq!(ceremony.flow_id.len(), 32);
    assert_eq!(
        options["rp"],
        json!({ "id": "quesar.cloud", "name": "Quesar" })
    );
    assert_eq!(options["timeout"], 300_000);
    assert_eq!(options["attestation"], "none");
    assert_eq!(
        options["authenticatorSelection"]["residentKey"],
        "preferred"
    );
    assert_eq!(
        options["authenticatorSelection"]["userVerification"],
        "required"
    );
    assert_eq!(options["user"]["name"], "pk@example.com");
    assert_eq!(options["user"]["displayName"], "Synthetic Signup");
    assert_eq!(unb64(options["user"]["id"].as_str().unwrap()).len(), 16);
    assert!(
        options
            .get("excludeCredentials")
            .is_none_or(|e| e.as_array().unwrap().is_empty())
    );
    assert_eq!(unb64(options["challenge"].as_str().unwrap()).len(), 32);
    // The state never leaves the server.
    assert!(!reply.text().contains("\"state\""));
    // The binding cookie: __Host- rules, HttpOnly, 300 s.
    let cookie = reply.set_cookies().remove(0);
    assert!(cookie.starts_with(REGISTER_BINDING));
    for part in [
        "Path=/",
        "Max-Age=300",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
    ] {
        assert!(cookie.contains(part), "{cookie}");
    }
    assert!(!cookie.contains("Domain"));

    let mut browser = SoftBrowser::new();
    let credential = browser.create(ORIGIN, &ceremony.options);
    let verified = register_verify(&h, &session, &ceremony, &credential, None).await;
    assert_eq!(verified.status, StatusCode::OK, "{}", verified.text());
    let passkey = verified.result()["passkey"].clone();
    assert_eq!(passkey["name"], Value::Null);
    assert_eq!(passkey["deviceType"], "singleDevice");
    assert_eq!(passkey["backedUp"], false);
    assert_eq!(passkey["createdAt"], "2026-11-10T12:00:00.000Z");
    assert!(
        verified
            .set_cookies()
            .iter()
            .any(|c| c.starts_with(&format!("{REGISTER_BINDING}=;")) && c.contains("Max-Age=0"))
    );

    // Listing shows it, with nothing of the credential.
    let listed = h.get("/passkeys", Some(&session)).await;
    assert_eq!(listed.status, StatusCode::OK);
    assert_eq!(listed.result()["passkeys"], json!([passkey]));

    // Sign in with it.
    h.clock.advance(secs(60));
    let credential_id = credential["id"].as_str().unwrap().to_owned();
    let ceremony = start_sign_in(&h).await;
    assert_eq!(ceremony.options["userVerification"], "required");
    assert_eq!(ceremony.options["rpId"], "quesar.cloud");
    assert_eq!(ceremony.options["timeout"], 300_000);
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    let signed = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_eq!(signed.status, StatusCode::OK, "{}", signed.text());
    assert_eq!(signed.result()["user"]["id"], user_id);
    assert_eq!(signed.result()["user"]["email"], "pk@example.com");
    let token = signed.token().expect("a session cookie");
    assert!(!signed.text().contains(&token));
    let cookie = signed
        .set_cookies()
        .into_iter()
        .find(|c| c.starts_with(COOKIE_NAME))
        .unwrap();
    assert!(
        cookie.contains("HttpOnly; Secure; SameSite=Lax"),
        "{cookie}"
    );
    let current = h
        .get("/session", Some(&signed.session_cookie().unwrap()))
        .await;
    assert_eq!(current.result()["user"]["id"], user_id);

    // The counter and last use were stored in the same step.
    let (counter, last_used): (i64, Option<time::OffsetDateTime>) = sqlx::query_as(
        "select (credential -> 'cred' ->> 'counter')::bigint, last_used_at from auth_passkeys",
    )
    .fetch_one(&h.db.pool)
    .await
    .unwrap();
    assert!(counter > 0);
    assert_eq!(last_used, Some(common::T0 + time::Duration::seconds(60)));
    // A passkey never creates an account row, so it cannot feed the admin rule.
    assert_eq!(
        count(
            &h,
            "select count(*) from \"account\" where \"providerId\" <> 'credential'"
        )
        .await,
        0
    );
    h.finish().await;
}

#[tokio::test]
async fn names_default_to_null_are_trimmed_and_capped_at_80_characters() {
    let h = Harness::new().await;
    let session = h
        .sign_up("names@example.com")
        .await
        .session_cookie()
        .unwrap();
    let mut browser = SoftBrowser::new();
    let long = format!("  {}  ", "é".repeat(100));
    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    let reply = register_verify(&h, &session, &ceremony, &credential, Some(&long)).await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(reply.result()["passkey"]["name"], "é".repeat(80));

    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    let reply = register_verify(&h, &session, &ceremony, &credential, Some("   ")).await;
    assert_eq!(reply.result()["passkey"]["name"], Value::Null);

    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    let reply = register_verify(&h, &session, &ceremony, &credential, Some("Work laptop")).await;
    assert_eq!(reply.result()["passkey"]["name"], "Work laptop");
    h.finish().await;
}

#[tokio::test]
async fn a_second_registration_excludes_the_first_and_keeps_the_user_handle() {
    let h = Harness::new().await;
    let session = h.sign_up("two@example.com").await.session_cookie().unwrap();
    let first = start_registration(&h, &session).await;
    let mut browser = SoftBrowser::new();
    let credential = browser.create(ORIGIN, &first.options);
    let reply = register_verify(&h, &session, &first, &credential, None).await;
    assert_eq!(reply.status, StatusCode::OK);

    let second = start_registration(&h, &session).await;
    let excluded = second.options["excludeCredentials"].as_array().unwrap();
    assert_eq!(excluded.len(), 1);
    assert_eq!(excluded[0]["id"], credential["id"]);
    assert_eq!(excluded[0]["type"], "public-key");
    assert_eq!(second.options["user"]["id"], first.options["user"]["id"]);
    let other = browser.create(ORIGIN, &second.options);
    let reply = register_verify(&h, &session, &second, &other, None).await;
    assert_eq!(reply.status, StatusCode::OK);

    assert_eq!(
        count(&h, "select count(distinct user_handle) from auth_passkeys").await,
        1
    );
    let third = start_registration(&h, &session).await;
    assert_eq!(
        third.options["excludeCredentials"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    h.finish().await;
}

#[tokio::test]
async fn a_replayed_assertion_is_refused_and_so_is_a_stale_counter() {
    let h = Harness::new().await;
    let (_, mut browser, credential_id) = user_with_passkey(&h, "replay@example.com").await;

    let ceremony = start_sign_in(&h).await;
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    let first = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_eq!(first.status, StatusCode::OK);
    let sessions = h.session_count().await;

    // The very same request again: the flow is gone.
    let replay = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_eq!(replay.status, StatusCode::BAD_REQUEST);
    assert_eq!(replay.error_code(), "CHALLENGE_NOT_FOUND");
    assert!(replay.session_cookie().is_none());
    assert_eq!(h.session_count().await, sessions);

    // The same assertion presented against a fresh flow: wrong challenge.
    let fresh = start_sign_in(&h).await;
    let again = sign_in_verify(&h, &fresh, &assertion).await;
    assert_failed_sign_in(&again);

    // A genuine assertion whose counter is not above the stored one.
    sqlx::query(
        "update auth_passkeys set credential = jsonb_set(credential, '{cred,counter}', '1000')",
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    let before = h.session_count().await;
    let stale = sign_in(&h, &mut browser, &credential_id).await;
    assert_failed_sign_in(&stale);
    assert_eq!(h.session_count().await, before, "no session for a clone");
    let counter: i64 = sqlx::query_scalar(
        "select (credential -> 'cred' ->> 'counter')::bigint from auth_passkeys",
    )
    .fetch_one(&h.db.pool)
    .await
    .unwrap();
    assert_eq!(counter, 1000, "a refused sign-in does not change the key");
    h.finish().await;
}

#[tokio::test]
async fn an_expired_flow_is_refused_after_300_seconds() {
    let h = Harness::new().await;
    let (session, mut browser, credential_id) = user_with_passkey(&h, "late@example.com").await;

    // Sign-in: 299 s is fine, 301 s is not.
    let ceremony = start_sign_in(&h).await;
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    h.clock.advance(secs(299));
    assert_eq!(
        sign_in_verify(&h, &ceremony, &assertion).await.status,
        StatusCode::OK
    );
    let ceremony = start_sign_in(&h).await;
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    h.clock.advance(secs(301));
    let late = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_eq!(late.status, StatusCode::BAD_REQUEST);
    assert_eq!(late.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(
        count(
            &h,
            "select count(*) from auth_flows where kind = 'passkey_authenticate'"
        )
        .await,
        0,
        "the expired flow is deleted by the attempt"
    );

    // Registration likewise.
    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    h.clock.advance(secs(301));
    let late = register_verify(&h, &session, &ceremony, &credential, None).await;
    assert_eq!(late.status, StatusCode::BAD_REQUEST);
    assert_eq!(late.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);
    h.finish().await;
}

#[tokio::test]
async fn another_users_register_flow_is_refused_and_not_consumed() {
    let h = Harness::new().await;
    let alice = h
        .sign_up("alice@example.com")
        .await
        .session_cookie()
        .unwrap();
    let mallory = h
        .sign_up("mallory@example.com")
        .await
        .session_cookie()
        .unwrap();
    let ceremony = start_registration(&h, &alice).await;
    let mut browser = SoftBrowser::new();
    let credential = browser.create(ORIGIN, &ceremony.options);

    // Mallory holds Alice's flow id and even her binding cookie.
    let stolen = register_verify(&h, &mallory, &ceremony, &credential, None).await;
    assert_eq!(stolen.status, StatusCode::BAD_REQUEST);
    assert_eq!(stolen.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 0);

    // Alice's flow was not consumed by that attempt.
    let honest = register_verify(&h, &alice, &ceremony, &credential, None).await;
    assert_eq!(honest.status, StatusCode::OK, "{}", honest.text());
    let owner: String = sqlx::query_scalar("select user_id from auth_passkeys")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    let alice_id = h.get("/session", Some(&alice)).await.result()["user"]["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert_eq!(owner, alice_id);
    h.finish().await;
}

#[tokio::test]
async fn a_flow_needs_the_binding_cookie_of_the_browser_that_began_it() {
    let h = Harness::new().await;
    let (session, mut browser, credential_id) = user_with_passkey(&h, "bind@example.com").await;

    // Sign-in without the cookie, and with another browser's.
    let ceremony = start_sign_in(&h).await;
    let other = start_sign_in(&h).await;
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    let without = h
        .post(
            "/passkey/authenticate/verify",
            &json!({ "flowId": ceremony.flow_id, "credential": assertion }),
            &[],
        )
        .await;
    assert_eq!(without.error_code(), "CHALLENGE_NOT_FOUND");
    let foreign = h
        .post(
            "/passkey/authenticate/verify",
            &json!({ "flowId": ceremony.flow_id, "credential": assertion }),
            &[("cookie", &other.binding)],
        )
        .await;
    assert_eq!(foreign.status, StatusCode::BAD_REQUEST);
    assert_eq!(foreign.error_code(), "CHALLENGE_NOT_FOUND");
    assert!(foreign.session_cookie().is_none());
    // The matching cookie is no use once the flow was taken by the attempt.
    let late = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_eq!(late.error_code(), "CHALLENGE_NOT_FOUND");

    // A registration is finished only with its own binding, not another
    // registration's.
    let registering = start_registration(&h, &session).await;
    let decoy = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &registering.options);
    let reply = h
        .post(
            "/passkey/register/verify",
            &json!({ "flowId": registering.flow_id, "credential": credential }),
            &[("cookie", &format!("{session}; {}", decoy.binding))],
        )
        .await;
    assert_eq!(reply.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);

    // A sign-in binding is not a registration binding.
    let registering = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &registering.options);
    let reply = h
        .post(
            "/passkey/register/verify",
            &json!({ "flowId": registering.flow_id, "credential": credential }),
            &[("cookie", &format!("{session}; {}", other.binding))],
        )
        .await;
    assert_eq!(reply.error_code(), "CHALLENGE_NOT_FOUND");
    // A sign-in flow id is not a registration flow.
    let reply = h
        .post(
            "/passkey/register/verify",
            &json!({ "flowId": other.flow_id, "credential": credential }),
            &[("cookie", &format!("{session}; {}", registering.binding))],
        )
        .await;
    assert_eq!(reply.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(
        count(
            &h,
            "select count(*) from auth_flows where kind = 'passkey_authenticate'"
        )
        .await,
        1,
        "the sign-in flow was not consumed by the registration endpoint"
    );
    h.finish().await;
}

#[tokio::test]
async fn registration_needs_a_fresh_session() {
    let h = Harness::new().await;
    let session = h
        .sign_up("stale@example.com")
        .await
        .session_cookie()
        .unwrap();
    let ceremony = start_registration(&h, &session).await;
    let mut browser = SoftBrowser::new();
    let credential = browser.create(ORIGIN, &ceremony.options);
    h.clock.advance(hours(25));

    let options = register_options(&h, &session).await;
    assert_eq!(options.status, StatusCode::FORBIDDEN, "{}", options.text());
    assert_eq!(options.error_code(), "SESSION_NOT_FRESH");
    let verify = register_verify(&h, &session, &ceremony, &credential, None).await;
    assert_eq!(verify.status, StatusCode::FORBIDDEN);
    assert_eq!(verify.error_code(), "SESSION_NOT_FRESH");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 0);

    // Deleting and listing do not need a fresh session (as in the TypeScript).
    assert_eq!(
        h.get("/passkeys", Some(&session)).await.status,
        StatusCode::OK
    );
    h.finish().await;
}

#[tokio::test]
async fn a_wrong_origin_in_the_client_data_is_refused() {
    let h = Harness::new().await;
    let session = h
        .sign_up("origin@example.com")
        .await
        .session_cookie()
        .unwrap();
    let mut browser = SoftBrowser::new();

    // Registration from a look-alike origin.
    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create("https://evil.quesar.cloud", &ceremony.options);
    let reply = register_verify(&h, &session, &ceremony, &credential, None).await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(reply.error_code(), "PASSKEY_REGISTRATION_FAILED");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 0);

    // Sign-in from one.
    let credential_id = register(&h, &session, &mut browser).await;
    let ceremony = start_sign_in(&h).await;
    let assertion = browser.get(
        "https://evil.quesar.cloud",
        &ceremony.options,
        &credential_id,
    );
    let reply = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_failed_sign_in(&reply);
    h.finish().await;
}

#[tokio::test]
async fn every_sign_in_failure_looks_the_same() {
    let h = Harness::new().await;
    let (session, mut browser, credential_id) = user_with_passkey(&h, "uniform@example.com").await;

    // 1. A bad signature.
    let ceremony = start_sign_in(&h).await;
    let mut assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    let mut signature = unb64(assertion["response"]["signature"].as_str().unwrap());
    let last = signature.len() - 1;
    signature[last] ^= 0x01;
    assertion["response"]["signature"] = json!(b64(&signature));
    let bad_signature = sign_in_verify(&h, &ceremony, &assertion).await;

    // 2. A user handle that is not the key's.
    let ceremony = start_sign_in(&h).await;
    let mut assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    assertion["response"]["userHandle"] = json!(b64(&[7u8; 16]));
    let wrong_handle = sign_in_verify(&h, &ceremony, &assertion).await;

    // 3. No user handle at all.
    let ceremony = start_sign_in(&h).await;
    let mut assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    assertion["response"]["userHandle"] = Value::Null;
    let no_handle = sign_in_verify(&h, &ceremony, &assertion).await;

    // 4. A credential id the server has never seen.
    let ceremony = start_sign_in(&h).await;
    let mut assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    assertion["rawId"] = json!(b64(&[9u8; 32]));
    assertion["id"] = json!(b64(&[9u8; 32]));
    let unknown = sign_in_verify(&h, &ceremony, &assertion).await;

    // 5. A body that is not a credential.
    let ceremony = start_sign_in(&h).await;
    let garbage = sign_in_verify(&h, &ceremony, &json!({ "id": 3 })).await;

    let replies = [bad_signature, wrong_handle, no_handle, unknown, garbage];
    for reply in &replies {
        assert_failed_sign_in(reply);
        assert_eq!(reply.body, replies[0].body, "bodies differ");
        assert_eq!(reply.headers.len(), replies[0].headers.len());
    }
    assert_eq!(
        replies[0].json()["error"]["message"],
        "Authentication failed"
    );
    // Nothing was written by any of them.
    assert_eq!(h.session_count().await, 1);
    let used: Option<time::OffsetDateTime> =
        sqlx::query_scalar("select last_used_at from auth_passkeys")
            .fetch_one(&h.db.pool)
            .await
            .unwrap();
    assert_eq!(used, None);
    let _ = session;
    h.finish().await;
}

#[tokio::test]
async fn an_assertion_for_a_deleted_passkey_is_refused() {
    let h = Harness::new().await;
    let (session, mut browser, credential_id) = user_with_passkey(&h, "gone@example.com").await;
    let id: String = sqlx::query_scalar("select id from auth_passkeys")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();

    let ceremony = start_sign_in(&h).await;
    let assertion = browser.get(ORIGIN, &ceremony.options, &credential_id);
    let deleted = h
        .post(
            "/passkey/delete",
            &json!({ "id": id }),
            &[("cookie", &session)],
        )
        .await;
    assert_eq!(deleted.status, StatusCode::OK, "{}", deleted.text());
    assert_eq!(deleted.result(), json!({}));
    let reply = sign_in_verify(&h, &ceremony, &assertion).await;
    assert_failed_sign_in(&reply);
    assert_eq!(
        h.get("/passkeys", Some(&session)).await.result()["passkeys"],
        json!([])
    );
    h.finish().await;
}

#[tokio::test]
async fn deleting_another_users_passkey_is_a_404_and_the_row_survives() {
    let h = Harness::new().await;
    let (_, _, _) = user_with_passkey(&h, "owner@example.com").await;
    let intruder = h
        .sign_up("intruder@example.com")
        .await
        .session_cookie()
        .unwrap();
    let id: String = sqlx::query_scalar("select id from auth_passkeys")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();

    let reply = h
        .post(
            "/passkey/delete",
            &json!({ "id": id }),
            &[("cookie", &intruder)],
        )
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND, "{}", reply.text());
    assert_eq!(reply.error_code(), "NOT_FOUND");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);
    // A made-up id and an empty body give the same answer.
    let reply = h
        .post(
            "/passkey/delete",
            &json!({ "id": "nope" }),
            &[("cookie", &intruder)],
        )
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    let reply = h
        .post("/passkey/delete", &json!({}), &[("cookie", &intruder)])
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    // The intruder sees none of it.
    assert_eq!(
        h.get("/passkeys", Some(&intruder)).await.result()["passkeys"],
        json!([])
    );
    h.finish().await;
}

#[tokio::test]
async fn a_revoked_session_cannot_use_the_passkey_routes() {
    let h = Harness::new().await;
    let (session, _, _) = user_with_passkey(&h, "revoked@example.com").await;
    let id: String = sqlx::query_scalar("select id from auth_passkeys")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    sqlx::query("delete from auth_sessions")
        .execute(&h.db.pool)
        .await
        .unwrap();

    let reply = h
        .post(
            "/passkey/delete",
            &json!({ "id": id }),
            &[("cookie", &session)],
        )
        .await;
    assert_eq!(reply.status, StatusCode::UNAUTHORIZED, "{}", reply.text());
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);
    assert_eq!(
        h.get("/passkeys", Some(&session)).await.status,
        StatusCode::UNAUTHORIZED
    );
    let options = register_options(&h, &session).await;
    assert_eq!(options.status, StatusCode::UNAUTHORIZED);
    let verify = h
        .post(
            "/passkey/register/verify",
            &json!({ "flowId": "x", "credential": {} }),
            &[("cookie", &session)],
        )
        .await;
    assert_eq!(verify.status, StatusCode::UNAUTHORIZED);
    h.finish().await;
}

#[tokio::test]
async fn cross_site_posts_are_refused_before_any_work() {
    let h = Harness::new().await;
    let (session, _, _) = user_with_passkey(&h, "csrf@example.com").await;
    let flows = count(&h, "select count(*) from auth_flows").await;
    for path in [
        "/passkey/register/options",
        "/passkey/register/verify",
        "/passkey/authenticate/options",
        "/passkey/authenticate/verify",
        "/passkey/delete",
    ] {
        for headers in [
            vec![
                ("cookie", session.as_str()),
                ("origin", "https://evil.example"),
            ],
            vec![
                ("cookie", session.as_str()),
                ("sec-fetch-site", "cross-site"),
            ],
        ] {
            let reply = h.post(path, &json!({}), &headers).await;
            assert_eq!(reply.status, StatusCode::FORBIDDEN, "{path}");
        }
    }
    assert_eq!(count(&h, "select count(*) from auth_flows").await, flows);
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);
    h.finish().await;
}

#[tokio::test]
async fn sign_in_routes_are_rate_limited_before_any_work() {
    let h = Harness::new().await;
    let ip = ("x-real-ip", "203.0.113.77");
    for _ in 0..3 {
        let reply = h
            .post("/passkey/authenticate/options", &json!({}), &[ip])
            .await;
        assert_eq!(reply.status, StatusCode::OK);
    }
    let blocked = h
        .post("/passkey/authenticate/options", &json!({}), &[ip])
        .await;
    assert_eq!(blocked.status, StatusCode::TOO_MANY_REQUESTS);
    assert!(blocked.headers.contains_key("retry-after"));
    assert_eq!(
        count(&h, "select count(*) from auth_flows").await,
        3,
        "the blocked request stored nothing"
    );
    // The verify route shares the bucket and is refused too, whatever it holds.
    let blocked = h
        .post(
            "/passkey/authenticate/verify",
            &json!({ "flowId": "x", "credential": {} }),
            &[ip],
        )
        .await;
    assert_eq!(blocked.status, StatusCode::TOO_MANY_REQUESTS);

    // The signed-in routes use the general bucket, per user.
    let session = h
        .sign_up("limit@example.com")
        .await
        .session_cookie()
        .unwrap();
    for _ in 0..100 {
        assert_eq!(
            h.get("/passkeys", Some(&session)).await.status,
            StatusCode::OK
        );
    }
    assert_eq!(
        h.get("/passkeys", Some(&session)).await.status,
        StatusCode::TOO_MANY_REQUESTS
    );
    h.finish().await;
}

#[tokio::test]
async fn a_replayed_registration_cannot_attach_a_credential_twice() {
    let h = Harness::new().await;
    let session = h.sign_up("dup@example.com").await.session_cookie().unwrap();
    let mut browser = SoftBrowser::new();
    let ceremony = start_registration(&h, &session).await;
    let credential = browser.create(ORIGIN, &ceremony.options);
    assert_eq!(
        register_verify(&h, &session, &ceremony, &credential, None)
            .await
            .status,
        StatusCode::OK
    );
    let again = register_verify(&h, &session, &ceremony, &credential, None).await;
    assert_eq!(again.status, StatusCode::BAD_REQUEST);
    assert_eq!(again.error_code(), "CHALLENGE_NOT_FOUND");
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 1);
    h.finish().await;
}

#[tokio::test]
async fn deleting_the_account_removes_its_passkeys_and_flows() {
    let h = Harness::new().await;
    let (session, _, _) = user_with_passkey(&h, "cascade@example.com").await;
    let _open = start_registration(&h, &session).await;
    sqlx::query("delete from \"user\"")
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(count(&h, "select count(*) from auth_passkeys").await, 0);
    assert_eq!(
        count(
            &h,
            "select count(*) from auth_flows where kind = 'passkey_register'"
        )
        .await,
        0
    );
    h.finish().await;
}

#[tokio::test]
async fn passkeys_are_off_when_the_origin_cannot_host_them() {
    let h = Harness::with(&[("PUBLIC_ORIGIN", "https://203.0.113.5")]).await;
    let methods = h.get("/methods", None).await;
    assert_eq!(methods.result()["passkey"], false);
    let reply = h
        .post(
            "/passkey/authenticate/options",
            &json!({}),
            &[("origin", "https://203.0.113.5")],
        )
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    assert_eq!(reply.error_code(), "PASSKEYS_NOT_AVAILABLE");
    h.finish().await;
}

#[tokio::test]
async fn with_sign_in_switched_off_the_passkey_routes_answer_503() {
    let h = Harness::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    for path in [
        "/passkey/authenticate/options",
        "/passkey/authenticate/verify",
        "/passkey/register/options",
        "/passkey/register/verify",
        "/passkey/delete",
    ] {
        let reply = h.post(path, &json!({}), &[]).await;
        assert_eq!(reply.status, StatusCode::SERVICE_UNAVAILABLE, "{path}");
    }
    assert_eq!(count(&h, "select count(*) from auth_flows").await, 0);
    h.finish().await;
}
