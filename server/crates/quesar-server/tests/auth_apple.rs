//! Sign in with Apple over HTTP, against the in-process mock identity
//! provider: the cross-site form POST, the same-site GET that completes the
//! flow, and the client secret.

mod apple_support;
mod common;

use apple_support::{
    APPLE_ORIGIN, Apple, BINDING_COOKIE, CODE, EMAIL, FORM, SUB, Started, form, location,
    set_cookie_named,
};
use axum::http::StatusCode;
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use common::{ORIGIN, Reply};
use quesar_auth::mock_idp::Signing;
use serde_json::{Value, json};
use sqlx::Row;
use std::time::Duration;

const USER: &str =
    r#"{"name":{"firstName":"Ada","lastName":"Lovelace"},"email":"ada@example.com"}"#;

/// POST, then the GET with the binding: the whole browser trip.
async fn sign_in(h: &Apple, user: Option<&str>) -> (Started, Reply, Reply) {
    let started = h.start().await;
    h.issue(&started.nonce);
    let post = h.post_code(&started, user).await;
    let get = h.follow(&post, &started).await;
    (started, post, get)
}

fn assert_error(reply: &Reply, path: &str, code: &str) {
    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());
    assert_eq!(location(reply), format!("{path}error={code}"));
    assert!(reply.session_cookie().is_none(), "no session on an error");
}

async fn user_names(h: &Apple) -> Vec<String> {
    sqlx::query_scalar(r#"select name from "user""#)
        .fetch_all(&h.db.pool)
        .await
        .unwrap()
}

#[tokio::test]
async fn the_cross_site_post_is_accepted_on_the_apple_callback_and_nowhere_else() {
    let h = Apple::new().await;
    let started = h.start().await;
    // Apple's POST: cross-site, Apple's origin, no cookies.
    let post = h.post_code(&started, None).await;
    assert_eq!(post.status, StatusCode::SEE_OTHER, "{}", post.text());

    // The same headers anywhere else are a cross-site request.
    for path in ["/sign-in", "/sign-up", "/oauth/apple/start", "/profile"] {
        let request = axum::http::Request::builder()
            .method("POST")
            .uri(format!("/api/auth{path}"))
            .header("content-type", "application/json")
            .header("origin", APPLE_ORIGIN)
            .header("sec-fetch-site", "cross-site")
            .header("x-real-ip", h.fresh_ip())
            .body(axum::body::Body::from(
                json!({"email": EMAIL, "password": "x"}).to_string(),
            ))
            .unwrap();
        let reply = h.send(request).await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN, "{path}");
        assert_eq!(reply.json()["error"]["name"], "CrossSiteRequestError");
    }

    // Not another origin, not same-site, and not another provider's callback.
    let body = form(&[("code", CODE), ("state", &started.state)]);
    for headers in [
        &[("origin", "https://evil.example")][..],
        &[("origin", "https://appleid.apple.com.evil.example")][..],
        &[("sec-fetch-site", "same-site")][..],
        &[("sec-fetch-site", "none")][..],
        &[("origin", "null")][..],
    ] {
        let reply = h.post_callback_with(body.clone(), headers).await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN, "{headers:?}");
    }
    let google = axum::http::Request::builder()
        .method("POST")
        .uri("/api/auth/callback/google")
        .header("content-type", FORM)
        .header("origin", APPLE_ORIGIN)
        .header("sec-fetch-site", "cross-site")
        .header("x-real-ip", h.fresh_ip())
        .body(axum::body::Body::from(body.clone()))
        .unwrap();
    assert_eq!(h.send(google).await.status, StatusCode::FORBIDDEN);
    // A same-origin POST to another provider's callback has nothing to do there.
    let same_origin = axum::http::Request::builder()
        .method("POST")
        .uri("/api/auth/callback/google")
        .header("content-type", FORM)
        .header("origin", ORIGIN)
        .header("x-real-ip", h.fresh_ip())
        .body(axum::body::Body::from(body))
        .unwrap();
    let reply = h.send(same_origin).await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    h.cleanup().await;
}

#[tokio::test]
async fn post_then_get_with_the_binding_completes_the_sign_in() {
    let h = Apple::new().await;
    let started = h
        .start_with(&json!({ "callbackURL": "/console/projects" }))
        .await;

    // The authorize URL.
    let param = |name: &str| {
        started
            .url
            .query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
            .unwrap_or_default()
    };
    assert_eq!(started.url.host_str(), Some("appleid.apple.com"));
    assert_eq!(started.url.path(), "/auth/authorize");
    assert_eq!(param("response_mode"), "form_post");
    assert_eq!(param("scope"), "email name");
    assert_eq!(param("response_type"), "code id_token");
    assert_eq!(param("client_id"), h.key.client_id);
    assert_eq!(
        param("redirect_uri"),
        "https://quesar.cloud/api/auth/callback/apple"
    );
    assert_eq!(param("nonce"), started.nonce);
    assert_eq!(param("code_challenge_method"), "S256");

    h.issue(&started.nonce);
    let post = h.post_code(&started, None).await;
    // The POST only hands the browser on: a same-site GET with the state, no
    // cookies, no session, nothing exchanged, the flow still there.
    assert_eq!(post.status, StatusCode::SEE_OTHER);
    assert_eq!(
        location(&post),
        format!("/api/auth/callback/apple?state={}", started.state)
    );
    assert!(post.set_cookies().is_empty());
    assert!(post.session_cookie().is_none());
    assert_eq!(h.idp.requests_to("/token").len(), 0);
    assert_eq!(h.count("auth_flows").await, 1);
    assert_eq!(h.count("auth_sessions").await, 0);
    assert_eq!(h.count(r#""user""#).await, 0);
    assert!(
        !location(&post).contains(CODE),
        "the code is not in the URL"
    );

    let get = h.follow(&post, &started).await;
    assert_eq!(get.status, StatusCode::SEE_OTHER, "{}", get.text());
    assert_eq!(location(&get), "/console/projects");
    assert!(get.session_cookie().is_some());
    assert_eq!(
        set_cookie_named(&get, BINDING_COOKIE),
        [format!(
            "{BINDING_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
        )]
    );
    assert_eq!(h.count("auth_flows").await, 0, "the flow was consumed");
    assert_eq!(h.count("auth_sessions").await, 1);

    let account = sqlx::query(r#"select "providerId", "accountId", "userId" from "account""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(account.get::<String, _>("providerId"), "apple");
    assert_eq!(account.get::<String, _>("accountId"), SUB);
    let user = sqlx::query(r#"select email, "emailVerified" from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(user.get::<String, _>("email"), EMAIL);
    assert!(user.get::<bool, _>("emailVerified"));

    // The token request: the posted code, the verifier behind the challenge,
    // the redirect URI and a minted client secret (not the key).
    let sent = h.idp.requests_to("/token").remove(0);
    assert_eq!(sent.field("code"), Some(CODE));
    assert_eq!(sent.field("grant_type"), Some("authorization_code"));
    assert_eq!(
        sent.field("redirect_uri"),
        Some("https://quesar.cloud/api/auth/callback/apple")
    );
    assert_eq!(
        quesar_auth::oauth::pkce::challenge_for(sent.field("code_verifier").unwrap()),
        param("code_challenge")
    );
    let secret = sent.field("client_secret").unwrap();
    assert_eq!(secret.split('.').count(), 3);
    assert!(!secret.contains("PRIVATE KEY"));

    // The session works.
    let current = h
        .get_with_cookie("/session", &get.session_cookie().unwrap())
        .await;
    assert_eq!(current.result()["user"]["email"], EMAIL);
    h.cleanup().await;
}

impl Apple {
    async fn get_with_cookie(&self, path: &str, cookie: &str) -> Reply {
        let request = axum::http::Request::builder()
            .method("GET")
            .uri(format!("/api/auth{path}"))
            .header("x-real-ip", self.fresh_ip())
            .header("cookie", cookie)
            .body(axum::body::Body::empty())
            .unwrap();
        self.send(request).await
    }
}

#[tokio::test]
async fn a_replayed_post_is_refused_and_does_not_replace_the_first() {
    let h = Apple::new().await;
    let started = h
        .start_with(&json!({ "errorCallbackURL": "/login?next=%2Fconsole" }))
        .await;
    h.issue(&started.nonce);
    let first = h.post_code(&started, None).await;
    assert_eq!(first.status, StatusCode::SEE_OTHER);

    // A second POST for the same state, even with another code.
    let second = h
        .post_callback(form(&[
            ("code", "attacker-code"),
            ("state", &started.state),
        ]))
        .await;
    assert_error(&second, "/login?next=%2Fconsole&", "state_mismatch");
    assert_eq!(h.count("auth_flows").await, 1, "the flow is still there");

    // The browser's GET completes with the FIRST code.
    let get = h.follow(&first, &started).await;
    assert!(get.session_cookie().is_some(), "{}", get.text());
    assert_eq!(h.idp.requests_to("/token")[0].field("code"), Some(CODE));
    h.cleanup().await;
}

#[tokio::test]
async fn a_get_without_a_prior_post_has_no_code() {
    let h = Apple::new().await;
    let started = h.start().await;
    h.issue(&started.nonce);
    // Even a code on the GET's own query is not an answer for Apple.
    let reply = h
        .get_callback(
            &format!("code={CODE}&state={}", started.state),
            Some(&started.binding),
        )
        .await;
    assert_error(&reply, "/login?", "no_code");
    assert_eq!(h.idp.requests_to("/token").len(), 0);
    assert_eq!(h.count("auth_flows").await, 0, "the flow is spent");
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn the_get_needs_the_binding_of_the_browser_that_started_the_flow() {
    let h = Apple::new().await;
    let started = h.start().await;
    h.issue(&started.nonce);
    let post = h.post_code(&started, None).await;
    let query = location(&post);
    let query = query.split_once('?').unwrap().1;

    // A browser without the cookie (the attacker planted state and code).
    let reply = h.get_callback(query, None).await;
    assert_error(&reply, "/login?", "state_mismatch");
    assert_eq!(
        h.idp.requests_to("/token").len(),
        0,
        "nothing was exchanged"
    );
    assert_eq!(h.count(r#""user""#).await, 0);

    // The flow is spent, so the real browser cannot reuse it either.
    let reply = h.get_callback(query, Some(&started.binding)).await;
    assert_error(&reply, "/login?", "state_not_found");
    h.cleanup().await;
}

#[tokio::test]
async fn the_state_is_validated_before_it_reaches_the_database_or_a_location() {
    let h = Apple::new().await;
    let too_long = "a".repeat(300);
    for state in [
        "",
        "attacker-chosen-state-value",
        "../../x",
        "a b",
        "x%0d%0aSet-Cookie:%20a=b",
        "http://evil.example",
        too_long.as_str(),
    ] {
        let reply = h
            .post_callback(form(&[("code", CODE), ("state", state)]))
            .await;
        assert_error(&reply, "/login?", "state_not_found");
    }
    // No state field at all.
    let reply = h.post_callback(form(&[("code", CODE)])).await;
    assert_error(&reply, "/login?", "state_not_found");
    assert_eq!(h.count("auth_flows").await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn an_expired_flow_goes_to_its_error_path() {
    let h = Apple::new().await;
    let started = h
        .start_with(&json!({ "errorCallbackURL": "/login?next=%2Fconsole" }))
        .await;
    h.clock.advance(Duration::from_secs(601));
    let post = h.post_code(&started, None).await;
    assert_error(&post, "/login?next=%2Fconsole&", "expired");
    assert_eq!(h.idp.requests_to("/token").len(), 0);
    h.cleanup().await;
}

#[tokio::test]
async fn a_string_false_for_email_verified_is_refused() {
    let h = Apple::new().await;
    for value in [json!("false"), json!(false), json!("yes"), json!(null)] {
        let started = h.start().await;
        let mut claims = h.claims(&started.nonce);
        claims["email_verified"] = value.clone();
        h.idp.respond_with_id_token(&claims, Signing::Primary);
        let post = h.post_code(&started, None).await;
        let get = h.follow(&post, &started).await;
        assert_error(&get, "/login?", "provider_email_unverified");
        assert_eq!(h.count(r#""user""#).await, 0, "{value}");
    }
    // And the string "true" and the boolean are both fine.
    for value in [json!("true"), json!(true)] {
        let started = h.start().await;
        let mut claims = h.claims(&started.nonce);
        claims["email_verified"] = value.clone();
        h.idp.respond_with_id_token(&claims, Signing::Primary);
        let post = h.post_code(&started, None).await;
        let get = h.follow(&post, &started).await;
        assert!(get.session_cookie().is_some(), "{value}: {}", get.text());
    }
    h.cleanup().await;
}

#[tokio::test]
async fn the_first_sign_in_name_comes_from_the_user_field() {
    let h = Apple::new().await;
    let (_, _, get) = sign_in(&h, Some(USER)).await;
    assert!(get.session_cookie().is_some());
    assert_eq!(user_names(&h).await, ["Ada Lovelace"]);
    h.cleanup().await;
}

#[tokio::test]
async fn without_a_usable_user_field_the_token_name_or_the_email_is_used() {
    let h = Apple::new().await;
    // No `user` (every sign-in after the first): the email's local part.
    let (_, _, get) = sign_in(&h, None).await;
    assert!(get.session_cookie().is_some());
    assert_eq!(user_names(&h).await, ["ada"]);
    h.cleanup().await;

    for (label, user) in [
        ("not JSON", "not json".to_owned()),
        ("no name", r#"{"email":"a@b.c"}"#.to_owned()),
        (
            "oversized",
            format!(r#"{{"name":{{"firstName":"{}"}}}}"#, "x".repeat(5000)),
        ),
    ] {
        let h = Apple::new().await;
        let (_, _, get) = sign_in(&h, Some(&user)).await;
        assert!(get.session_cookie().is_some(), "{label}: {}", get.text());
        assert_eq!(user_names(&h).await, ["ada"], "{label}");
        h.cleanup().await;
    }

    // The token's own name is used when there is no posted one.
    let h = Apple::new().await;
    let started = h.start().await;
    let mut claims = h.claims(&started.nonce);
    claims["name"] = json!("Token Name");
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let post = h.post_code(&started, None).await;
    h.follow(&post, &started).await;
    assert_eq!(user_names(&h).await, ["Token Name"]);
    h.cleanup().await;
}

/// The auth envelope, not `body_limit`'s `{"error": "..."}`, and never cached.
fn assert_too_large(reply: &Reply) {
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(reply.error_code(), "PAYLOAD_TOO_LARGE");
    assert_eq!(
        reply.json()["error"]["message"],
        "Request body is too large"
    );
    assert_eq!(reply.headers["cache-control"], "no-store");
}

#[tokio::test]
async fn a_body_over_16_kib_is_413_and_stores_nothing() {
    let h = Apple::new().await;
    let started = h.start().await;
    let big = form(&[
        ("code", CODE),
        ("state", &started.state),
        ("user", &"x".repeat(17 * 1024)),
    ]);
    assert!(big.len() > 16 * 1024);
    let reply = h.post_callback(big.clone()).await;
    assert_too_large(&reply);
    // By Content-Length too, before the body is read.
    let declared = h
        .post_callback_with(
            "code=1".to_owned(),
            &[("content-length", &(17 * 1024).to_string())],
        )
        .await;
    assert_too_large(&declared);
    // Nothing was parked on the flow: a GET still has no code.
    let get = h
        .get_callback(&format!("state={}", started.state), Some(&started.binding))
        .await;
    assert_error(&get, "/login?", "no_code");

    // Just under the cap goes through.
    let started = h.start().await;
    let fits = form(&[
        ("code", CODE),
        ("state", &started.state),
        ("id_token", &"i".repeat(12 * 1024)),
    ]);
    assert!(fits.len() < 16 * 1024);
    let post = h.post_callback(fits).await;
    assert_eq!(post.status, StatusCode::SEE_OTHER);
    assert!(location(&post).starts_with("/api/auth/callback/apple?state="));
    h.cleanup().await;
}

#[tokio::test]
async fn a_post_that_is_not_a_form_goes_to_the_error_path() {
    let h = Apple::new().await;
    let started = h.start().await;
    let reply = h
        .post_callback_with(
            form(&[("code", CODE), ("state", &started.state)]),
            &[("content-type", "application/json")],
        )
        .await;
    assert_error(&reply, "/login?", "failed");
    // The flow is untouched, so a proper POST still works.
    let reply = h.post_code(&started, None).await;
    assert!(location(&reply).starts_with("/api/auth/callback/apple?state="));
    // A charset parameter and odd case are still a form.
    let started = h.start().await;
    let reply = h
        .post_callback_with(
            form(&[("code", CODE), ("state", &started.state)]),
            &[(
                "content-type",
                "Application/X-WWW-Form-Urlencoded; charset=UTF-8",
            )],
        )
        .await;
    assert!(location(&reply).starts_with("/api/auth/callback/apple?state="));
    h.cleanup().await;
}

#[tokio::test]
async fn apples_error_becomes_a_fixed_code_never_its_text() {
    let h = Apple::new().await;
    for (error, expected) in [
        ("user_cancelled_authorize", "access_denied"),
        ("access_denied", "access_denied"),
        ("server_error", "failed"),
        ("<script>alert(1)</script>", "failed"),
    ] {
        let started = h.start().await;
        let post = h
            .post_callback(form(&[
                ("state", &started.state),
                ("error", error),
                ("error_description", "provider text that must not travel"),
            ]))
            .await;
        let get = h.follow(&post, &started).await;
        assert_error(&get, "/login?", expected);
        assert!(!location(&get).contains("script"));
    }
    assert_eq!(h.idp.requests_to("/token").len(), 0);
    // A code over the cap is a failure, not stored.
    let started = h.start().await;
    let post = h
        .post_callback(form(&[
            ("state", &started.state),
            ("code", &"c".repeat(3000)),
        ]))
        .await;
    let get = h.follow(&post, &started).await;
    assert_error(&get, "/login?", "failed");
    h.cleanup().await;
}

#[tokio::test]
async fn a_form_with_neither_code_nor_error_gives_no_code() {
    let h = Apple::new().await;
    let started = h.start().await;
    let post = h.post_callback(form(&[("state", &started.state)])).await;
    let get = h.follow(&post, &started).await;
    assert_error(&get, "/login?", "no_code");
    h.cleanup().await;
}

#[tokio::test]
async fn the_post_is_rate_limited_before_it_reads_or_stores_anything() {
    let h = Apple::new().await;
    let started = h.start().await;
    let ip = "203.0.113.9";
    for _ in 0..100 {
        let reply = h
            .post_callback_with(
                form(&[("code", CODE), ("state", "unknown")]),
                &[("x-real-ip", ip)],
            )
            .await;
        assert_error(&reply, "/login?", "state_not_found");
    }
    let limited = h
        .post_callback_with(
            form(&[("code", CODE), ("state", &started.state)]),
            &[("x-real-ip", ip)],
        )
        .await;
    assert_error(&limited, "/login?", "failed");
    // Nothing was stored for the real state.
    let get = h
        .get_callback(&format!("state={}", started.state), Some(&started.binding))
        .await;
    assert_error(&get, "/login?", "no_code");
    h.cleanup().await;
}

#[tokio::test]
async fn the_escaped_newline_form_of_the_key_works_end_to_end() {
    let key = apple_support::key();
    let escaped = key.pem.trim().replace('\n', "\\n");
    let h = Apple::with_key(&escaped).await;
    let methods = h.get_with_cookie("/methods", "a=b").await;
    assert_eq!(methods.result()["social"], json!(["apple"]));
    let (_, _, get) = sign_in(&h, Some(USER)).await;
    assert!(get.session_cookie().is_some(), "{}", get.text());
    h.cleanup().await;
}

#[tokio::test]
async fn a_garbage_key_turns_apple_off_everywhere() {
    for garbage in [
        "not a pem",
        "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
    ] {
        let h = Apple::with_key(garbage).await;
        let methods = h.get_with_cookie("/methods", "a=b").await;
        assert_eq!(methods.result()["social"], json!([]), "{garbage}");
        assert_eq!(methods.result()["email"], json!(true));

        let start = h.post_json("/oauth/apple/start", &json!({})).await;
        assert_eq!(start.status, StatusCode::NOT_FOUND);
        assert_eq!(start.error_code(), "PROVIDER_NOT_CONFIGURED");
        assert_eq!(h.count("auth_flows").await, 0);

        let post = h
            .post_callback(form(&[("code", CODE), ("state", "whatever")]))
            .await;
        // The cross-site exemption applies only while Apple is usable.
        assert_eq!(post.status, StatusCode::FORBIDDEN, "{garbage}");
        assert_eq!(post.json()["error"]["name"], "CrossSiteRequestError");
        h.cleanup().await;
    }
}

#[tokio::test]
async fn apple_is_listed_when_its_key_works_and_absent_when_unset() {
    let h = Apple::new().await;
    let methods = h.get_with_cookie("/methods", "a=b").await;
    assert_eq!(methods.result()["social"], json!(["apple"]));
    h.cleanup().await;

    let h = Apple::with(&[("APPLE_TEAM_ID", "")]).await;
    let methods = h.get_with_cookie("/methods", "a=b").await;
    assert_eq!(methods.result()["social"], json!([]));
    let post = h
        .post_callback(form(&[("code", CODE), ("state", "x")]))
        .await;
    assert_eq!(
        post.status,
        StatusCode::FORBIDDEN,
        "Apple is not configured"
    );
    h.cleanup().await;
}

#[tokio::test]
async fn the_client_secret_is_re_minted_when_thirty_days_old() {
    let h = Apple::new().await;
    let iat_of_last_request = |h: &Apple| -> i64 {
        let sent = h.idp.requests_to("/token").pop().unwrap();
        let secret = sent.field("client_secret").unwrap().to_owned();
        let payload: Value = serde_json::from_slice(
            &URL_SAFE_NO_PAD
                .decode(secret.split('.').nth(1).unwrap())
                .unwrap(),
        )
        .unwrap();
        payload["iat"].as_i64().unwrap()
    };
    let t0 = common::T0.unix_timestamp();

    sign_in(&h, None).await;
    assert_eq!(iat_of_last_request(&h), t0, "minted at startup");

    h.clock.advance(Duration::from_secs(29 * 86_400));
    let (_, _, get) = sign_in_as(&h, "second-sub").await;
    assert!(get.session_cookie().is_some(), "{}", get.text());
    assert_eq!(iat_of_last_request(&h), t0, "still the startup secret");

    h.clock.advance(Duration::from_secs(2 * 86_400));
    let (_, _, get) = sign_in_as(&h, "third-sub").await;
    assert!(get.session_cookie().is_some(), "{}", get.text());
    assert_eq!(
        iat_of_last_request(&h),
        t0 + 31 * 86_400,
        "re-minted after thirty days"
    );
    h.cleanup().await;
}

async fn sign_in_as(h: &Apple, sub: &str) -> (Started, Reply, Reply) {
    let started = h.start().await;
    let mut claims = h.claims(&started.nonce);
    claims["sub"] = json!(sub);
    claims["email"] = json!(format!("{sub}@example.com"));
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let post = h.post_code(&started, None).await;
    let get = h.follow(&post, &started).await;
    (started, post, get)
}

#[tokio::test]
async fn nonce_mismatch_and_a_forged_token_sign_nobody_in() {
    let h = Apple::new().await;
    // The hashed nonce is accepted, another nonce is not.
    let started = h.start().await;
    let hashed: String = quesar_auth::token_hash(&started.nonce)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    let mut claims = h.claims(&started.nonce);
    claims["nonce"] = json!(hashed);
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let post = h.post_code(&started, None).await;
    assert!(h.follow(&post, &started).await.session_cookie().is_some());

    let started = h.start().await;
    let mut claims = h.claims("not-the-nonce");
    claims["sub"] = json!("other-sub");
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let post = h.post_code(&started, None).await;
    assert_error(&h.follow(&post, &started).await, "/login?", "failed");

    let started = h.start().await;
    h.idp
        .respond_with_id_token(&h.claims(&started.nonce), Signing::ForgedAsPrimary);
    let post = h.post_code(&started, None).await;
    assert_error(&h.follow(&post, &started).await, "/login?", "failed");
    assert_eq!(h.count("auth_sessions").await, 1);
    h.cleanup().await;
}

#[tokio::test]
async fn with_sign_in_switched_off_the_apple_post_is_unavailable() {
    let h = Apple::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    let post = h
        .post_callback(form(&[("code", CODE), ("state", "x")]))
        .await;
    assert_eq!(post.status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(h.count("auth_flows").await, 0);
    h.cleanup().await;
}
