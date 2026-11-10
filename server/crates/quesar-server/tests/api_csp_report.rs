//! `POST /api/csp-report` over HTTP, against a throwaway database. Mirrors
//! `src/lib/server/csp-report.server.test.ts`; what is logged is judged in
//! `api_csp_report_logging.rs`, which owns the global log subscriber.

mod common;

use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::http::{Method, Request, StatusCode};
use common::{Harness, NoDatabase, ORIGIN, Reply, full_request};
use http_body_util::channel::Channel;
use quesar_server::api::functions;
use quesar_server::csp::REPORTING_ENDPOINTS;
use serde_json::json;

const PATH: &str = "/api/csp-report";
const LIMIT_MESSAGE: &str = "Too many requests. Try again shortly.";
const TOO_LARGE: &str = "That's too much to send at once. Shorten it and try again.";

async fn post_raw(h: &Harness, ip: &str, body: Vec<u8>, headers: &[(&str, &str)]) -> Reply {
    let mut request = full_request(
        Method::POST,
        PATH,
        String::new(),
        ip.to_owned(),
        &[("content-type", "application/csp-report")],
    );
    for (name, value) in headers {
        request.headers_mut().insert(
            axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
            value.parse().unwrap(),
        );
    }
    *request.body_mut() = Body::from(body);
    h.send(request).await
}

async fn report(h: &Harness, body: &str) -> Reply {
    let ip = h.fresh_ip();
    post_raw(h, &ip, body.as_bytes().to_vec(), &[]).await
}

async fn limiter_rows(h: &Harness) -> i64 {
    sqlx::query_scalar("select count(*) from rate_limits where bucket = 'csp-report'")
        .fetch_one(&h.db.pool)
        .await
        .unwrap()
}

#[tokio::test]
async fn a_legacy_report_is_204_with_no_body() {
    let h = Harness::new().await;
    let body = json!({ "csp-report": { "violated-directive": "script-src" } }).to_string();
    let reply = report(&h, &body).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(reply.body.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn a_reporting_api_batch_and_any_other_text_are_204() {
    let h = Harness::new().await;
    let batch = json!([{ "type": "csp-violation", "body": { "blockedURL": "x".repeat(5000) } }]);
    assert_eq!(
        report(&h, &batch.to_string()).await.status,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        report(&h, "not json at all").await.status,
        StatusCode::NO_CONTENT
    );
    assert_eq!(report(&h, "").await.status, StatusCode::NO_CONTENT);
    h.finish().await;
}

#[tokio::test]
async fn invalid_utf8_does_not_fail() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let reply = post_raw(&h, &ip, vec![0xff, 0xfe, b'{', 0xc3, 0x28], &[]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    h.finish().await;
}

#[tokio::test]
async fn the_cap_is_64_kib_exactly() {
    let h = Harness::new().await;
    assert_eq!(
        report(&h, &"x".repeat(64 * 1024)).await.status,
        StatusCode::NO_CONTENT
    );
    let over = report(&h, &"x".repeat(64 * 1024 + 1)).await;
    assert_eq!(over.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(over.json()["error"], TOO_LARGE);
    assert_eq!(
        report(&h, &"x".repeat(65 * 1024)).await.status,
        StatusCode::PAYLOAD_TOO_LARGE
    );
    h.finish().await;
}

#[tokio::test]
async fn a_chunked_body_over_the_cap_is_413_and_an_aborted_one_is_413() {
    let h = Harness::new().await;
    let (mut sender, channel) = Channel::<Bytes>::new(1);
    let feeder = tokio::spawn(async move {
        for _ in 0..40 {
            if sender
                .send_data(Bytes::from(vec![b'a'; 2000]))
                .await
                .is_err()
            {
                break;
            }
        }
    });
    let request = Request::builder()
        .method(Method::POST)
        .uri(PATH)
        .header("x-real-ip", h.fresh_ip())
        .body(Body::new(channel))
        .unwrap();
    let reply = h.send(request).await;
    feeder.abort();
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);

    let (mut sender, channel) = Channel::<Bytes, std::io::Error>::new(1);
    let feeder = tokio::spawn(async move {
        let _ = sender.send_data(Bytes::from_static(b"{")).await;
        sender.abort(std::io::Error::other("client went away"));
    });
    let request = Request::builder()
        .method(Method::POST)
        .uri(PATH)
        .header("x-real-ip", h.fresh_ip())
        .body(Body::new(channel))
        .unwrap();
    let reply = h.send(request).await;
    feeder.abort();
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);
    h.finish().await;
}

#[tokio::test]
async fn sixty_per_minute_then_429_and_the_next_window_reopens_it() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    for i in 0..60 {
        let reply = post_raw(&h, &ip, b"{}".to_vec(), &[]).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT, "request {i}");
    }
    let refused = post_raw(&h, &ip, b"{}".to_vec(), &[]).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(refused.json()["error"], LIMIT_MESSAGE);

    // Another client is unaffected.
    let other = h.fresh_ip();
    assert_eq!(
        post_raw(&h, &other, b"{}".to_vec(), &[]).await.status,
        StatusCode::NO_CONTENT
    );

    h.clock.advance(Duration::from_secs(60));
    assert_eq!(
        post_raw(&h, &ip, b"{}".to_vec(), &[]).await.status,
        StatusCode::NO_CONTENT
    );
    h.finish().await;
}

#[tokio::test]
async fn a_client_over_the_limit_is_429_before_its_body_is_read() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    for _ in 0..60 {
        post_raw(&h, &ip, b"{}".to_vec(), &[]).await;
    }
    let oversize = post_raw(&h, &ip, vec![b'x'; 70_000], &[]).await;
    assert_eq!(oversize.status, StatusCode::TOO_MANY_REQUESTS);
    h.finish().await;
}

#[tokio::test]
async fn a_cross_site_request_without_credentials_is_accepted() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    for headers in [
        &[
            ("origin", "https://evil.example"),
            ("sec-fetch-site", "cross-site"),
        ][..],
        &[("sec-fetch-site", "cross-site")][..],
    ] {
        let reply = post_raw(&h, &ip, b"{}".to_vec(), headers).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT);
    }
    // And one with no origin headers at all, as a browser's report upload.
    let request = Request::builder()
        .method(Method::POST)
        .uri(PATH)
        .header("x-real-ip", &ip)
        .body(Body::from("{}"))
        .unwrap();
    assert_eq!(h.send(request).await.status, StatusCode::NO_CONTENT);
    h.finish().await;
}

#[tokio::test]
async fn the_path_the_csp_header_names_is_the_mounted_route() {
    let h = Harness::new().await;
    let header = REPORTING_ENDPOINTS.to_str().unwrap().to_owned();
    let path = header.split('"').nth(1).unwrap();
    assert_eq!(path, PATH);
    let reply = report_to(&h, path, "{}").await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(limiter_rows(&h).await, 1);
    h.finish().await;
}

async fn report_to(h: &Harness, path: &str, body: &str) -> Reply {
    let request = full_request(
        Method::POST,
        path,
        body.to_owned(),
        h.fresh_ip(),
        &[("origin", ORIGIN)],
    );
    h.send(request).await
}

#[tokio::test]
async fn a_failing_limiter_is_204() {
    let h = Harness::new().await;
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(report(&h, "{}").await.status, StatusCode::NO_CONTENT);
    // Even a body that would be 413 is not judged: the limiter answered first.
    assert_eq!(
        report(&h, &"x".repeat(70_000)).await.status,
        StatusCode::NO_CONTENT
    );
    h.finish().await;
}

#[tokio::test]
async fn without_a_database_the_answer_is_204() {
    let server = NoDatabase::new(&[], functions(), |_| {});
    let reply = server.request(Method::POST, PATH, "{}", &[]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(reply.body.is_empty());
    // Not judged without a limiter: not even an oversize body.
    let big = "x".repeat(70_000);
    let reply = server.request(Method::POST, PATH, &big, &[]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    let other = server.request(Method::GET, PATH, "", &[]).await;
    assert_eq!(other.status, StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn other_methods_are_the_enveloped_405_and_count_nothing() {
    let h = Harness::new().await;
    for method in [Method::GET, Method::PUT, Method::DELETE, Method::PATCH] {
        let reply = h.request(method.clone(), PATH, "", &[]).await;
        assert_eq!(reply.status, StatusCode::METHOD_NOT_ALLOWED, "{method}");
        assert_eq!(reply.error_code(), "METHOD_NOT_ALLOWED", "{method}");
        assert_eq!(
            reply.headers.get("allow").and_then(|v| v.to_str().ok()),
            Some("POST"),
            "{method}"
        );
    }
    assert_eq!(limiter_rows(&h).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn nothing_is_stored() {
    let h = Harness::new().await;
    report(&h, r#"{"csp-report":{"blocked-uri":"https://x.test"}}"#).await;
    let tables: Vec<String> = sqlx::query_scalar(
        "select table_name::text from information_schema.tables where table_schema = 'public'",
    )
    .fetch_all(&h.db.pool)
    .await
    .unwrap();
    for table in tables {
        if matches!(table.as_str(), "rate_limits" | "_migrations") {
            continue;
        }
        let count: i64 = sqlx::query_scalar(&format!("select count(*) from \"{table}\""))
            .fetch_one(&h.db.pool)
            .await
            .unwrap();
        assert_eq!(count, 0, "{table} has rows");
    }
    h.finish().await;
}
