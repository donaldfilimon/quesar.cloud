//! `POST /api/telemetry` over HTTP, against a throwaway database. Mirrors
//! `src/lib/server/telemetry.server.test.ts`. Runs against `TEST_DATABASE_URL`
//! (`scripts/dev-postgres.sh start`).

mod common;

use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::http::header::{CONTENT_TYPE, HeaderValue};
use axum::http::{Method, Request, StatusCode};
use common::{Harness, NoDatabase, ORIGIN, Reply, full_request};
use http_body_util::channel::Channel;
use quesar_server::api::functions;
use serde_json::{Value, json};
use sqlx::{PgPool, Row};

const PATH: &str = "/api/telemetry";
const LIMIT_MESSAGE: &str = "Too many requests. Try again shortly.";
const TOO_LARGE: &str = "That's too much to send at once. Shorten it and try again.";
const NOT_JSON: &str = "We couldn't read that request. Reload the page and try again.";

async fn post_raw(h: &Harness, ip: &str, body: String, headers: &[(&str, &str)]) -> Reply {
    h.send(full_request(
        Method::POST,
        PATH,
        body,
        ip.to_owned(),
        headers,
    ))
    .await
}

async fn post(h: &Harness, body: &Value) -> Reply {
    let ip = h.fresh_ip();
    post_raw(h, &ip, body.to_string(), &[]).await
}

async fn rows(pool: &PgPool) -> Vec<(String, String)> {
    sqlx::query("select event, path from telemetry_events order by id")
        .fetch_all(pool)
        .await
        .unwrap()
        .iter()
        .map(|r| (r.get(0), r.get(1)))
        .collect()
}

async fn limiter_rows(pool: &PgPool) -> i64 {
    sqlx::query_scalar("select count(*) from rate_limits where bucket = 'telemetry'")
        .fetch_one(pool)
        .await
        .unwrap()
}

fn stored(event: &str, path: &str) -> (String, String) {
    (event.to_owned(), path.to_owned())
}

fn error_of(reply: &Reply) -> String {
    reply.json()["error"].as_str().unwrap_or("").to_owned()
}

#[tokio::test]
async fn an_allowlisted_event_and_path_are_stored_and_answer_204() {
    let h = Harness::new().await;
    let reply = post(&h, &json!({ "event": "page_view", "path": "/contact" })).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(reply.body.is_empty());
    let reply = post(
        &h,
        &json!({ "event": "inquiry_open", "path": "/blog/wdbx-v2-release" }),
    )
    .await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(
        rows(&h.db.pool).await,
        vec![
            stored("page_view", "/contact"),
            stored("inquiry_open", "/blog/wdbx-v2-release"),
        ]
    );
    h.finish().await;
}

#[tokio::test]
async fn every_allowlisted_event_is_accepted() {
    let h = Harness::new().await;
    for event in [
        "page_view",
        "inquiry_open",
        "inquiry_submit",
        "inquiry_success",
        "inquiry_close",
    ] {
        let reply = post(&h, &json!({ "event": event, "path": "/" })).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT, "{event}");
    }
    assert_eq!(rows(&h.db.pool).await.len(), 5);
    h.finish().await;
}

#[tokio::test]
async fn an_unknown_path_is_stored_as_empty_never_verbatim() {
    let h = Harness::new().await;
    for path in [
        json!("/u/victim@example.com"),
        json!("/about?email=victim@example.com"),
        json!("/blog/victim@example.com"),
        json!(42),
        Value::Null,
    ] {
        let reply = post(&h, &json!({ "event": "inquiry_open", "path": path })).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT);
    }
    // No path at all.
    assert_eq!(
        post(&h, &json!({ "event": "inquiry_open" })).await.status,
        StatusCode::NO_CONTENT
    );
    let stored_rows = rows(&h.db.pool).await;
    assert_eq!(
        stored_rows,
        vec![
            stored("inquiry_open", ""),
            stored("inquiry_open", "/about"),
            stored("inquiry_open", ""),
            stored("inquiry_open", ""),
            stored("inquiry_open", ""),
            stored("inquiry_open", ""),
        ]
    );
    let leaked: i64 =
        sqlx::query_scalar("select count(*) from telemetry_events where path like '%victim%'")
            .fetch_one(&h.db.pool)
            .await
            .unwrap();
    assert_eq!(leaked, 0);
    h.finish().await;
}

#[tokio::test]
async fn an_unknown_event_is_400_and_stores_nothing() {
    let h = Harness::new().await;
    for body in [
        json!({ "event": "email=a@b.co", "path": "/" }),
        json!({ "event": "PAGE_VIEW" }),
        json!({ "event": " page_view" }),
        json!({ "event": "" }),
        json!({ "event": 5 }),
        json!({ "event": ["page_view"] }),
        json!({ "event": null }),
        json!({ "path": "/" }),
        json!({}),
    ] {
        let reply = post(&h, &body).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(error_of(&reply), "Unrecognized event name.", "{body}");
    }
    assert!(rows(&h.db.pool).await.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn a_body_that_is_not_a_json_object_is_400() {
    let h = Harness::new().await;
    for raw in ["[]", "null", "5", "\"page_view\"", "{nope", "", "true"] {
        let ip = h.fresh_ip();
        let reply = post_raw(&h, &ip, raw.to_owned(), &[]).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{raw:?}");
        assert_eq!(error_of(&reply), NOT_JSON, "{raw:?}");
    }
    assert!(rows(&h.db.pool).await.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn an_oversize_body_is_413() {
    let h = Harness::new().await;
    let reply = post(
        &h,
        &json!({ "event": "page_view", "path": "x".repeat(5000) }),
    )
    .await;
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_of(&reply), TOO_LARGE);
    assert!(rows(&h.db.pool).await.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn the_cap_is_4_kib_exactly() {
    let h = Harness::new().await;
    let pad = |n: usize| {
        format!(
            r#"{{"event":"page_view","path":"/","x":"{}"}}"#,
            "a".repeat(n)
        )
    };
    let base = pad(0).len();
    let at = pad(4096 - base);
    assert_eq!(at.len(), 4096);
    let ip = h.fresh_ip();
    assert_eq!(
        post_raw(&h, &ip, at, &[]).await.status,
        StatusCode::NO_CONTENT
    );
    let over = pad(4097 - base);
    let ip = h.fresh_ip();
    assert_eq!(
        post_raw(&h, &ip, over, &[]).await.status,
        StatusCode::PAYLOAD_TOO_LARGE
    );
    h.finish().await;
}

#[tokio::test]
async fn do_not_track_and_global_privacy_control_store_and_count_nothing() {
    let h = Harness::new().await;
    let body = json!({ "event": "page_view", "path": "/" }).to_string();
    for headers in [
        vec![("DNT", "1")],
        vec![("Sec-GPC", "1")],
        vec![("dnt", " 1 ")],
        // One honoured line among several.
        vec![("dnt", "0"), ("dnt", "1")],
        vec![("DNT", "1"), ("Sec-GPC", "1")],
    ] {
        let ip = h.fresh_ip();
        let reply = post_raw(&h, &ip, body.clone(), &headers).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT, "{headers:?}");
    }
    assert!(rows(&h.db.pool).await.is_empty());
    assert_eq!(limiter_rows(&h.db.pool).await, 0);

    // Not an opt-out: DNT 0, GPC 0, and a list that is not exactly `1`.
    for headers in [
        vec![("DNT", "0")],
        vec![("Sec-GPC", "0")],
        vec![("DNT", "1, 1")],
    ] {
        let ip = h.fresh_ip();
        let reply = post_raw(&h, &ip, body.clone(), &headers).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT);
    }
    assert_eq!(rows(&h.db.pool).await.len(), 3);
    assert_eq!(limiter_rows(&h.db.pool).await, 3);
    h.finish().await;
}

#[tokio::test]
async fn an_opted_out_visitor_is_not_judged_on_the_body() {
    let h = Harness::new().await;
    let big = json!({ "event": "page_view", "path": "x".repeat(5000) }).to_string();
    let ip = h.fresh_ip();
    let reply = post_raw(&h, &ip, big, &[("DNT", "1")]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    let ip = h.fresh_ip();
    let reply = post_raw(&h, &ip, "{not json".to_owned(), &[("Sec-GPC", "1")]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(limiter_rows(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn a_hundred_and_twenty_per_minute_then_429_and_the_next_window_reopens_it() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let body = json!({ "event": "page_view", "path": "/" }).to_string();
    for i in 0..120 {
        let reply = post_raw(&h, &ip, body.clone(), &[]).await;
        assert_eq!(reply.status, StatusCode::NO_CONTENT, "request {i}");
    }
    let refused = post_raw(&h, &ip, body.clone(), &[]).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(error_of(&refused), LIMIT_MESSAGE);
    assert_eq!(rows(&h.db.pool).await.len(), 120);

    // Another client is unaffected.
    let other = h.fresh_ip();
    assert_eq!(
        post_raw(&h, &other, body.clone(), &[]).await.status,
        StatusCode::NO_CONTENT
    );

    h.clock.advance(Duration::from_secs(60));
    assert_eq!(
        post_raw(&h, &ip, body, &[]).await.status,
        StatusCode::NO_CONTENT
    );
    h.finish().await;
}

#[tokio::test]
async fn a_client_over_the_limit_is_429_before_its_body_is_read() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let body = json!({ "event": "page_view" }).to_string();
    for _ in 0..120 {
        post_raw(&h, &ip, body.clone(), &[]).await;
    }
    let oversize = json!({ "event": "page_view", "path": "x".repeat(5000) }).to_string();
    let reply = post_raw(&h, &ip, oversize, &[]).await;
    assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS);
    let invalid = post_raw(&h, &ip, "{nope".to_owned(), &[]).await;
    assert_eq!(invalid.status, StatusCode::TOO_MANY_REQUESTS);
    h.finish().await;
}

/// A request whose body arrives in chunks, with no `Content-Length`.
async fn chunked(h: &Harness, chunks: Vec<Vec<u8>>) -> Reply {
    let (mut sender, channel) = Channel::<Bytes>::new(1);
    let feeder = tokio::spawn(async move {
        for chunk in chunks {
            // The reader may have stopped: that is the point of the cap.
            if sender.send_data(Bytes::from(chunk)).await.is_err() {
                break;
            }
        }
    });
    let request = Request::builder()
        .method(Method::POST)
        .uri(PATH)
        .header("origin", ORIGIN)
        .header("x-real-ip", h.fresh_ip())
        .header(CONTENT_TYPE, HeaderValue::from_static("application/json"))
        .body(Body::new(channel))
        .unwrap();
    let reply = h.send(request).await;
    feeder.abort();
    reply
}

#[tokio::test]
async fn a_chunked_body_with_no_content_length_over_4_kib_is_413() {
    let h = Harness::new().await;
    let reply = chunked(&h, vec![vec![b'a'; 2000]; 4]).await;
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_of(&reply), TOO_LARGE);
    assert!(rows(&h.db.pool).await.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn a_small_chunked_body_is_stored() {
    let h = Harness::new().await;
    let reply = chunked(
        &h,
        vec![
            br#"{"event":"page_"#.to_vec(),
            br#"view","path":"/about"}"#.to_vec(),
        ],
    )
    .await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(rows(&h.db.pool).await, vec![stored("page_view", "/about")]);
    h.finish().await;
}

#[tokio::test]
async fn a_cross_site_post_is_accepted_as_in_the_typescript() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let body = json!({ "event": "page_view", "path": "/" }).to_string();
    let reply = post_raw(
        &h,
        &ip,
        body,
        &[
            ("sec-fetch-site", "cross-site"),
            ("origin", "https://evil.example"),
        ],
    )
    .await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(rows(&h.db.pool).await.len(), 1);
    h.finish().await;
}

#[tokio::test]
async fn the_row_holds_only_event_path_and_time() {
    let h = Harness::new().await;
    let cookie = h.sign_up("telemetry@example.com").await.session_cookie();
    let cookie = cookie.unwrap();
    let ip = "198.51.100.77".to_owned();
    let agent = "UniqueAgent/9.9 (private-telemetry-probe)";
    let body = json!({ "event": "page_view", "path": "/about" }).to_string();
    let reply = post_raw(
        &h,
        &ip,
        body,
        &[
            ("cookie", &cookie),
            ("user-agent", agent),
            ("referer", "https://quesar.cloud/private-referrer"),
        ],
    )
    .await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);

    let columns: Vec<String> = sqlx::query_scalar(
        "select column_name::text from information_schema.columns
         where table_name = 'telemetry_events' order by ordinal_position",
    )
    .fetch_all(&h.db.pool)
    .await
    .unwrap();
    assert_eq!(columns, ["id", "event", "path", "created_at"]);

    let whole_row: String = sqlx::query_scalar("select t::text from telemetry_events t")
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    let token = cookie.split_once('=').unwrap().1;
    for secret in [
        ip.as_str(),
        agent,
        token,
        "private-referrer",
        "telemetry@example.com",
    ] {
        assert!(
            !whole_row.contains(secret),
            "the row holds {secret}: {whole_row}"
        );
    }
    // The limiter keys on a hash, never the address.
    let subjects: Vec<String> =
        sqlx::query_scalar("select subject from rate_limits where bucket = 'telemetry'")
            .fetch_all(&h.db.pool)
            .await
            .unwrap();
    assert_eq!(subjects.len(), 1);
    assert!(!subjects[0].contains(&ip));
    h.finish().await;
}

#[tokio::test]
async fn a_dropped_table_is_204() {
    let h = Harness::new().await;
    sqlx::query("drop table telemetry_events")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = post(&h, &json!({ "event": "page_view", "path": "/" })).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(reply.body.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn a_failing_limiter_is_204_and_stores_nothing() {
    let h = Harness::new().await;
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = post(&h, &json!({ "event": "page_view", "path": "/" })).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(rows(&h.db.pool).await.is_empty());
    h.finish().await;
}

#[tokio::test]
async fn without_a_database_the_answer_is_204() {
    let server = NoDatabase::new(&[], functions(), |_| {});
    let body = json!({ "event": "page_view", "path": "/" }).to_string();
    let reply = server.request(Method::POST, PATH, &body, &[]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert!(reply.body.is_empty());
    // Nothing is judged without a store: not even a bad event.
    let reply = server.request(Method::POST, PATH, "[]", &[]).await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    let other = server.request(Method::GET, PATH, "", &[]).await;
    assert_eq!(other.status, StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn other_methods_are_the_enveloped_405() {
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
    assert_eq!(limiter_rows(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn a_path_below_the_sink_is_the_api_404() {
    let h = Harness::new().await;
    let reply = h
        .request(Method::POST, "/api/telemetry/extra", "{}", &[])
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    assert_eq!(reply.json()["ok"], json!(false));
    h.finish().await;
}
