//! The passkey core without HTTP: the relying-party configuration, the
//! single-use ceremony row, and the `auth_passkeys` statements. Runs against
//! `TEST_DATABASE_URL`. The ceremonies themselves, with a software
//! authenticator, are tested through the routes in quesar-server.

use std::path::{Path, PathBuf};
use std::time::Duration;

use http::{HeaderMap, HeaderValue, header};
use quesar_auth::passkey::flow::{self, Ceremony};
use quesar_auth::passkey::store::{self, NewPasskey};
use quesar_auth::passkey::{CEREMONY_TTL, NAME_MAX_CHARS, Passkeys};
use quesar_auth::{AuthConfig, new_id};
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use serde_json::json;
use sqlx::{PgPool, Row};
use time::OffsetDateTime;
use time::macros::datetime;
use uuid::Uuid;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

async fn user(pool: &PgPool, email: &str) -> String {
    let id = new_id();
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
           values ($1, 'Synthetic', $2, false, $3, $3)"#,
    )
    .bind(&id)
    .bind(email)
    .bind(T0)
    .execute(pool)
    .await
    .unwrap();
    id
}

fn config(pairs: &[(&str, &str)], production: bool) -> AuthConfig {
    AuthConfig::from_lookup(
        |name| {
            pairs
                .iter()
                .find(|(key, _)| *key == name)
                .map(|(_, value)| (*value).to_owned())
        },
        production,
    )
}

#[test]
fn the_relying_party_follows_the_configured_origin() {
    // Production: the public origin's host.
    let production = config(&[("PUBLIC_ORIGIN", "https://quesar.cloud")], true);
    assert!(Passkeys::new(&production).is_ok());
    // Development: localhost with the three dev origins.
    let development = config(&[], false);
    assert_eq!(development.rp_id, "localhost");
    assert_eq!(development.rp_origins.len(), 3);
    assert!(Passkeys::new(&development).is_ok());
    // An IP address cannot be a relying-party domain: passkeys are off.
    let ip = config(&[("PUBLIC_ORIGIN", "https://203.0.113.5")], true);
    assert!(Passkeys::new(&ip).is_err());
    // An id that is not the origin's domain is refused.
    let mut mismatched = config(&[("PUBLIC_ORIGIN", "https://quesar.cloud")], true);
    mismatched.rp_id = "example.org".to_owned();
    assert!(Passkeys::new(&mismatched).is_err());
    let mut none = production;
    none.rp_origins.clear();
    assert!(Passkeys::new(&none).is_err());
}

#[tokio::test]
async fn a_ceremony_is_taken_once_by_its_owner_and_kind_before_it_expires() {
    let db = migrated().await;
    let owner = user(&db.pool, "owner@example.com").await;
    let other = user(&db.pool, "other@example.com").await;

    let started = flow::start(
        &db.pool,
        Ceremony::Register,
        Some(&owner),
        json!({"k": 1}),
        T0,
    )
    .await
    .unwrap();
    assert_eq!(started.flow_id.len(), 32);
    assert_eq!(started.binding.expose().len(), 43);
    let row =
        sqlx::query("select kind, state_hash, binding_hash, user_id, expires_at from auth_flows")
            .fetch_one(&db.pool)
            .await
            .unwrap();
    assert_eq!(row.get::<String, _>("kind"), "passkey_register");
    assert_eq!(row.get::<Option<Vec<u8>>, _>("state_hash"), None);
    assert_eq!(
        row.get::<Option<Vec<u8>>, _>("binding_hash"),
        Some(started.binding.hash().to_vec()),
        "only the hash is stored"
    );
    assert_eq!(
        row.get::<Option<String>, _>("user_id").as_deref(),
        Some(owner.as_str())
    );
    assert_eq!(
        row.get::<OffsetDateTime, _>("expires_at"),
        T0 + CEREMONY_TTL
    );
    assert_eq!(CEREMONY_TTL, time::Duration::seconds(300));

    // Another user, the sign-in kind, no owner: nothing matches, nothing is taken.
    for (ceremony, user_id) in [
        (Ceremony::Register, Some(other.as_str())),
        (Ceremony::Register, None),
        (Ceremony::Authenticate, Some(owner.as_str())),
        (Ceremony::Authenticate, None),
    ] {
        let taken = flow::consume(&db.pool, ceremony, &started.flow_id, user_id, T0)
            .await
            .unwrap();
        assert!(taken.is_none());
    }
    // The owner takes it, with its payload and a binding that checks.
    let taken = flow::consume(
        &db.pool,
        Ceremony::Register,
        &started.flow_id,
        Some(&owner),
        T0,
    )
    .await
    .unwrap()
    .expect("the owner's flow");
    assert_eq!(taken.payload, json!({"k": 1}));
    assert!(taken.binding_matches(started.binding.expose()));
    assert!(!taken.binding_matches(&"A".repeat(43)));
    assert!(!taken.binding_matches(""));
    // Once.
    assert!(
        flow::consume(
            &db.pool,
            Ceremony::Register,
            &started.flow_id,
            Some(&owner),
            T0
        )
        .await
        .unwrap()
        .is_none()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn expiry_is_judged_on_the_injected_clock_in_the_same_statement() {
    let db = migrated().await;
    for (offset, live) in [(299, true), (300, false), (301, false)] {
        let started = flow::start(&db.pool, Ceremony::Authenticate, None, json!({}), T0)
            .await
            .unwrap();
        let now = T0 + Duration::from_secs(offset);
        let taken = flow::consume(
            &db.pool,
            Ceremony::Authenticate,
            &started.flow_id,
            None,
            now,
        )
        .await
        .unwrap();
        assert_eq!(taken.is_some(), live, "at +{offset} s");
        // Taken or expired, it is gone.
        let left: i64 = sqlx::query_scalar("select count(*) from auth_flows")
            .fetch_one(&db.pool)
            .await
            .unwrap();
        assert_eq!(left, 0, "at +{offset} s");
    }
    db.cleanup().await;
}

#[tokio::test]
async fn two_simultaneous_takes_cannot_both_win() {
    let db = migrated().await;
    let started = flow::start(&db.pool, Ceremony::Authenticate, None, json!({}), T0)
        .await
        .unwrap();
    let take = || flow::consume(&db.pool, Ceremony::Authenticate, &started.flow_id, None, T0);
    let (a, b, c, d) = tokio::join!(take(), take(), take(), take());
    let winners = [a, b, c, d]
        .into_iter()
        .filter(|taken| taken.as_ref().unwrap().is_some())
        .count();
    assert_eq!(winners, 1);
    db.cleanup().await;
}

#[test]
fn the_binding_cookie_is_host_prefixed_http_only_and_read_by_name() {
    let binding = quesar_auth::SecretToken::generate();
    for (ceremony, name) in [
        (Ceremony::Register, "__Host-quesar.passkey_register_binding"),
        (
            Ceremony::Authenticate,
            "__Host-quesar.passkey_authenticate_binding",
        ),
    ] {
        assert_eq!(ceremony.cookie_name(), name);
        let set = flow::binding_cookie(ceremony, &binding);
        assert_eq!(
            set,
            format!(
                "{name}={}; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax",
                binding.expose()
            )
        );
        assert_eq!(
            flow::clear_binding_cookie(ceremony),
            format!("{name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax")
        );
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            HeaderValue::from_str(&format!("a=b; {name}={}", binding.expose())).unwrap(),
        );
        assert_eq!(
            flow::read_binding_cookie(ceremony, &headers).as_deref(),
            Some(binding.expose())
        );
    }
    // The other ceremony's cookie, a short value, and a bad character: absent.
    let mut headers = HeaderMap::new();
    headers.insert(
        header::COOKIE,
        HeaderValue::from_str(&format!(
            "__Host-quesar.passkey_register_binding={}",
            binding.expose()
        ))
        .unwrap(),
    );
    assert!(flow::read_binding_cookie(Ceremony::Authenticate, &headers).is_none());
    for bad in ["short", &format!("{}!", &binding.expose()[1..])] {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            HeaderValue::from_str(&format!("__Host-quesar.passkey_register_binding={bad}"))
                .unwrap(),
        );
        assert!(flow::read_binding_cookie(Ceremony::Register, &headers).is_none());
    }
}

fn new_key<'a>(user_id: &'a str, handle: Uuid, credential_id: &'a [u8]) -> NewPasskey<'a> {
    NewPasskey {
        user_id,
        user_handle: handle,
        credential_id,
        credential: json!({"cred": {"counter": 0}}),
        name: None,
        backup_eligible: false,
        backed_up: false,
    }
}

#[tokio::test]
async fn keys_are_stored_listed_and_deleted_per_user() {
    let db = migrated().await;
    let alice = user(&db.pool, "alice@example.com").await;
    let bob = user(&db.pool, "bob@example.com").await;
    let handle = Uuid::new_v4();

    let mut tx = db.pool.begin().await.unwrap();
    let first = store::insert(&mut tx, new_key(&alice, handle, b"cred-1"), T0)
        .await
        .unwrap()
        .expect("inserted");
    tx.commit().await.unwrap();
    assert_eq!(first.user_handle, handle);
    assert_eq!(first.device_type, "singleDevice");
    assert!(!first.backed_up);

    // A second key of the same user keeps the first handle, whatever is offered.
    let mut tx = db.pool.begin().await.unwrap();
    let second = store::insert(
        &mut tx,
        NewPasskey {
            backup_eligible: true,
            backed_up: true,
            name: Some("Phone".to_owned()),
            ..new_key(&alice, Uuid::new_v4(), b"cred-2")
        },
        T0 + Duration::from_secs(5),
    )
    .await
    .unwrap()
    .expect("inserted");
    tx.commit().await.unwrap();
    assert_eq!(second.user_handle, handle);
    assert_eq!(second.device_type, "multiDevice");
    assert!(second.backed_up);
    assert_eq!(
        store::user_handle(&db.pool, &alice).await.unwrap(),
        Some(handle)
    );
    assert_eq!(store::user_handle(&db.pool, &bob).await.unwrap(), None);

    // A credential id registered once cannot be registered again, by anyone.
    for owner in [&alice, &bob] {
        let mut tx = db.pool.begin().await.unwrap();
        let again = store::insert(&mut tx, new_key(owner, Uuid::new_v4(), b"cred-1"), T0)
            .await
            .unwrap();
        tx.commit().await.unwrap();
        assert!(again.is_none());
    }

    // Per-user views.
    let alices = store::list(&db.pool, &alice).await.unwrap();
    assert_eq!(
        alices.iter().map(|k| k.id.as_str()).collect::<Vec<_>>(),
        [first.id.as_str(), second.id.as_str()],
        "oldest first"
    );
    assert_eq!(
        store::credential_ids(&db.pool, &alice).await.unwrap(),
        [b"cred-1".to_vec(), b"cred-2".to_vec()]
    );
    assert!(store::list(&db.pool, &bob).await.unwrap().is_empty());

    // Another user's id deletes nothing; the owner's deletes one.
    assert!(!store::delete(&db.pool, &bob, &first.id).await.unwrap());
    assert!(!store::delete(&db.pool, &alice, "no-such-id").await.unwrap());
    assert_eq!(store::list(&db.pool, &alice).await.unwrap().len(), 2);
    assert!(store::delete(&db.pool, &alice, &first.id).await.unwrap());
    assert!(!store::delete(&db.pool, &alice, &first.id).await.unwrap());
    assert_eq!(store::list(&db.pool, &alice).await.unwrap().len(), 1);
    db.cleanup().await;
}

#[tokio::test]
async fn using_a_key_stores_the_credential_and_last_use_under_a_row_lock() {
    let db = migrated().await;
    let alice = user(&db.pool, "lock@example.com").await;
    let mut tx = db.pool.begin().await.unwrap();
    let key = store::insert(&mut tx, new_key(&alice, Uuid::new_v4(), b"cred-x"), T0)
        .await
        .unwrap()
        .unwrap();
    tx.commit().await.unwrap();

    assert!(
        store::lock_by_credential_id(&mut db.pool.acquire().await.unwrap(), b"unknown")
            .await
            .unwrap()
            .is_none()
    );
    let mut tx = db.pool.begin().await.unwrap();
    let locked = store::lock_by_credential_id(&mut tx, b"cred-x")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(locked.id, key.id);
    // A second reader of the same key waits for the first transaction.
    let pool = db.pool.clone();
    let waiting = tokio::spawn(async move {
        let mut tx = pool.begin().await.unwrap();
        store::lock_by_credential_id(&mut tx, b"cred-x")
            .await
            .unwrap()
            .unwrap()
            .credential
    });
    store::record_use(
        &mut tx,
        &key.id,
        json!({"cred": {"counter": 7}}),
        true,
        true,
        T0 + Duration::from_secs(9),
    )
    .await
    .unwrap();
    tx.commit().await.unwrap();
    assert_eq!(
        waiting.await.unwrap(),
        json!({"cred": {"counter": 7}}),
        "the second reader saw the committed counter"
    );
    let stored = &store::list(&db.pool, &alice).await.unwrap()[0];
    assert_eq!(stored.device_type, "multiDevice");
    assert!(stored.backed_up);
    assert_eq!(stored.last_used_at, Some(T0 + Duration::from_secs(9)));
    db.cleanup().await;
}

#[test]
fn names_are_trimmed_blank_is_none_and_the_cap_counts_characters() {
    assert_eq!(store::clean_name(None), None);
    assert_eq!(store::clean_name(Some("")), None);
    assert_eq!(store::clean_name(Some(" \t\n ")), None);
    assert_eq!(
        store::clean_name(Some("  Work laptop ")).as_deref(),
        Some("Work laptop")
    );
    let exact = "a".repeat(NAME_MAX_CHARS);
    assert_eq!(
        store::clean_name(Some(&exact)).as_deref(),
        Some(exact.as_str())
    );
    let long = "日".repeat(NAME_MAX_CHARS + 20);
    assert_eq!(
        store::clean_name(Some(&long)).unwrap().chars().count(),
        NAME_MAX_CHARS
    );
    assert_eq!(NAME_MAX_CHARS, 80);
    assert_eq!(store::device_type(true), "multiDevice");
    assert_eq!(store::device_type(false), "singleDevice");
}
