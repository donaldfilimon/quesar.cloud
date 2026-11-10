//! Behaviour and cross-language tests for `quesar_services::rate_limit`.
//! The database tests run against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use http::{HeaderMap, HeaderName, HeaderValue};
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use quesar_services::rate_limit::{
    Bucket, Limit, ProxyTrust, PruneSampling, RateLimiter, client_ip_from_headers, resolve_secret,
    window_start,
};
use serde::Deserialize;

const T: i64 = 1_900_000_000_000;
const SECRET: &str = "unit-test-secret";

async fn database() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.unwrap();
    db
}

fn limiter_never(db: &TestDatabase) -> RateLimiter {
    limiter(db)
}

fn limiter(db: &TestDatabase) -> RateLimiter {
    RateLimiter::new(db.pool.clone(), SECRET).with_prune_sampling(PruneSampling::Never)
}

#[derive(Deserialize)]
struct SubjectFile {
    secret: String,
    vectors: Vec<SubjectVector>,
}
#[derive(Deserialize)]
struct SubjectVector {
    name: String,
    trusted_proxy: String,
    headers: HashMap<String, HeaderLines>,
    subject: String,
}

/// One header line, or the same header sent as several lines.
#[derive(Deserialize)]
#[serde(untagged)]
enum HeaderLines {
    One(String),
    Many(Vec<String>),
}

fn header_map(headers: &HashMap<String, HeaderLines>) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (name, lines) in headers {
        let name = HeaderName::from_bytes(name.as_bytes()).unwrap();
        let lines = match lines {
            HeaderLines::One(line) => std::slice::from_ref(line),
            HeaderLines::Many(lines) => lines.as_slice(),
        };
        for line in lines {
            map.append(name.clone(), HeaderValue::from_str(line).unwrap());
        }
    }
    map
}

fn headers_of(pairs: &[(&str, &str)]) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (name, value) in pairs {
        map.append(
            HeaderName::from_bytes(name.as_bytes()).unwrap(),
            HeaderValue::from_str(value).unwrap(),
        );
    }
    map
}

fn peer(text: &str) -> Option<SocketAddr> {
    Some(text.parse().unwrap())
}

#[tokio::test]
async fn derives_the_subjects_the_typescript_stores() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contract/rate-limit-subjects.json");
    let file: SubjectFile = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert!(file.vectors.len() >= 10);
    // A lazy pool: no connection is made, only the secret matters here.
    let pool = sqlx::PgPool::connect_lazy("postgres://unused@localhost/unused").unwrap();
    let limiter = RateLimiter::new(pool, file.secret.as_bytes());
    for vector in &file.vectors {
        let trust = ProxyTrust::from_setting(Some(&vector.trusted_proxy));
        let ip = client_ip_from_headers(&header_map(&vector.headers), trust, None);
        assert_eq!(
            limiter.client_subject(&ip),
            vector.subject,
            "{}",
            vector.name
        );
    }
}

#[test]
fn parses_the_trusted_proxy_setting() {
    assert_eq!(ProxyTrust::from_setting(None), ProxyTrust::None);
    assert_eq!(ProxyTrust::from_setting(Some("")), ProxyTrust::None);
    assert_eq!(ProxyTrust::from_setting(Some("nginx")), ProxyTrust::None);
    assert_eq!(
        ProxyTrust::from_setting(Some("Cloudflare")),
        ProxyTrust::None
    );
    assert_eq!(
        ProxyTrust::from_setting(Some(" x-real-ip ")),
        ProxyTrust::XRealIp
    );
    assert_eq!(
        ProxyTrust::from_setting(Some("x-forwarded-for")),
        ProxyTrust::XForwardedFor
    );
    assert_eq!(
        ProxyTrust::from_setting(Some("cloudflare")),
        ProxyTrust::Cloudflare
    );
}

#[test]
fn by_default_no_header_is_trusted_and_the_peer_address_is_used() {
    // The headers of the TypeScript's "x-real-ip wins" vector, which that
    // implementation trusts unconditionally.
    let spoofed = headers_of(&[
        ("x-real-ip", "198.51.100.4"),
        ("x-forwarded-for", "203.0.113.9"),
        ("cf-connecting-ip", "192.0.2.1"),
    ]);
    let connection = peer("192.0.2.77:51234");
    assert_eq!(
        client_ip_from_headers(&spoofed, ProxyTrust::None, connection),
        "192.0.2.77"
    );
    assert_eq!(
        client_ip_from_headers(&spoofed, ProxyTrust::None, None),
        "unknown"
    );
}

#[test]
fn a_trusted_header_that_is_absent_falls_back_to_the_peer_not_another_header() {
    let others = headers_of(&[
        ("x-real-ip", "198.51.100.4"),
        ("x-forwarded-for", "203.0.113.9"),
    ]);
    let connection = peer("[2001:db8::7]:443");
    assert_eq!(
        client_ip_from_headers(&others, ProxyTrust::Cloudflare, connection),
        "2001:db8::7"
    );
    let only_cloudflare = headers_of(&[("cf-connecting-ip", "192.0.2.1")]);
    assert_eq!(
        client_ip_from_headers(&only_cloudflare, ProxyTrust::XRealIp, peer("10.0.0.1:1")),
        "10.0.0.1"
    );
    assert_eq!(
        client_ip_from_headers(&only_cloudflare, ProxyTrust::XForwardedFor, None),
        "unknown"
    );
}

#[test]
fn an_ipv4_mapped_peer_is_reported_as_ipv4() {
    assert_eq!(
        client_ip_from_headers(
            &HeaderMap::new(),
            ProxyTrust::None,
            peer("[::ffff:192.0.2.5]:80")
        ),
        "192.0.2.5"
    );
}

#[test]
fn repeated_forwarded_for_lines_are_joined_before_the_rightmost_hop_is_taken() {
    let headers = headers_of(&[
        ("x-forwarded-for", "6.6.6.6, 7.7.7.7"),
        ("x-forwarded-for", " 203.0.113.9 "),
    ]);
    assert_eq!(
        client_ip_from_headers(&headers, ProxyTrust::XForwardedFor, peer("10.0.0.1:1")),
        "203.0.113.9"
    );
}

#[test]
fn headers_that_are_not_utf8_are_ignored() {
    let mut headers = HeaderMap::new();
    headers.append("x-real-ip", HeaderValue::from_bytes(b"\xff\xfe").unwrap());
    assert_eq!(
        client_ip_from_headers(&headers, ProxyTrust::XRealIp, peer("10.0.0.1:1")),
        "10.0.0.1"
    );
    headers.append("x-real-ip", HeaderValue::from_static("203.0.113.9"));
    assert_eq!(
        client_ip_from_headers(&headers, ProxyTrust::XRealIp, peer("10.0.0.1:1")),
        "203.0.113.9"
    );
}

#[test]
fn resolves_the_secret_like_the_typescript() {
    assert_eq!(resolve_secret(Some(" a "), Some("b")), "a");
    assert_eq!(resolve_secret(Some("  "), Some(" b ")), "b");
    assert_eq!(resolve_secret(None, Some("b")), "b");
    assert_eq!(resolve_secret(None, None), "quesar-rate-limit");
    assert_eq!(resolve_secret(Some(""), Some("")), "quesar-rate-limit");
}

#[test]
fn buckets_carry_the_typescript_limits() {
    let table = [
        (Bucket::Llm, "llm", 60_000, 12),
        (Bucket::Inquiry, "inquiry", 600_000, 5),
        (Bucket::Telemetry, "telemetry", 60_000, 120),
        (Bucket::CspReport, "csp-report", 60_000, 60),
        (Bucket::Workspace, "workspace", 60_000, 60),
        (Bucket::CommerceCreate, "commerce-create", 3_600_000, 20),
        (Bucket::AuditExpiry, "audit-expiry", 60_000, 5),
    ];
    for (bucket, name, window_ms, max) in table {
        assert_eq!(bucket.name(), name);
        assert_eq!(bucket.limit(), Limit { window_ms, max });
    }
}

#[test]
fn aligns_windows_to_the_window_size() {
    assert_eq!(window_start(125_000, 60_000), 120_000);
    assert_eq!(window_start(-1, 60_000), -60_000);
}

#[tokio::test]
async fn allows_up_to_the_limit_then_refuses_with_a_retry_after() {
    let db = database().await;
    let limiter = limiter(&db);
    let limit = Limit {
        window_ms: 60_000,
        max: 3,
    };
    let now = window_start(T, 60_000) + 15_000;
    let mut results = Vec::new();
    for _ in 0..4 {
        results.push(limiter.hit_with("test", "s1", limit, now).await.unwrap());
    }
    let allowed: Vec<bool> = results.iter().map(|r| r.allowed).collect();
    assert_eq!(allowed, [true, true, true, false]);
    assert_eq!(
        results.iter().map(|r| r.remaining).collect::<Vec<_>>(),
        [2, 1, 0, 0]
    );
    assert_eq!(results[3].retry_after_ms, 45_000);
    assert!(results.iter().all(|r| r.retry_after_ms > 0));
    db.cleanup().await;
}

#[tokio::test]
async fn a_new_window_allows_again() {
    let db = database().await;
    let limiter = limiter(&db);
    let limit = Limit {
        window_ms: 60_000,
        max: 1,
    };
    let now = window_start(T, 60_000);
    assert!(
        limiter
            .hit_with("test", "s", limit, now)
            .await
            .unwrap()
            .allowed
    );
    assert!(
        !limiter
            .hit_with("test", "s", limit, now + 59_999)
            .await
            .unwrap()
            .allowed
    );
    let next = limiter
        .hit_with("test", "s", limit, now + 60_000)
        .await
        .unwrap();
    assert!(next.allowed);
    assert_eq!(next.retry_after_ms, 60_000);
    db.cleanup().await;
}

#[tokio::test]
async fn subjects_and_buckets_are_independent() {
    let db = database().await;
    let limiter = limiter(&db);
    let limit = Limit {
        window_ms: 60_000,
        max: 1,
    };
    assert!(limiter.hit_with("a", "s1", limit, T).await.unwrap().allowed);
    assert!(limiter.hit_with("a", "s2", limit, T).await.unwrap().allowed);
    assert!(limiter.hit_with("b", "s1", limit, T).await.unwrap().allowed);
    assert!(!limiter.hit_with("a", "s1", limit, T).await.unwrap().allowed);
    db.cleanup().await;
}

#[tokio::test]
async fn named_buckets_use_their_own_limit() {
    let db = database().await;
    let limiter = limiter(&db);
    let subject = limiter.client_subject("203.0.113.9");
    for i in 1..=5 {
        let result = limiter.hit(Bucket::Inquiry, &subject, T).await.unwrap();
        assert!(result.allowed, "hit {i}");
    }
    assert!(
        !limiter
            .hit(Bucket::Inquiry, &subject, T)
            .await
            .unwrap()
            .allowed
    );
    db.cleanup().await;
}

#[tokio::test]
async fn fifty_concurrent_checks_allow_exactly_ten() {
    let db = database().await;
    let limiter = Arc::new(limiter(&db));
    let limit = Limit {
        window_ms: 60_000,
        max: 10,
    };
    let tasks: Vec<_> = (0..50)
        .map(|_| {
            let limiter = Arc::clone(&limiter);
            tokio::spawn(async move { limiter.hit_with("race", "s", limit, T).await.unwrap() })
        })
        .collect();
    let mut allowed = 0;
    for task in tasks {
        if task.await.unwrap().allowed {
            allowed += 1;
        }
    }
    assert_eq!(allowed, 10);
    db.cleanup().await;
}

#[tokio::test]
async fn prune_removes_only_windows_older_than_a_day() {
    let db = database().await;
    let limiter = limiter(&db);
    let limit = Limit {
        window_ms: 60_000,
        max: 5,
    };
    let day = 24 * 60 * 60_000;
    limiter
        .hit_with("p", "old", limit, T - day - 120_000)
        .await
        .unwrap();
    limiter
        .hit_with("p", "edge", limit, T - day + 120_000)
        .await
        .unwrap();
    limiter.hit_with("p", "new", limit, T).await.unwrap();
    assert_eq!(limiter.prune(T).await.unwrap(), 1);
    let left: Vec<String> = sqlx::query_scalar("select subject from rate_limits order by subject")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(left, ["edge", "new"]);
    db.cleanup().await;
}

#[tokio::test]
async fn a_hit_prunes_expired_rows_when_sampled_in() {
    let db = database().await;
    let limiter = limiter(&db).with_prune_sampling(PruneSampling::Always);
    let limit = Limit {
        window_ms: 60_000,
        max: 5,
    };
    let day = 24 * 60 * 60_000;
    let never = limiter_never(&db);
    never
        .hit_with("p", "old", limit, T - day - 120_000)
        .await
        .unwrap();
    limiter.hit_with("p", "new", limit, T).await.unwrap();
    let left: Vec<String> = sqlx::query_scalar("select subject from rate_limits")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(left, ["new"]);
    db.cleanup().await;
}

#[tokio::test]
async fn rejects_a_non_positive_window() {
    let db = database().await;
    let limiter = limiter(&db);
    let limit = Limit {
        window_ms: 0,
        max: 1,
    };
    assert!(limiter.hit_with("x", "s", limit, T).await.is_err());
    db.cleanup().await;
}
