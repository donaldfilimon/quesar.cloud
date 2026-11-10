//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};

use quesar_auth::{AccountRow, FlowRow, PasskeyRow, SessionRow, UserRow};
use quesar_db::test_support::TestDatabase;
use quesar_db::{PgPool, migrate};
use sqlx::Row;

fn repo_migrations() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations")
}

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    migrate(&db.pool, &repo_migrations())
        .await
        .expect("migrate");
    db
}

async fn insert_user(pool: &PgPool, id: &str) {
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ($1, 'N', $2, false)"#,
    )
    .bind(id)
    .bind(format!("{id}@example.com"))
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_session(pool: &PgPool, id: &str, user: &str, hash: u8) {
    sqlx::query(
        "insert into auth_sessions (id, user_id, token_hash, created_at, updated_at, expires_at)
         values ($1, $2, $3, now(), now(), now() + interval '1 day')",
    )
    .bind(id)
    .bind(user)
    .bind(vec![hash; 32])
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_passkey(
    pool: &PgPool,
    id: &str,
    user: &str,
    device_type: &str,
) -> sqlx::Result<()> {
    sqlx::query(
        "insert into auth_passkeys (id, user_id, user_handle, credential_id, credential, device_type, backed_up, created_at)
         values ($1, $2, '00000000-0000-4000-8000-000000000001', $3, '{}'::jsonb, $4, false, now())",
    )
    .bind(id)
    .bind(user)
    .bind(id.as_bytes().to_vec())
    .bind(device_type)
    .execute(pool)
    .await
    .map(|_| ())
}

async fn insert_flow(pool: &PgPool, id: &str, kind: &str, user: Option<&str>) -> sqlx::Result<()> {
    sqlx::query(
        "insert into auth_flows (id, kind, user_id, payload, created_at, expires_at)
         values ($1, $2, $3, '{\"k\":1}'::jsonb, now(), now() + interval '10 minutes')",
    )
    .bind(id)
    .bind(kind)
    .bind(user)
    .execute(pool)
    .await
    .map(|_| ())
}

async fn count(pool: &PgPool, table: &str) -> i64 {
    sqlx::query(&format!("select count(*) as n from {table}"))
        .fetch_one(pool)
        .await
        .unwrap()
        .get("n")
}

#[tokio::test]
async fn migration_0010_applies_and_leaves_better_auth_tables_alone() {
    let db = migrated().await;
    let columns = |table: &'static str| {
        let pool = db.pool.clone();
        async move {
            sqlx::query("select column_name from information_schema.columns where table_name = $1")
                .bind(table)
                .fetch_all(&pool)
                .await
                .unwrap()
                .iter()
                .map(|r| r.get::<String, _>("column_name"))
                .collect::<Vec<_>>()
        }
    };
    assert!(columns("session").await.contains(&"token".to_owned()));
    assert!(!columns("verification").await.is_empty());
    assert!(columns("passkey").await.contains(&"publicKey".to_owned()));
    for table in ["auth_sessions", "auth_passkeys", "auth_flows"] {
        assert!(!columns(table).await.is_empty(), "{table} missing");
    }
    db.cleanup().await;
}

#[tokio::test]
async fn deleting_a_user_cascades_to_the_auth_tables() {
    let db = migrated().await;
    let pool = &db.pool;
    insert_user(pool, "u1").await;
    insert_user(pool, "u2").await;
    insert_session(pool, "s1", "u1", 1).await;
    insert_session(pool, "s2", "u2", 2).await;
    insert_passkey(pool, "p1", "u1", "multiDevice")
        .await
        .unwrap();
    insert_flow(pool, "f1", "passkey_register", Some("u1"))
        .await
        .unwrap();
    insert_flow(pool, "f2", "oauth", None).await.unwrap();

    sqlx::query(r#"delete from "user" where id = 'u1'"#)
        .execute(pool)
        .await
        .unwrap();

    assert_eq!(count(pool, "auth_sessions").await, 1);
    assert_eq!(count(pool, "auth_passkeys").await, 0);
    assert_eq!(count(pool, "auth_flows").await, 1);
    db.cleanup().await;
}

#[tokio::test]
async fn check_constraints_refuse_unknown_values() {
    let db = migrated().await;
    let pool = &db.pool;
    insert_user(pool, "u1").await;
    assert!(insert_flow(pool, "bad", "magic_link", None).await.is_err());
    assert!(insert_passkey(pool, "bad", "u1", "tablet").await.is_err());
    for kind in ["oauth", "passkey_register", "passkey_authenticate"] {
        insert_flow(pool, kind, kind, None).await.unwrap();
    }
    insert_passkey(pool, "ok", "u1", "singleDevice")
        .await
        .unwrap();
    db.cleanup().await;
}

#[tokio::test]
async fn row_types_decode_what_the_tables_hold() {
    let db = migrated().await;
    let pool = &db.pool;
    insert_user(pool, "u1").await;
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", password, "updatedAt")
           values ('a1', 'u1', 'credential', 'u1', 'hash-value', now())"#,
    )
    .execute(pool)
    .await
    .unwrap();
    insert_session(pool, "s1", "u1", 7).await;
    insert_passkey(pool, "p1", "u1", "singleDevice")
        .await
        .unwrap();
    insert_flow(pool, "f1", "oauth", None).await.unwrap();

    let user: UserRow = sqlx::query_as(r#"select * from "user" where id = 'u1'"#)
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(user.email, "u1@example.com");
    assert!(!user.email_verified);
    let account: AccountRow = sqlx::query_as(
        r#"select id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt" from "account""#,
    )
    .fetch_one(pool)
    .await
    .unwrap();
    assert_eq!(account.provider_id, "credential");
    assert!(!format!("{account:?}").contains("hash-value"));
    let session: SessionRow = sqlx::query_as("select * from auth_sessions")
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(session.token_hash, vec![7u8; 32]);
    let passkey: PasskeyRow = sqlx::query_as("select * from auth_passkeys")
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(passkey.device_type, "singleDevice");
    let flow: FlowRow = sqlx::query_as("select * from auth_flows")
        .fetch_one(pool)
        .await
        .unwrap();
    assert_eq!(flow.payload["k"], 1);
    assert!(!format!("{flow:?}").contains("\"k\""));
    db.cleanup().await;
}
