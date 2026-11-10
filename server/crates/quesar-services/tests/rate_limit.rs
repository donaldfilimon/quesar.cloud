//! Behaviour and cross-language tests for `quesar_services::rate_limit`.
//! The database tests run against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use quesar_services::rate_limit::{
    Bucket, Limit, RateLimiter, client_ip, resolve_secret, window_start,
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

fn limiter(db: &TestDatabase) -> RateLimiter {
    RateLimiter::new(db.pool.clone(), SECRET)
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
    headers: HashMap<String, String>,
    subject: String,
}

#[tokio::test]
async fn derives_the_subjects_the_typescript_stores() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contract/rate-limit-subjects.json");
    let file: SubjectFile = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert!(file.vectors.len() >= 8);
    // A lazy pool: no connection is made, only the secret matters here.
    let pool = sqlx::PgPool::connect_lazy("postgres://unused@localhost/unused").unwrap();
    let limiter = RateLimiter::new(pool, file.secret.as_bytes());
    for vector in &file.vectors {
        let header = |name: &str| vector.headers.get(name).map(String::as_str);
        let ip = client_ip(
            vector.trusted_proxy == "cloudflare",
            header("cf-connecting-ip"),
            header("x-real-ip"),
            header("x-forwarded-for"),
        );
        assert_eq!(
            limiter.client_subject(&ip),
            vector.subject,
            "{}",
            vector.name
        );
    }
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
