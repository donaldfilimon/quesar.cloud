//! `GET /api/auth/methods`.

mod common;

use axum::body::Body;
use axum::http::header::CACHE_CONTROL;
use axum::http::{Method, Request, StatusCode};
use common::Harness;
use http_body_util::BodyExt;
use quesar_server::Config;
use quesar_server::config::Environment;
use serde_json::{Value, json};
use tower::ServiceExt;

const GOOGLE: [(&str, &str); 2] = [
    ("GOOGLE_SIGNIN_CLIENT_ID", "g-id"),
    ("GOOGLE_SIGNIN_CLIENT_SECRET", "g-secret"),
];
const APPLE: [(&str, &str); 4] = [
    ("APPLE_CLIENT_ID", "svc"),
    ("APPLE_TEAM_ID", "team"),
    ("APPLE_KEY_ID", "key"),
    ("APPLE_PRIVATE_KEY", "pem"),
];
const TWITTER: [(&str, &str); 2] = [
    ("TWITTER_CLIENT_ID", "t-id"),
    ("TWITTER_CLIENT_SECRET", "t-secret"),
];

async fn methods(extra: &[(&str, &str)]) -> Value {
    let h = Harness::with(extra).await;
    let reply = h.get("/methods", None).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.headers[CACHE_CONTROL], "no-store");
    let result = reply.result();
    h.finish().await;
    result
}

#[tokio::test]
async fn email_and_passkeys_are_on_and_providers_appear_only_when_configured() {
    assert_eq!(
        methods(&[]).await,
        json!({ "email": true, "passkey": true, "social": [] })
    );
    let all: Vec<_> = TWITTER
        .iter()
        .chain(&APPLE)
        .chain(&GOOGLE)
        .copied()
        .collect();
    assert_eq!(
        methods(&all).await["social"],
        json!(["google", "apple", "twitter"]),
        "fixed order whatever the environment"
    );
    let two: Vec<_> = TWITTER.iter().chain(&GOOGLE).copied().collect();
    assert_eq!(methods(&two).await["social"], json!(["google", "twitter"]));
    assert_eq!(methods(&APPLE).await["social"], json!(["apple"]));
    // An id without its secret is not configured.
    assert_eq!(
        methods(&[("GOOGLE_SIGNIN_CLIENT_ID", "g-id")]).await["social"],
        json!([])
    );
}

#[tokio::test]
async fn switching_auth_off_reports_nothing() {
    let all: Vec<_> = GOOGLE.iter().chain(&TWITTER).copied().collect();
    let mut off = all.clone();
    off.push(("VITE_AUTH_ENABLED", "false"));
    assert_eq!(
        methods(&off).await,
        json!({ "email": false, "passkey": false, "social": [] })
    );
    // Only the exact string "false" turns it off.
    let mut other = all;
    other.push(("VITE_AUTH_ENABLED", "0"));
    assert_eq!(methods(&other).await["email"], true);
}

async fn get(app: &axum::Router, path: &str) -> (StatusCode, Value) {
    let request = Request::builder()
        .method(Method::GET)
        .uri(path)
        .body(Body::empty())
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[tokio::test]
async fn without_a_database_methods_answers_all_false_and_the_rest_is_503() {
    let config = Config::from_env(Environment::from_pairs([
        ("PUBLIC_ORIGIN", "https://quesar.cloud"),
        ("GOOGLE_SIGNIN_CLIENT_ID", "g-id"),
        ("GOOGLE_SIGNIN_CLIENT_SECRET", "g-secret"),
    ]))
    .unwrap();
    let app = quesar_server::router(&config);
    let (status, body) = get(&app, "/api/auth/methods").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        json!({ "ok": true, "result": { "email": false, "passkey": false, "social": [] } })
    );
    for path in ["/api/auth/session", "/api/auth/sessions"] {
        let (status, body) = get(&app, path).await;
        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{path}");
        assert_eq!(body["error"]["code"], "AUTH_UNAVAILABLE");
    }
}

#[tokio::test]
async fn methods_is_rate_limited_and_refuses_cross_site_reads() {
    let h = Harness::new().await;
    let ip = [("x-real-ip", "203.0.113.77")];
    for i in 0..100 {
        assert_eq!(
            h.get_with("/methods", &ip).await.status,
            StatusCode::OK,
            "{i}"
        );
    }
    let refused = h.get_with("/methods", &ip).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    let evil = h
        .get_with(
            "/methods",
            &[("sec-fetch-site", "cross-site"), ("sec-fetch-mode", "cors")],
        )
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    h.finish().await;
}
