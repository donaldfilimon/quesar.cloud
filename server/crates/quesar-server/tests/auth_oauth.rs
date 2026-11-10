//! Google sign-in over HTTP, against the in-process mock identity provider.

mod common;
mod oauth_support;

use axum::http::StatusCode;
use common::{COOKIE_NAME, Reply};
use oauth_support::{
    BINDING_COOKIE, CLIENT_ID, CLIENT_SECRET, CODE, EMAIL, OAuth, SUB, location, set_cookie_named,
};
use quesar_auth::mock_idp::Signing;
use quesar_auth::oauth::pkce::challenge_for;
use serde_json::{Value, json};
use sqlx::Row;

/// Starts a flow and finishes it with a good token.
async fn sign_in(h: &OAuth, body: Value) -> (oauth_support::Started, Reply) {
    let started = h.start(&body).await;
    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    (started, reply)
}

fn assert_error(reply: &Reply, path: &str, code: &str) {
    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());
    assert_eq!(location(reply), format!("{path}error={code}"));
    assert!(reply.session_cookie().is_none(), "no session on an error");
}

#[tokio::test]
async fn a_good_sign_in_creates_the_user_account_verification_and_session() {
    let h = OAuth::new().await;
    let (_, reply) = sign_in(
        &h,
        json!({ "callbackURL": "/console/projects", "errorCallbackURL": "/login?next=%2Fconsole%2Fprojects" }),
    )
    .await;

    // The browser is sent to the return path with a session, and the binding is cleared.
    assert_eq!(reply.status, StatusCode::SEE_OTHER);
    assert_eq!(location(&reply), "/console/projects");
    assert_eq!(
        set_cookie_named(&reply, BINDING_COOKIE),
        [format!(
            "{BINDING_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
        )]
    );
    let session = reply.session_cookie().expect("session cookie");
    let session_cookie = reply
        .set_cookies()
        .into_iter()
        .find(|c| c.starts_with(COOKIE_NAME))
        .unwrap();
    assert!(session_cookie.contains("HttpOnly") && session_cookie.contains("Secure"));

    let user = sqlx::query(r#"select id, name, email, "emailVerified", image from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(user.get::<String, _>("email"), EMAIL);
    assert_eq!(user.get::<String, _>("name"), "Ada Lovelace");
    assert!(user.get::<bool, _>("emailVerified"));
    assert_eq!(
        user.get::<Option<String>, _>("image").as_deref(),
        Some("https://example.com/ada.png")
    );
    let user_id: String = user.get("id");
    let account = sqlx::query(r#"select id, "providerId", "accountId", "userId" from "account""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(account.get::<String, _>("providerId"), "google");
    assert_eq!(account.get::<String, _>("accountId"), SUB);
    assert_eq!(account.get::<String, _>("userId"), user_id);
    let verification = sqlx::query("select account_id, email from oauth_email_verifications")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(
        verification.get::<String, _>("account_id"),
        account.get::<String, _>("id")
    );
    assert_eq!(verification.get::<String, _>("email"), EMAIL);
    assert_eq!(h.count("auth_sessions").await, 1);
    assert_eq!(h.count("auth_flows").await, 0, "the flow was consumed");

    // The session works.
    let current = h.get_session(&session).await;
    assert_eq!(current.result()["user"]["email"], EMAIL);
    assert_eq!(current.result()["user"]["id"], user_id);
    h.cleanup().await;
}

#[tokio::test]
async fn the_authorize_url_and_the_token_request_agree_on_pkce_and_the_redirect_uri() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;

    let url = &started.url;
    assert_eq!(url.host_str(), Some("accounts.google.com"));
    assert_eq!(url.path(), "/o/oauth2/v2/auth");
    let param = |name: &str| started.param(name).unwrap_or_default();
    assert_eq!(param("response_type"), "code");
    assert_eq!(param("client_id"), CLIENT_ID);
    assert_eq!(
        param("redirect_uri"),
        "https://quesar.cloud/api/auth/callback/google"
    );
    assert_eq!(param("scope"), "email profile openid");
    assert_eq!(param("code_challenge_method"), "S256");
    assert_eq!(param("prompt"), "select_account");
    assert_eq!(param("include_granted_scopes"), "true");
    assert_eq!(param("state").len(), 43);
    assert_eq!(param("nonce").len(), 43);
    assert_ne!(param("state"), param("nonce"));

    // The binding cookie, exactly.
    let cookies = set_cookie_named(&started.reply, BINDING_COOKIE);
    assert_eq!(cookies.len(), 1);
    let value = cookies[0]
        .split(';')
        .next()
        .unwrap()
        .split_once('=')
        .unwrap()
        .1;
    assert_eq!(value.len(), 43);
    assert_eq!(
        cookies[0],
        format!("{BINDING_COOKIE}={value}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax")
    );
    assert_ne!(value, param("state"), "the binding is not the state");
    assert_eq!(
        started.reply.headers.get("cache-control").unwrap(),
        "no-store"
    );

    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    assert_eq!(reply.status, StatusCode::SEE_OTHER);

    let tokens = h.idp.requests_to("/token");
    assert_eq!(tokens.len(), 1);
    let token = &tokens[0];
    let verifier = token.field("code_verifier").expect("verifier sent");
    assert_eq!(verifier.len(), 128);
    assert_eq!(challenge_for(verifier), started.challenge);
    assert_eq!(token.field("code"), Some(CODE));
    assert_eq!(token.field("grant_type"), Some("authorization_code"));
    assert_eq!(
        token.field("redirect_uri"),
        Some("https://quesar.cloud/api/auth/callback/google")
    );
    assert_eq!(token.field("client_id"), Some(CLIENT_ID));
    assert_eq!(token.field("client_secret"), Some(CLIENT_SECRET));
    assert_eq!(h.idp.requests_to("/jwks").len(), 1);
    h.cleanup().await;
}

#[tokio::test]
async fn start_refuses_what_it_should() {
    let h = OAuth::new().await;
    // An unconfigured or unknown provider.
    for provider in ["apple", "twitter", "github", "GOOGLE"] {
        let reply = h
            .post(&format!("/oauth/{provider}/start"), &json!({}), &[])
            .await;
        assert_eq!(reply.status, StatusCode::NOT_FOUND, "{provider}");
        assert_eq!(reply.error_code(), "PROVIDER_NOT_CONFIGURED");
    }
    // A cross-site POST.
    let cross = h
        .post(
            "/oauth/google/start",
            &json!({}),
            &[("origin", "https://evil.example")],
        )
        .await;
    assert_eq!(cross.status, StatusCode::FORBIDDEN);
    assert_eq!(cross.error_code(), "CROSS_SITE_REQUEST");
    // Bad bodies.
    for body in [json!([1]), json!({ "callbackURL": 5 }), json!(null)] {
        let reply = h.post("/oauth/google/start", &body, &[]).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{body}");
    }
    assert_eq!(
        h.count("auth_flows").await,
        0,
        "nothing stored for refused starts"
    );
    // The auth bucket: 3 starts per 10 s per address, the 4th is limited
    // before any database work.
    for n in 0..4 {
        let reply = h
            .post(
                "/oauth/google/start",
                &json!({}),
                &[("x-real-ip", "203.0.113.77")],
            )
            .await;
        if n < 3 {
            assert_eq!(reply.status, StatusCode::OK);
        } else {
            assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS);
            assert!(reply.headers.contains_key("retry-after"));
        }
    }
    assert_eq!(h.count("auth_flows").await, 3);
    h.cleanup().await;
}

#[tokio::test]
async fn without_credentials_google_is_not_configured() {
    let h = OAuth::without_google().await;
    let reply = h.post("/oauth/google/start", &json!({}), &[]).await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    assert_eq!(reply.error_code(), "PROVIDER_NOT_CONFIGURED");
    h.cleanup().await;
}

#[tokio::test]
async fn unsafe_return_paths_fall_back() {
    let h = OAuth::new().await;
    for callback in [
        "//evil.example",
        "/\\evil.example",
        "https://evil.example/x",
        "/api/x",
        "%2f",
        "/%2fevil",
        "/login",
        "javascript:alert(1)",
    ] {
        let (_, reply) = sign_in(&h, json!({ "callbackURL": callback })).await;
        assert_eq!(reply.status, StatusCode::SEE_OTHER, "{callback}");
        assert_eq!(location(&reply), "/console", "{callback}");
    }
    // The error path: unsafe values give /login, the client's own is kept.
    for (error_callback, expected) in [
        ("//evil.example", "/login?error=access_denied"),
        ("https://evil.example", "/login?error=access_denied"),
        ("/api/x", "/login?error=access_denied"),
        (
            "/login?next=%2Fconsole",
            "/login?next=%2Fconsole&error=access_denied",
        ),
    ] {
        let started = h
            .start(&json!({ "errorCallbackURL": error_callback }))
            .await;
        let reply = h
            .callback(
                &format!("error=access_denied&state={}", started.state),
                Some(&started.binding),
            )
            .await;
        assert_eq!(location(&reply), expected, "{error_callback}");
    }
    h.cleanup().await;
}

#[tokio::test]
async fn a_replayed_state_finds_nothing() {
    let h = OAuth::new().await;
    let (started, first) = sign_in(&h, json!({})).await;
    assert_eq!(location(&first), "/console");
    let replay = h.finish(&started).await;
    assert_error(&replay, "/login?", "state_not_found");
    assert_eq!(h.count("auth_sessions").await, 1);
    assert_eq!(h.idp.requests_to("/token").len(), 1, "no second exchange");
    h.cleanup().await;
}

#[tokio::test]
async fn an_expired_flow_is_refused_and_consumed() {
    let h = OAuth::new().await;
    let started = h
        .start(&json!({ "errorCallbackURL": "/login?next=%2Fconsole" }))
        .await;
    h.issue(&started.nonce);
    h.clock.advance(std::time::Duration::from_secs(601));
    let reply = h.finish(&started).await;
    assert_error(&reply, "/login?next=%2Fconsole&", "expired");
    assert!(h.idp.requests().is_empty(), "the provider was never called");
    assert_eq!(h.count("auth_flows").await, 0);
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn the_binding_cookie_is_required_and_must_be_this_browsers() {
    let h = OAuth::new().await;
    let query = |s: &oauth_support::Started| format!("code={CODE}&state={}", s.state);

    // No cookie at all.
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    assert_error(
        &h.callback(&query(&started), None).await,
        "/login?",
        "state_mismatch",
    );
    // A malformed cookie.
    let started = h.start(&json!({})).await;
    let reply = h
        .callback(&query(&started), Some(&format!("{BINDING_COOKIE}=short")))
        .await;
    assert_error(&reply, "/login?", "state_mismatch");
    // Another browser's binding (login CSRF: the attacker's state, the victim's cookie).
    let attacker = h.start(&json!({})).await;
    let victim = h.start(&json!({})).await;
    let reply = h.callback(&query(&attacker), Some(&victim.binding)).await;
    assert_error(&reply, "/login?", "state_mismatch");
    // The state used as the cookie value.
    let started = h.start(&json!({})).await;
    let reply = h
        .callback(
            &query(&started),
            Some(&format!("{BINDING_COOKIE}={}", started.state)),
        )
        .await;
    assert_error(&reply, "/login?", "state_mismatch");

    assert!(h.idp.requests().is_empty(), "the provider was never called");
    assert_eq!(h.count(r#""user""#).await, 0);
    // The victim's own flow is untouched and still works.
    h.issue(&victim.nonce);
    let reply = h.finish(&victim).await;
    assert_eq!(location(&reply), "/console");
    h.cleanup().await;
}

#[tokio::test]
async fn state_and_provider_problems() {
    let h = OAuth::new().await;
    // No state, an empty state, an oversized state and an unknown state.
    for query in [
        format!("code={CODE}"),
        format!("code={CODE}&state="),
        format!("code={CODE}&state={}", "a".repeat(500)),
        format!("code={CODE}&state=never-issued"),
    ] {
        let reply = h.callback(&query, None).await;
        assert_error(&reply, "/login?", "state_not_found");
    }
    // The flow was started for Google but the callback is another provider's.
    let started = h.start(&json!({})).await;
    let reply = h
        .callback_on(
            "apple",
            &format!("code={CODE}&state={}", started.state),
            Some(&started.binding),
        )
        .await;
    assert_error(&reply, "/login?", "state_mismatch");
    // No code.
    let started = h.start(&json!({})).await;
    let reply = h
        .callback(&format!("state={}", started.state), Some(&started.binding))
        .await;
    assert_error(&reply, "/login?", "no_code");
    let started = h.start(&json!({})).await;
    let reply = h
        .callback(
            &format!("state={}&code=", started.state),
            Some(&started.binding),
        )
        .await;
    assert_error(&reply, "/login?", "no_code");
    assert!(h.idp.requests().is_empty());
    h.cleanup().await;
}

#[tokio::test]
async fn the_provider_error_is_forwarded_as_a_code_and_never_its_text() {
    let h = OAuth::new().await;
    for (provider_error, code) in [
        ("access_denied", "access_denied"),
        ("server_error", "failed"),
        ("<script>alert(1)</script>", "failed"),
        ("temporarily_unavailable", "failed"),
    ] {
        let started = h.start(&json!({})).await;
        let reply = h
            .callback(
                &format!(
                    "error={}&error_description=Secret+provider+text&state={}&code={CODE}",
                    url::form_urlencoded::byte_serialize(provider_error.as_bytes())
                        .collect::<String>(),
                    started.state
                ),
                Some(&started.binding),
            )
            .await;
        assert_error(&reply, "/login?", code);
        let target = location(&reply);
        assert!(
            !target.contains("Secret") && !target.contains("description"),
            "{target}"
        );
        assert!(
            !target.contains(CODE) && !target.contains(&started.state),
            "{target}"
        );
    }
    assert!(
        h.idp.requests().is_empty(),
        "no exchange after a provider error"
    );
    h.cleanup().await;
}

#[tokio::test]
async fn bad_id_tokens_sign_nobody_in() {
    let h = OAuth::new().await;
    let good = |nonce: &str| h.claims(nonce);
    type Mutate = Box<dyn Fn(&mut Value)>;
    let cases: Vec<(&str, Mutate, Signing)> = vec![
        (
            "nonce",
            Box::new(|c| c["nonce"] = json!("another-nonce")),
            Signing::Primary,
        ),
        (
            "no nonce",
            Box::new(|c| {
                c.as_object_mut().unwrap().remove("nonce");
            }),
            Signing::Primary,
        ),
        (
            "aud",
            Box::new(|c| c["aud"] = json!("someone-else")),
            Signing::Primary,
        ),
        (
            "iss",
            Box::new(|c| c["iss"] = json!("https://evil.example")),
            Signing::Primary,
        ),
        (
            "expired",
            Box::new(|c| c["exp"] = json!(c["iat"].as_i64().unwrap() - 120)),
            Signing::Primary,
        ),
        (
            "iat over an hour",
            Box::new(|c| {
                c["iat"] = json!(c["iat"].as_i64().unwrap() - 7200);
            }),
            Signing::Primary,
        ),
        ("unpublished key", Box::new(|_| {}), Signing::UnknownKey),
        (
            "forged signature",
            Box::new(|_| {}),
            Signing::ForgedAsPrimary,
        ),
        ("hs256", Box::new(|_| {}), Signing::Hs256),
        ("alg none", Box::new(|_| {}), Signing::NoneAlg),
    ];
    for (name, mutate, signing) in cases {
        let started = h.start(&json!({})).await;
        let mut claims = good(&started.nonce);
        mutate(&mut claims);
        h.idp.respond_with_id_token(&claims, signing);
        let reply = h.finish(&started).await;
        assert_error(&reply, "/login?", "failed");
        assert_eq!(h.count(r#""user""#).await, 0, "{name}");
        assert_eq!(h.count("auth_sessions").await, 0, "{name}");
        assert_eq!(h.count("auth_flows").await, 0, "{name}");
    }
    // Token endpoint failures.
    for (status, body) in [
        (400, "{\"error\":\"invalid_grant\"}"),
        (200, "{}"),
        (200, "nope"),
    ] {
        let started = h.start(&json!({})).await;
        h.idp.respond_with_token_body(status, body.to_owned());
        assert_error(&h.finish(&started).await, "/login?", "failed");
    }
    let started = h.start(&json!({})).await;
    h.idp.redirect_token_to(&h.idp.jwks_url());
    assert_error(&h.finish(&started).await, "/login?", "failed");
    // A good sign-in still works afterwards.
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    assert_eq!(location(&h.finish(&started).await), "/console");
    h.cleanup().await;
}

#[tokio::test]
async fn an_unverified_email_is_refused_and_forgets_the_old_verification() {
    let h = OAuth::new().await;
    let (_, ok) = sign_in(&h, json!({})).await;
    assert_eq!(location(&ok), "/console");
    assert_eq!(h.count("oauth_email_verifications").await, 1);

    let started = h.start(&json!({})).await;
    let mut claims = h.claims(&started.nonce);
    claims["email_verified"] = json!(false);
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let reply = h.finish(&started).await;
    assert_error(&reply, "/login?", "provider_email_unverified");
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    assert_eq!(h.count("auth_sessions").await, 1, "no new session");

    // A string "true" is not true.
    let started = h.start(&json!({})).await;
    let mut claims = h.claims(&started.nonce);
    claims["email_verified"] = json!("true");
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    assert_error(
        &h.finish(&started).await,
        "/login?",
        "provider_email_unverified",
    );
    h.cleanup().await;
}

#[tokio::test]
async fn a_token_with_no_email_is_refused() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;
    let mut claims = h.claims(&started.nonce);
    claims.as_object_mut().unwrap().remove("email");
    // The verified flag is true but there is no address to sign in as.
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    assert_error(&h.finish(&started).await, "/login?", "email_not_found");
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn an_email_and_password_user_is_not_linked_by_google() {
    let h = OAuth::new().await;
    let signed_up = h
        .post(
            "/sign-up",
            &json!({ "name": "Ada Local", "email": EMAIL, "password": common::PASSWORD }),
            &[],
        )
        .await;
    assert_eq!(signed_up.status, StatusCode::OK, "{}", signed_up.text());
    let sessions_before = h.count("auth_sessions").await;

    let (_, reply) = sign_in(&h, json!({})).await;
    assert_error(&reply, "/login?", "account_not_linked");
    assert_eq!(
        h.count(r#""account""#).await,
        1,
        "only the credential account"
    );
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    assert_eq!(h.count("auth_sessions").await, sessions_before);
    let name: String = sqlx::query_scalar(r#"select name from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(name, "Ada Local", "the local user is untouched");
    h.cleanup().await;
}

#[tokio::test]
async fn an_existing_google_user_signs_in_as_the_same_user() {
    let h = OAuth::new().await;
    let (_, first) = sign_in(&h, json!({})).await;
    let first_session = first.session_cookie().unwrap();
    let (_, second) = sign_in(&h, json!({})).await;
    let second_session = second.session_cookie().unwrap();
    assert_ne!(first_session, second_session, "a fresh session each time");
    assert_eq!(h.count(r#""user""#).await, 1);
    assert_eq!(h.count(r#""account""#).await, 1);
    assert_eq!(h.count("auth_sessions").await, 2);
    let a = h.get_session(&first_session).await.result()["user"]["id"].clone();
    let b = h.get_session(&second_session).await.result()["user"]["id"].clone();
    assert_eq!(a, b);
    h.cleanup().await;
}

#[tokio::test]
async fn a_user_verified_by_apple_is_linked_by_google() {
    let h = OAuth::new().await;
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('apple-user', 'Ada', $1, true)"#,
    )
    .bind(EMAIL)
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('apple-account', 'apple-sub', 'apple', 'apple-user', now())"#,
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        "insert into oauth_email_verifications (account_id, email) values ('apple-account', $1)",
    )
    .bind(EMAIL)
    .execute(&h.db.pool)
    .await
    .unwrap();

    let (_, reply) = sign_in(&h, json!({})).await;
    assert_eq!(location(&reply), "/console");
    let session = reply.session_cookie().unwrap();
    assert_eq!(
        h.get_session(&session).await.result()["user"]["id"],
        "apple-user"
    );
    assert_eq!(h.count(r#""user""#).await, 1);
    let providers: Vec<String> =
        sqlx::query_scalar(r#"select "providerId" from "account" order by "providerId""#)
            .fetch_all(&h.db.pool)
            .await
            .unwrap();
    assert_eq!(providers, ["apple", "google"]);
    h.cleanup().await;
}

#[tokio::test]
async fn error_redirects_never_carry_the_code_or_the_state() {
    let h = OAuth::new().await;
    let mut seen = Vec::new();
    // Failures of several kinds.
    let started = h.start(&json!({})).await;
    seen.push((started.state.clone(), h.finish(&started).await)); // token endpoint says 400
    let started = h.start(&json!({})).await;
    let mut claims = h.claims(&started.nonce);
    claims["email_verified"] = json!(false);
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    seen.push((started.state.clone(), h.finish(&started).await));
    let started = h.start(&json!({})).await;
    seen.push((
        started.state.clone(),
        h.callback(&format!("code={CODE}&state={}", started.state), None)
            .await,
    ));
    for (state, reply) in seen {
        assert_eq!(reply.status, StatusCode::SEE_OTHER);
        let target = location(&reply);
        assert!(target.starts_with("/login?error="), "{target}");
        assert!(
            !target.contains(CODE) && !target.contains(&state),
            "{target}"
        );
        assert!(reply.body.is_empty() || !reply.text().contains(CODE));
        assert!(!reply.text().contains(&state));
    }
    h.cleanup().await;
}

#[tokio::test]
async fn production_refuses_plain_http_provider_endpoints() {
    let h = OAuth::production().await;
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    assert_error(&reply, "/login?", "failed");
    assert!(h.idp.requests().is_empty(), "no secret was sent over http");
    assert_eq!(h.count(r#""user""#).await, 0);
    h.cleanup().await;
}

#[tokio::test]
async fn the_callback_refuses_a_scripted_cross_site_request() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;
    let request = axum::http::Request::builder()
        .uri(format!(
            "/api/auth/callback/google?code={CODE}&state={}",
            started.state
        ))
        .header("x-real-ip", h.fresh_ip())
        .header("sec-fetch-site", "cross-site")
        .header("sec-fetch-mode", "cors")
        .header("cookie", &started.binding)
        .body(axum::body::Body::empty())
        .unwrap();
    use tower::ServiceExt;
    let response = h.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    assert_eq!(h.count("auth_flows").await, 1, "the flow was not touched");
    h.cleanup().await;
}

#[tokio::test]
async fn the_callback_is_rate_limited_before_any_work() {
    let h = OAuth::new().await;
    let mut limited = 0;
    for _ in 0..101 {
        let request = axum::http::Request::builder()
            .uri("/api/auth/callback/google?state=nope")
            .header("x-real-ip", "203.0.113.200")
            .header("sec-fetch-site", "cross-site")
            .header("sec-fetch-mode", "navigate")
            .header("sec-fetch-dest", "document")
            .body(axum::body::Body::empty())
            .unwrap();
        use tower::ServiceExt;
        let response = h.app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::SEE_OTHER);
        let target = response
            .headers()
            .get("location")
            .unwrap()
            .to_str()
            .unwrap()
            .to_owned();
        if target == "/login?error=failed" {
            limited += 1;
        } else {
            assert_eq!(target, "/login?error=state_not_found");
        }
    }
    assert_eq!(limited, 1, "the 101st request in the window is limited");
    h.cleanup().await;
}

fn binding_cleared(reply: &Reply) -> bool {
    !set_cookie_named(reply, BINDING_COOKIE).is_empty()
}

#[tokio::test]
async fn only_a_consumed_flow_clears_the_binding_cookie() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;

    // Cross-site navigations that find no flow leave the victim's binding alone.
    for query in ["state=unknown", "code=x", ""] {
        let reply = h.callback(query, Some(&started.binding)).await;
        assert_eq!(location(&reply), "/login?error=state_not_found", "{query}");
        assert!(
            !binding_cleared(&reply),
            "{query}: {:?}",
            reply.set_cookies()
        );
        assert!(reply.set_cookies().is_empty(), "{query}");
    }
    // The flow is still there and completes, and then the cookie is cleared.
    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    assert_eq!(location(&reply), "/console");
    assert!(binding_cleared(&reply));

    // A flow that is consumed but refused (wrong provider) also clears it.
    let started = h.start(&json!({})).await;
    let reply = h
        .callback_on(
            "twitter",
            &format!("code={CODE}&state={}", started.state),
            Some(&started.binding),
        )
        .await;
    assert_eq!(location(&reply), "/login?error=state_mismatch");
    assert!(binding_cleared(&reply));
    h.cleanup().await;
}

#[tokio::test]
async fn google_sign_in_ends_the_presented_session_only_on_success() {
    let h = OAuth::new().await;
    let up = h
        .post(
            "/sign-up",
            &json!({ "name": "N", "email": "other@example.com", "password": "synthetic-password-2026" }),
            &[],
        )
        .await;
    let prior = up.session_cookie().unwrap();
    assert_eq!(h.count("auth_sessions").await, 1);

    // A refused attempt (provider error) keeps it.
    let started = h.start(&json!({})).await;
    let cookie = format!("{}; {prior}", started.binding);
    let reply = h
        .callback(
            &format!("error=access_denied&state={}", started.state),
            Some(&cookie),
        )
        .await;
    assert_error(&reply, "/login?", "access_denied");
    assert_eq!(h.get_session(&prior).await.status, StatusCode::OK);
    assert_ne!(h.get_session(&prior).await.result(), Value::Null);

    // A good one replaces it.
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    let cookie = format!("{}; {prior}", started.binding);
    let reply = h
        .callback(
            &format!("code={CODE}&state={}", started.state),
            Some(&cookie),
        )
        .await;
    assert_eq!(location(&reply), "/console", "{}", reply.text());
    assert_eq!(h.get_session(&prior).await.result(), Value::Null);
    assert_eq!(h.count("auth_sessions").await, 1);
    h.cleanup().await;
}
