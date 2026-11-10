//! The configuration reads under `/api/fn`: `inquiries.getTurnstileConfig`,
//! `quasar.getQuasarDefaultOrigin` and `commerce.getCommerceReadiness`.

mod common;

use axum::http::{Method, StatusCode};
use common::{Harness, NoDatabase, Reply};
use quesar_server::api::{PublicServices, functions};
use serde_json::{Value, json};
use std::time::Duration;

const TURNSTILE: &str = "/api/fn/inquiries.getTurnstileConfig";
const QUASAR: &str = "/api/fn/quasar.getQuasarDefaultOrigin";
const COMMERCE: &str = "/api/fn/commerce.getCommerceReadiness";
const SECRET: &str = "turnstile-secret-must-not-leak";

fn ready() -> [(&'static str, &'static str); 3] {
    [
        ("TURNSTILE_SITE_KEY", "site-key-123"),
        ("TURNSTILE_SECRET", SECRET),
        ("TURNSTILE_HOSTNAMES", " Quesar.Cloud , ,"),
    ]
}

fn complete_commerce() -> Vec<(&'static str, &'static str)> {
    vec![
        ("WDBX_BINARY", "/opt/wdbx/bin/wdbx"),
        ("WDBX_COMMERCE_DIRECTORY", "/var/lib/wdbx"),
        ("WDBX_COMMERCE_CONFIG", "/etc/wdbx/config"),
        ("WDBX_COMMERCE_HOST_KEY", "/etc/wdbx/host-key"),
        ("DATABASE_URL", "postgres://u@localhost/db"),
        ("APP_ENCRYPTION_KEY", KEY),
    ]
}

/// 32 bytes as 64 hex digits.
const KEY: &str = "0101010101010101010101010101010101010101010101010101010101010101";

async fn ask(server: &NoDatabase, path: &str) -> Reply {
    server.request(Method::POST, path, "", &[]).await
}

#[tokio::test]
async fn turnstile_answers_each_state_without_a_database() {
    let off = NoDatabase::new(&[], functions(), |_| {});
    let reply = ask(&off, TURNSTILE).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(
        reply.json(),
        json!({"ok": true, "result": {"state": "off"}})
    );

    let missing_hosts = NoDatabase::new(
        &[
            ("TURNSTILE_SITE_KEY", "site-key-123"),
            ("TURNSTILE_SECRET", SECRET),
        ],
        functions(),
        |_| {},
    );
    let reply = ask(&missing_hosts, TURNSTILE).await;
    assert_eq!(
        reply.json(),
        json!({"ok": true, "result": {"state": "misconfigured"}})
    );
    assert!(!reply.text().contains("site-key-123"), "no key exposed");

    let configured = NoDatabase::new(&ready(), functions(), |_| {});
    let reply = ask(&configured, TURNSTILE).await;
    assert_eq!(
        reply.json(),
        json!({"ok": true, "result": {"state": "ready", "siteKey": "site-key-123"}})
    );
    assert!(!reply.text().contains(SECRET));
}

#[tokio::test]
async fn quasar_origin_is_normalised_or_null() {
    let unset = NoDatabase::new(&[], functions(), |_| {});
    assert_eq!(
        ask(&unset, QUASAR).await.json(),
        json!({"ok": true, "result": null})
    );
    let set = NoDatabase::new(
        &[("QUASAR_SERVICE_ORIGIN", " HTTPS://Example.com:443/ ")],
        functions(),
        |_| {},
    );
    assert_eq!(
        ask(&set, QUASAR).await.json(),
        json!({"ok": true, "result": "https://example.com"})
    );
    for malformed in [
        "https://example.com/api",
        "ftp://example.com",
        "https://u@example.com",
    ] {
        let server = NoDatabase::new(&[("QUASAR_SERVICE_ORIGIN", malformed)], functions(), |_| {});
        assert_eq!(
            ask(&server, QUASAR).await.json(),
            json!({"ok": true, "result": null}),
            "{malformed}"
        );
    }
}

#[tokio::test]
async fn commerce_readiness_is_false_even_for_a_complete_environment() {
    let expected = json!({
        "ok": true,
        "result": {"configured": false, "paymentMode": "manual_invoice", "storage": "wdbx"}
    });
    let unset = NoDatabase::new(&[], functions(), |_| {});
    assert_eq!(ask(&unset, COMMERCE).await.json(), expected);
    let complete = NoDatabase::new(&complete_commerce(), functions(), |_| {});
    assert_eq!(ask(&complete, COMMERCE).await.json(), expected);
}

#[tokio::test]
async fn the_secret_is_in_no_debug_output() {
    let config = common::test_config(&ready());
    let public = PublicServices::build(&config).unwrap();
    let text = format!("{public:?}");
    assert!(!text.contains(SECRET), "{text}");
    assert!(text.contains("TurnstileConfig"), "{text}");
}

#[tokio::test]
async fn every_read_is_limited_per_address_and_recovers_with_the_window() {
    for path in [TURNSTILE, QUASAR, COMMERCE] {
        let h = Harness::with_public(&[], |_: &mut PublicServices| {}).await;
        let ip = [("x-real-ip", "203.0.113.77")];
        // The three reads share one bucket, so only this path is called here.
        for i in 0..100 {
            let reply = h.request(Method::POST, path, "", &ip).await;
            assert_eq!(reply.status, StatusCode::OK, "{path} #{i}");
        }
        let refused = h.request(Method::POST, path, "", &ip).await;
        assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS, "{path}");
        assert_eq!(refused.error_code(), "RATE_LIMITED");
        assert!(refused.headers.contains_key("retry-after"));
        // Another address is unaffected.
        let other = h
            .request(Method::POST, path, "", &[("x-real-ip", "203.0.113.78")])
            .await;
        assert_eq!(other.status, StatusCode::OK);
        h.clock.advance(Duration::from_secs(11));
        let later = h.request(Method::POST, path, "", &ip).await;
        assert_eq!(later.status, StatusCode::OK, "{path} after the window");
        h.finish().await;
    }
}

#[tokio::test]
async fn the_reads_share_one_bucket_per_address() {
    let h = Harness::new().await;
    let ip = [("x-real-ip", "203.0.113.90")];
    for i in 0..100 {
        let path = [TURNSTILE, QUASAR, COMMERCE][i % 3];
        assert_eq!(
            h.request(Method::POST, path, "", &ip).await.status,
            StatusCode::OK
        );
    }
    let refused = h.request(Method::POST, TURNSTILE, "", &ip).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    h.finish().await;
}

#[tokio::test]
async fn a_failing_limiter_does_not_stop_the_read() {
    let h = Harness::with_public(&ready(), |_: &mut PublicServices| {}).await;
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    for path in [TURNSTILE, QUASAR, COMMERCE] {
        let reply = h.request(Method::POST, path, "", &[]).await;
        assert_eq!(reply.status, StatusCode::OK, "{path}: {}", reply.text());
        let body: Value = reply.json();
        assert_eq!(body["ok"], true);
    }
    h.finish().await;
}
