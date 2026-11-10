//! Sign in with X over HTTP, against the in-process mock identity provider.

mod common;
mod oauth_support;

use axum::http::StatusCode;
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use common::Reply;
use oauth_support::{BINDING_COOKIE, CODE, EMAIL, OAuth, TWITTER_ID, TWITTER_SECRET, location};
use quesar_auth::oauth::pkce::challenge_for;
use serde_json::{Value, json};
use sqlx::Row;

const X_ID: &str = "2244994945";

fn profile() -> Value {
    json!({ "data": {
        "id": X_ID, "name": "Ada on X", "username": "adax",
        "profile_image_url": "https://pbs.example.com/ada.png",
    } })
}

fn confirmed(email: &str) -> Value {
    json!({ "data": { "id": X_ID, "confirmed_email": email } })
}

fn placeholder() -> String {
    format!("{X_ID}@twitter.placeholder.invalid")
}

/// The mock answers the profile call, and the email call as given.
fn serve(h: &OAuth, email: Option<(u16, Value)>) {
    h.idp.respond_with_token_body(
        200,
        json!({ "access_token": "mock-x-access-token", "token_type": "bearer" }).to_string(),
    );
    h.idp.set_userinfo_for("profile_image_url", 200, &profile());
    if let Some((status, body)) = email {
        h.idp.set_userinfo_for("confirmed_email", status, &body);
    }
}

async fn finish(h: &OAuth, started: &oauth_support::Started) -> Reply {
    h.callback_on(
        "twitter",
        &format!("code={CODE}&state={}", started.state),
        Some(&started.binding),
    )
    .await
}

async fn sign_in(h: &OAuth, email: Option<(u16, Value)>) -> (oauth_support::Started, Reply) {
    let started = h.start_on("twitter", &json!({})).await;
    serve(h, email);
    let reply = finish(h, &started).await;
    (started, reply)
}

fn assert_error(reply: &Reply, code: &str) {
    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());
    assert_eq!(location(reply), format!("/login?error={code}"));
    assert!(reply.session_cookie().is_none(), "no session on an error");
}

async fn user_rows(h: &OAuth) -> Vec<(String, String, bool, Option<String>)> {
    sqlx::query(r#"select name, email, "emailVerified", image from "user" order by "createdAt""#)
        .fetch_all(&h.db.pool)
        .await
        .unwrap()
        .iter()
        .map(|row| {
            (
                row.get("name"),
                row.get("email"),
                row.get("emailVerified"),
                row.get("image"),
            )
        })
        .collect()
}

#[tokio::test]
async fn start_builds_the_x_authorize_url_with_pkce_and_no_nonce() {
    let h = OAuth::with_twitter().await;
    let started = h.start_on("twitter", &json!({})).await;
    let url = &started.url;
    assert_eq!(url.host_str(), Some("x.com"));
    assert_eq!(url.path(), "/i/oauth2/authorize");
    let param = |name: &str| started.param(name);
    assert_eq!(param("response_type").as_deref(), Some("code"));
    assert_eq!(param("client_id").as_deref(), Some(TWITTER_ID));
    assert_eq!(
        param("redirect_uri").as_deref(),
        Some("https://quesar.cloud/api/auth/callback/twitter")
    );
    assert_eq!(
        param("scope").as_deref(),
        Some("users.read tweet.read offline.access users.email")
    );
    assert_eq!(param("code_challenge_method").as_deref(), Some("S256"));
    assert_eq!(param("state").as_deref(), Some(started.state.as_str()));
    assert!(param("nonce").is_none(), "X has no OIDC nonce");
    assert!(param("prompt").is_none());
    assert!(!started.binding.is_empty());

    // The stored flow holds no nonce.
    let payload: Value = sqlx::query_scalar("select payload from auth_flows")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert!(payload.get("nonce").is_none_or(Value::is_null), "{payload}");
    h.cleanup().await;
}

#[tokio::test]
async fn a_confirmed_email_signs_in_a_new_user_with_basic_auth_and_no_verification_row() {
    let h = OAuth::with_twitter().await;
    let started = h
        .start_on("twitter", &json!({ "callbackURL": "/console/projects" }))
        .await;
    serve(&h, Some((200, confirmed("Ada@Example.com"))));
    let reply = finish(&h, &started).await;

    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());
    assert_eq!(location(&reply), "/console/projects");
    let session = reply.session_cookie().expect("a session");
    let me = h.get_session(&session).await;
    assert_eq!(me.result()["user"]["email"], "ada@example.com");

    // The token request: HTTP Basic, PKCE, no secret or id in the body.
    let tokens = h.idp.requests_to("/token");
    assert_eq!(tokens.len(), 1);
    let token = &tokens[0];
    let expected = format!(
        "Basic {}",
        STANDARD.encode(format!("{TWITTER_ID}:{TWITTER_SECRET}"))
    );
    assert_eq!(token.authorization.as_deref(), Some(expected.as_str()));
    assert_eq!(token.field("grant_type"), Some("authorization_code"));
    assert_eq!(token.field("code"), Some(CODE));
    assert_eq!(
        token.field("redirect_uri"),
        Some("https://quesar.cloud/api/auth/callback/twitter")
    );
    assert_eq!(
        challenge_for(token.field("code_verifier").unwrap()),
        started.param("code_challenge").unwrap()
    );
    assert!(token.field("client_secret").is_none());
    assert!(token.field("client_id").is_none());

    // Two userinfo calls, each with the bearer token and its own field set.
    let infos = h.idp.requests_to("/userinfo");
    let fields: Vec<_> = infos.iter().map(|r| r.query.as_str()).collect();
    assert_eq!(
        fields,
        [
            "user.fields=profile_image_url",
            "user.fields=confirmed_email"
        ]
    );
    for info in &infos {
        assert_eq!(info.method, "GET");
        assert_eq!(
            info.authorization.as_deref(),
            Some("Bearer mock-x-access-token")
        );
    }
    assert_eq!(h.idp.requests_to("/jwks").len(), 0);

    // Stored: an unverified user (see `link.rs`), a twitter account, no verification row.
    assert_eq!(
        user_rows(&h).await,
        [(
            "Ada on X".to_owned(),
            "ada@example.com".to_owned(),
            false, // X never makes a local user verified
            Some("https://pbs.example.com/ada.png".to_owned())
        )]
    );
    let account = sqlx::query(r#"select "providerId", "accountId" from "account""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(account.get::<String, _>("providerId"), "twitter");
    assert_eq!(account.get::<String, _>("accountId"), X_ID);
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    assert_eq!(h.count("auth_sessions").await, 1);
    h.cleanup().await;
}

#[tokio::test]
async fn without_a_confirmed_email_the_placeholder_is_used_and_unverified() {
    let h = OAuth::with_twitter().await;
    // The email call succeeds but carries no confirmed_email.
    let (_, reply) = sign_in(&h, Some((200, json!({ "data": { "id": X_ID } })))).await;
    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());
    assert_eq!(location(&reply), "/console");
    assert!(reply.session_cookie().is_some());
    let users = user_rows(&h).await;
    assert_eq!(users.len(), 1);
    assert_eq!(users[0].1, placeholder());
    assert!(!users[0].2, "a placeholder is never verified");
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn an_empty_confirmed_email_counts_as_absent() {
    let h = OAuth::with_twitter().await;
    let (_, reply) = sign_in(&h, Some((200, confirmed("")))).await;
    assert_eq!(location(&reply), "/console");
    let users = user_rows(&h).await;
    assert_eq!(users[0].1, placeholder());
    assert!(!users[0].2);
    h.cleanup().await;
}

#[tokio::test]
async fn a_failing_email_call_still_signs_in_with_the_placeholder() {
    for failure in [
        (500, json!({ "title": "Internal Server Error" })),
        (403, json!({ "title": "Forbidden" })),
        (200, json!("not an envelope")),
    ] {
        let h = OAuth::with_twitter().await;
        let (_, reply) = sign_in(&h, Some(failure.clone())).await;
        assert_eq!(location(&reply), "/console", "{failure:?}");
        assert!(reply.session_cookie().is_some());
        let users = user_rows(&h).await;
        assert_eq!(users.len(), 1);
        assert_eq!(users[0].1, placeholder());
        assert!(!users[0].2);
        assert_eq!(h.idp.requests_to("/userinfo").len(), 2, "both were tried");
        h.cleanup().await;
    }
}

#[tokio::test]
async fn a_failing_profile_call_signs_nobody_in() {
    for (status, body) in [
        (500, json!({})),
        (200, json!({ "data": {} })),
        (200, json!({ "data": { "id": "not an id!" } })),
        (200, json!({ "data": { "id": 42 } })),
        (200, json!([])),
    ] {
        let h = OAuth::with_twitter().await;
        let started = h.start_on("twitter", &json!({})).await;
        serve(&h, Some((200, confirmed(EMAIL))));
        h.idp.set_userinfo_for("profile_image_url", status, &body);
        let reply = finish(&h, &started).await;
        assert_error(&reply, "failed");
        assert_eq!(h.count(r#""user""#).await, 0, "{status} {body}");
        assert_eq!(h.count(r#""account""#).await, 0);
        h.cleanup().await;
    }
}

#[tokio::test]
async fn a_token_response_without_an_access_token_or_an_error_signs_nobody_in() {
    let h = OAuth::with_twitter().await;
    let started = h.start_on("twitter", &json!({})).await;
    h.idp
        .respond_with_token_body(200, json!({ "token_type": "bearer" }).to_string());
    assert_error(&finish(&h, &started).await, "failed");
    assert!(h.idp.requests_to("/userinfo").is_empty());

    let started = h.start_on("twitter", &json!({})).await;
    h.idp
        .respond_with_token_body(400, json!({ "error": "invalid_grant" }).to_string());
    assert_error(&finish(&h, &started).await, "failed");
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn a_returning_x_user_signs_in_as_the_same_user() {
    let h = OAuth::with_twitter().await;
    let (_, first) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    let first_session = first.session_cookie().unwrap();
    // Next time X reports no email at all: the account still decides.
    let (_, second) = sign_in(&h, None).await;
    let second_session = second.session_cookie().expect("signed in again");
    assert_ne!(first_session, second_session);
    assert_eq!(h.count(r#""user""#).await, 1);
    assert_eq!(h.count(r#""account""#).await, 1);
    assert_eq!(h.count("auth_sessions").await, 2);
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    let a = h.get_session(&first_session).await.result()["user"]["id"].clone();
    let b = h.get_session(&second_session).await.result()["user"]["id"].clone();
    assert_eq!(a, b);
    h.cleanup().await;
}

#[tokio::test]
async fn a_confirmed_email_never_links_to_a_verified_google_user() {
    let h = OAuth::with_twitter().await;
    // A Google-created, verified user with the same address.
    let claims = {
        let started = h.start(&json!({})).await;
        h.issue(&started.nonce);
        let reply = h.finish(&started).await;
        assert_eq!(location(&reply), "/console");
        reply
    };
    assert!(claims.session_cookie().is_some());
    let (before_users, before_accounts) =
        (h.count(r#""user""#).await, h.count(r#""account""#).await);
    let verifications = h.count("oauth_email_verifications").await;
    let sessions = h.count("auth_sessions").await;
    assert_eq!((before_users, before_accounts, verifications), (1, 1, 1));

    let (_, reply) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_error(&reply, "account_not_linked");
    assert_eq!(h.count(r#""user""#).await, 1);
    assert_eq!(h.count(r#""account""#).await, 1, "no twitter account added");
    assert_eq!(h.count("oauth_email_verifications").await, verifications);
    assert_eq!(h.count("auth_sessions").await, sessions);
    h.cleanup().await;
}

#[tokio::test]
async fn a_password_user_with_the_same_address_is_not_linked_either() {
    let h = OAuth::with_twitter().await;
    let signed_up = h
        .post(
            "/sign-up",
            &json!({ "name": "Ada Local", "email": EMAIL, "password": common::PASSWORD }),
            &[],
        )
        .await;
    assert_eq!(signed_up.status, StatusCode::OK, "{}", signed_up.text());
    let (_, reply) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_error(&reply, "account_not_linked");
    assert_eq!(
        h.count(r#""account""#).await,
        1,
        "only the credential account"
    );
    h.cleanup().await;
}

#[tokio::test]
async fn a_replayed_state_finds_nothing() {
    let h = OAuth::with_twitter().await;
    let (started, first) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_eq!(location(&first), "/console");
    let replay = finish(&h, &started).await;
    assert_error(&replay, "state_not_found");
    assert_eq!(h.idp.requests_to("/token").len(), 1, "no second exchange");
    assert_eq!(h.count("auth_sessions").await, 1);
    h.cleanup().await;
}

#[tokio::test]
async fn the_binding_cookie_is_required_and_must_be_this_browsers() {
    let h = OAuth::with_twitter().await;
    let query = |s: &oauth_support::Started| format!("code={CODE}&state={}", s.state);

    let started = h.start_on("twitter", &json!({})).await;
    serve(&h, Some((200, confirmed(EMAIL))));
    assert_error(
        &h.callback_on("twitter", &query(&started), None).await,
        "state_mismatch",
    );

    // Another browser's binding for this state.
    let started = h.start_on("twitter", &json!({})).await;
    let other = h.start_on("twitter", &json!({})).await;
    assert_error(
        &h.callback_on("twitter", &query(&started), Some(&other.binding))
            .await,
        "state_mismatch",
    );
    let wrong = format!("{BINDING_COOKIE}=not-the-binding");
    let started = h.start_on("twitter", &json!({})).await;
    assert_error(
        &h.callback_on("twitter", &query(&started), Some(&wrong))
            .await,
        "state_mismatch",
    );
    assert!(h.idp.requests().is_empty(), "the provider was never called");
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn a_state_belongs_to_the_provider_that_started_it() {
    let h = OAuth::with_twitter().await;
    let started = h.start_on("twitter", &json!({})).await;
    serve(&h, Some((200, confirmed(EMAIL))));
    let reply = h
        .callback_on(
            "google",
            &format!("code={CODE}&state={}", started.state),
            Some(&started.binding),
        )
        .await;
    assert_error(&reply, "state_mismatch");
    assert!(h.idp.requests().is_empty());

    // And a Google state does not complete at the X callback.
    let google = h.start(&json!({})).await;
    h.issue(&google.nonce);
    let reply = h
        .callback_on(
            "twitter",
            &format!("code={CODE}&state={}", google.state),
            Some(&google.binding),
        )
        .await;
    assert_error(&reply, "state_mismatch");
    assert!(h.idp.requests().is_empty());
    h.cleanup().await;
}

#[tokio::test]
async fn an_expired_flow_is_refused() {
    let h = OAuth::with_twitter().await;
    let started = h.start_on("twitter", &json!({})).await;
    serve(&h, Some((200, confirmed(EMAIL))));
    h.clock.advance(std::time::Duration::from_secs(601));
    assert_error(&finish(&h, &started).await, "expired");
    assert!(h.idp.requests().is_empty());
    assert_eq!(h.count("auth_flows").await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn the_provider_error_is_a_code_and_never_its_text() {
    let h = OAuth::with_twitter().await;
    for (error, code) in [
        ("access_denied", "access_denied"),
        ("server_error", "failed"),
    ] {
        let started = h.start_on("twitter", &json!({})).await;
        let reply = h
            .callback_on(
                "twitter",
                &format!(
                    "error={error}&error_description=secret+words&state={}",
                    started.state
                ),
                Some(&started.binding),
            )
            .await;
        assert_error(&reply, code);
        assert!(!location(&reply).contains("secret"));
    }
    assert!(h.idp.requests().is_empty());
    h.cleanup().await;
}

#[tokio::test]
async fn production_refuses_plain_http_x_endpoints() {
    let h = OAuth::twitter_production().await;
    let started = h.start_on("twitter", &json!({})).await;
    serve(&h, Some((200, confirmed(EMAIL))));
    assert_error(&finish(&h, &started).await, "failed");
    assert!(h.idp.requests().is_empty(), "no secret was sent over http");
    h.cleanup().await;
}

#[tokio::test]
async fn google_and_apple_still_require_their_nonce_and_x_works_without_one() {
    // A Google flow whose stored nonce is gone is not exchanged.
    let h = OAuth::with_twitter().await;
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    sqlx::query("update auth_flows set payload = payload - 'nonce'")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = h.finish(&started).await;
    assert_error(&reply, "failed");
    assert!(h.idp.requests().is_empty(), "nothing was sent to Google");
    assert_eq!(h.count(r#""user""#).await, 0);

    // The same surgery changes nothing for X, which never had one.
    let started = h.start_on("twitter", &json!({})).await;
    serve(&h, Some((200, confirmed(EMAIL))));
    sqlx::query("update auth_flows set payload = payload - 'nonce'")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = finish(&h, &started).await;
    assert_eq!(location(&reply), "/console");
    h.cleanup().await;
}

async fn assert_unverified_x_user_blocks_linking(h: &OAuth) {
    let users = user_rows(h).await;
    assert_eq!(users.len(), 1);
    assert!(!users[0].2, "the X-created user is not verified");
}

#[tokio::test]
async fn an_x_created_user_is_unverified_and_google_cannot_link_into_it() {
    let h = OAuth::with_twitter().await;
    let (_, reply) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_eq!(location(&reply), "/console");
    assert_unverified_x_user_blocks_linking(&h).await;

    // The owner of the address signs in with Google afterwards.
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    assert_error(&reply, "account_not_linked");
    assert_eq!(h.count(r#""user""#).await, 1);
    let providers: Vec<String> = sqlx::query_scalar(r#"select "providerId" from "account""#)
        .fetch_all(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(providers, ["twitter"], "no Google account on that user");
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn the_x_created_user_is_never_admin_even_on_the_allowlist() {
    use quesar_auth::admin::admin_decision_for;
    use quesar_auth::config::AdminEmails;
    let h = OAuth::with_twitter().await;
    let (_, reply) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_eq!(location(&reply), "/console");
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    assert_error(&h.finish(&started).await, "account_not_linked");

    let allow = AdminEmails::parse(EMAIL);
    let ids: Vec<String> = sqlx::query_scalar(r#"select id from "user""#)
        .fetch_all(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(ids.len(), 1);
    for id in ids {
        let decision = admin_decision_for(&h.db.pool, &id, &allow).await.unwrap();
        assert!(!decision.is_admin(), "{decision:?}");
    }
    h.cleanup().await;
}

#[tokio::test]
async fn a_returning_x_user_whose_confirmed_email_appears_later_stays_unverified() {
    let h = OAuth::with_twitter().await;
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('x-user', 'Ada', $1, false)"#,
    )
    .bind(EMAIL)
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('x-account', $1, 'twitter', 'x-user', now())"#,
    )
    .bind(X_ID)
    .execute(&h.db.pool)
    .await
    .unwrap();
    let (_, reply) = sign_in(&h, Some((200, confirmed(EMAIL)))).await;
    assert_eq!(location(&reply), "/console");
    assert!(reply.session_cookie().is_some());
    assert_unverified_x_user_blocks_linking(&h).await;
    h.cleanup().await;
}

#[tokio::test]
async fn a_password_sign_up_cannot_squat_an_x_placeholder_address() {
    let h = OAuth::with_twitter().await;
    let squat = h
        .post(
            "/sign-up",
            &json!({
                "name": "Squatter",
                "email": "123@twitter.placeholder.invalid",
                "password": "synthetic-password-2026",
            }),
            &[],
        )
        .await;
    assert_eq!(squat.status, StatusCode::BAD_REQUEST, "{}", squat.text());
    assert_eq!(squat.error_code(), "INVALID_EMAIL");
    assert_eq!(h.count(r#""user""#).await, 0);

    // X user 123, with no confirmed email, still signs in.
    let started = h.start_on("twitter", &json!({})).await;
    h.idp.respond_with_token_body(
        200,
        json!({ "access_token": "mock-x-access-token" }).to_string(),
    );
    h.idp.set_userinfo_for(
        "profile_image_url",
        200,
        &json!({ "data": { "id": "123", "name": "Real X User" } }),
    );
    h.idp
        .set_userinfo_for("confirmed_email", 200, &json!({ "data": { "id": "123" } }));
    let reply = finish(&h, &started).await;
    assert_eq!(location(&reply), "/console", "{}", reply.text());
    assert_eq!(user_rows(&h).await[0].1, "123@twitter.placeholder.invalid");
    h.cleanup().await;
}

#[tokio::test]
async fn an_invalid_confirmed_email_and_a_non_https_image_are_not_stored() {
    let h = OAuth::with_twitter().await;
    let started = h.start_on("twitter", &json!({})).await;
    h.idp.respond_with_token_body(
        200,
        json!({ "access_token": "mock-x-access-token" }).to_string(),
    );
    h.idp.set_userinfo_for(
        "profile_image_url",
        200,
        &json!({ "data": {
            "id": X_ID, "name": "N", "profile_image_url": "javascript:alert(1)",
        } }),
    );
    h.idp.set_userinfo_for(
        "confirmed_email",
        200,
        &json!({ "data": { "id": X_ID, "confirmed_email": "not an email" } }),
    );
    let reply = finish(&h, &started).await;
    assert_eq!(location(&reply), "/console", "{}", reply.text());
    let users = user_rows(&h).await;
    assert_eq!(users[0].1, placeholder());
    assert!(!users[0].2, "an unusable address is never verified");
    assert_eq!(users[0].3, None, "a non-https image is dropped");
    h.cleanup().await;
}
