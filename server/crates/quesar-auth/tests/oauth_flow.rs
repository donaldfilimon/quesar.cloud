//! The `auth_flows` row of an OAuth sign-in. Runs against `TEST_DATABASE_URL`.

use std::path::{Path, PathBuf};
use std::time::Duration;

use http::{HeaderMap, HeaderValue, header};
use quesar_auth::oauth::flow::{self, Attach, BINDING_COOKIE, FLOW_TTL, Posted};
use quesar_auth::oauth::pkce;
use quesar_auth::oauth::provider::ProviderId;
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use sqlx::Row;
use time::OffsetDateTime;
use time::macros::datetime;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

#[tokio::test]
async fn a_started_flow_stores_only_hashes_and_is_consumed_once() {
    let db = migrated().await;
    let started = flow::start(
        &db.pool,
        ProviderId::Google,
        "/console/a",
        "/login?next=%2Fa",
        T0,
    )
    .await
    .unwrap();
    assert_eq!(started.state.expose().len(), 43);
    assert_eq!(started.binding.expose().len(), 43);
    assert_eq!(started.nonce.as_ref().map(|n| n.expose().len()), Some(43));
    assert_ne!(started.state.expose(), started.binding.expose());

    let row = sqlx::query(
        "select kind, provider, state_hash, binding_hash, payload, expires_at from auth_flows",
    )
    .fetch_one(&db.pool)
    .await
    .unwrap();
    assert_eq!(row.get::<String, _>("kind"), "oauth");
    assert_eq!(row.get::<String, _>("provider"), "google");
    assert_eq!(
        row.get::<Vec<u8>, _>("state_hash"),
        started.state.hash().to_vec()
    );
    assert_eq!(
        row.get::<Vec<u8>, _>("binding_hash"),
        started.binding.hash().to_vec()
    );
    assert_eq!(row.get::<OffsetDateTime, _>("expires_at"), T0 + FLOW_TTL);
    let payload: serde_json::Value = row.get("payload");
    assert_eq!(payload["callback"], "/console/a");
    assert_eq!(payload["errorCallback"], "/login?next=%2Fa");
    assert_eq!(payload["nonce"], started.nonce.as_ref().unwrap().expose());
    let verifier = payload["verifier"].as_str().unwrap();
    assert_eq!(verifier.len(), 128);
    assert_eq!(started.challenge, pkce::challenge_for(verifier));
    // Neither secret is stored in the clear.
    let dump = payload.to_string();
    assert!(!dump.contains(started.state.expose()));
    assert!(!dump.contains(started.binding.expose()));

    let taken = flow::consume(
        &db.pool,
        started.state.expose(),
        T0 + Duration::from_secs(5),
    )
    .await
    .unwrap()
    .expect("found");
    assert_eq!(taken.provider, "google");
    assert!(!taken.expired);
    assert_eq!(taken.verifier.expose(), verifier);
    assert_eq!(taken.callback, "/console/a");
    assert_eq!(taken.error_callback, "/login?next=%2Fa");
    assert!(taken.binding_matches(started.binding.expose()));
    assert!(!taken.binding_matches(started.state.expose()));
    assert!(!taken.binding_matches(""));
    assert!(!format!("{taken:?}").contains(verifier));

    // The row is gone: a replay finds nothing.
    assert!(
        flow::consume(&db.pool, started.state.expose(), T0)
            .await
            .unwrap()
            .is_none()
    );
    let left: i64 = sqlx::query_scalar("select count(*) from auth_flows")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(left, 0);
    db.cleanup().await;
}

#[tokio::test]
async fn two_concurrent_consumes_cannot_both_win() {
    let db = migrated().await;
    let started = flow::start(&db.pool, ProviderId::Google, "/c", "/login", T0)
        .await
        .unwrap();
    let state = started.state.expose().to_owned();
    let results = futures_join(&db, &state).await;
    assert_eq!(results.iter().filter(|found| **found).count(), 1);
    db.cleanup().await;
}

async fn futures_join(db: &TestDatabase, state: &str) -> Vec<bool> {
    let mut handles = Vec::new();
    for _ in 0..8 {
        let pool = db.pool.clone();
        let state = state.to_owned();
        handles.push(tokio::spawn(async move {
            flow::consume(&pool, &state, T0).await.unwrap().is_some()
        }));
    }
    let mut out = Vec::new();
    for handle in handles {
        out.push(handle.await.unwrap());
    }
    out
}

#[tokio::test]
async fn a_flow_expires_after_ten_minutes_and_is_still_consumed() {
    let db = migrated().await;
    for (offset, expired) in [(599, false), (600, true), (601, true)] {
        let started = flow::start(&db.pool, ProviderId::Google, "/c", "/login", T0)
            .await
            .unwrap();
        let taken = flow::consume(
            &db.pool,
            started.state.expose(),
            T0 + Duration::from_secs(offset),
        )
        .await
        .unwrap()
        .expect("an expired flow is still taken out");
        assert_eq!(taken.expired, expired, "at +{offset}s");
        assert!(
            flow::consume(&db.pool, started.state.expose(), T0)
                .await
                .unwrap()
                .is_none(),
            "gone after being taken at +{offset}s"
        );
    }
    db.cleanup().await;
}

#[tokio::test]
async fn unknown_or_non_oauth_states_find_nothing() {
    let db = migrated().await;
    assert!(
        flow::consume(&db.pool, "no-such-state", T0)
            .await
            .unwrap()
            .is_none()
    );
    // A passkey flow with a state hash is not an OAuth flow.
    let hash = quesar_auth::token_hash("passkey-state");
    sqlx::query(
        "insert into auth_flows (id, kind, state_hash, payload, created_at, expires_at)
         values ('f1', 'passkey_authenticate', $1, '{}', $2, $2)",
    )
    .bind(hash.as_slice())
    .bind(T0 + FLOW_TTL)
    .execute(&db.pool)
    .await
    .unwrap();
    assert!(
        flow::consume(&db.pool, "passkey-state", T0)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}

#[test]
fn the_binding_cookie_has_the_exact_attributes() {
    let binding = quesar_auth::SecretToken::generate();
    assert_eq!(
        flow::binding_cookie(&binding),
        format!(
            "{BINDING_COOKIE}={}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax",
            binding.expose()
        )
    );
    assert_eq!(
        flow::clear_binding_cookie(),
        format!("{BINDING_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax")
    );
    assert_eq!(BINDING_COOKIE, "__Host-quesar.oauth_binding");
}

#[test]
fn the_binding_cookie_is_read_only_when_well_formed() {
    let good = quesar_auth::SecretToken::generate();
    let mut headers = HeaderMap::new();
    headers.insert(
        header::COOKIE,
        HeaderValue::from_str(&format!("a=b; {BINDING_COOKIE}={}; c=d", good.expose())).unwrap(),
    );
    assert_eq!(
        flow::read_binding_cookie(&headers).as_deref(),
        Some(good.expose())
    );
    for bad in [
        "",
        "short",
        &"x".repeat(44),
        &format!("{}!", "x".repeat(42)),
    ] {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            HeaderValue::from_str(&format!("{BINDING_COOKIE}={bad}")).unwrap(),
        );
        assert_eq!(flow::read_binding_cookie(&headers), None, "{bad:?}");
    }
    assert_eq!(flow::read_binding_cookie(&HeaderMap::new()), None);
}

fn posted(code: &str) -> Posted {
    Posted {
        code: Some(code.to_owned()),
        error: None,
        name: Some("Ada Lovelace".to_owned()),
    }
}

#[tokio::test]
async fn an_apple_post_is_parked_once_and_consume_hands_it_back() {
    let db = migrated().await;
    let started = flow::start(&db.pool, ProviderId::Apple, "/console", "/login?x=1", T0)
        .await
        .unwrap();
    let state = started.state.expose();

    let stored = flow::attach_post(&db.pool, state, &posted("first"), T0)
        .await
        .unwrap();
    assert_eq!(stored, Attach::Stored);
    // The second post, whatever it says, does not replace the first.
    let again = flow::attach_post(&db.pool, state, &posted("second"), T0)
        .await
        .unwrap();
    assert_eq!(
        again,
        Attach::AlreadyPosted {
            error_callback: "/login?x=1".to_owned()
        }
    );
    // Parking consumed nothing.
    let count: i64 = sqlx::query_scalar("select count(*) from auth_flows")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    let taken = flow::consume(&db.pool, state, T0).await.unwrap().unwrap();
    let delivered = taken.posted.expect("the parked answer");
    assert_eq!(delivered.code.as_deref(), Some("first"));
    assert_eq!(delivered.name.as_deref(), Some("Ada Lovelace"));
    assert_eq!(delivered.error, None);
    assert!(
        !format!("{delivered:?}").contains("first"),
        "Debug is redacted"
    );
    db.cleanup().await;
}

#[tokio::test]
async fn an_apple_post_needs_a_live_apple_flow() {
    let db = migrated().await;
    // Unknown state.
    assert_eq!(
        flow::attach_post(&db.pool, "no-such-state", &posted("c"), T0)
            .await
            .unwrap(),
        Attach::Unknown
    );
    // A Google flow is not Apple's to fill.
    let google = flow::start(&db.pool, ProviderId::Google, "/c", "/login", T0)
        .await
        .unwrap();
    assert_eq!(
        flow::attach_post(&db.pool, google.state.expose(), &posted("c"), T0)
            .await
            .unwrap(),
        Attach::Unknown
    );
    // Expired on the injected clock: refused at the boundary, with its error path.
    let apple = flow::start(&db.pool, ProviderId::Apple, "/c", "/login?y=2", T0)
        .await
        .unwrap();
    let before = T0 + FLOW_TTL - time::Duration::seconds(1);
    let at = T0 + FLOW_TTL;
    assert_eq!(
        flow::attach_post(&db.pool, apple.state.expose(), &posted("c"), at)
            .await
            .unwrap(),
        Attach::Expired {
            error_callback: "/login?y=2".to_owned()
        }
    );
    assert_eq!(
        flow::attach_post(&db.pool, apple.state.expose(), &posted("c"), before)
            .await
            .unwrap(),
        Attach::Stored
    );
    db.cleanup().await;
}
