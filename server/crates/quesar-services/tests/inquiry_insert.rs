//! `quesar_services::inquiries::insert` and the lock it takes on the user row.
//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};

use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use quesar_services::inquiries::{ValidInquiry, insert};
use sqlx::{PgPool, Row};

async fn database() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.unwrap();
    db
}

fn inquiry(name: &str) -> ValidInquiry {
    ValidInquiry {
        name: name.into(),
        email: "ada@example.com".into(),
        company: "Acme".into(),
        topic: "Services",
        message: "A message that is long enough.".into(),
    }
}

async fn add_user(pool: &PgPool, id: &str) {
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ($1, $1, $1 || '@example.com', true)"#,
    )
    .bind(id)
    .execute(pool)
    .await
    .unwrap();
}

async fn rows(pool: &PgPool) -> Vec<(Option<String>, String, String, String, String, String)> {
    sqlx::query(
        "select user_id, name, email, company, project_type, message from inquiries order by id",
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .iter()
    .map(|r| (r.get(0), r.get(1), r.get(2), r.get(3), r.get(4), r.get(5)))
    .collect()
}

/// The SQLSTATE of a failed `select … nowait`.
async fn nowait_code(pool: &PgPool, mode: &str, id: &str) -> Option<String> {
    let mut tx = pool.begin().await.unwrap();
    let outcome = sqlx::query(&format!(
        r#"select id from "user" where id = $1 for {mode} nowait"#
    ))
    .bind(id)
    .fetch_optional(&mut *tx)
    .await;
    match outcome {
        Ok(_) => None,
        Err(sqlx::Error::Database(error)) => error.code().map(|code| code.into_owned()),
        Err(other) => panic!("unexpected error: {other}"),
    }
}

#[tokio::test]
async fn anonymous_stores_null_and_the_topic_goes_to_project_type() {
    let db = database().await;
    let mut conn = db.pool.acquire().await.unwrap();
    insert(&mut conn, None, &inquiry("Ada")).await.unwrap();
    drop(conn);
    assert_eq!(
        rows(&db.pool).await,
        vec![(
            None,
            "Ada".into(),
            "ada@example.com".into(),
            "Acme".into(),
            "Services".into(),
            "A message that is long enough.".into()
        )]
    );
    db.cleanup().await;
}

#[tokio::test]
async fn a_known_user_is_linked_and_a_missing_one_stores_null() {
    let db = database().await;
    add_user(&db.pool, "u1").await;
    let mut conn = db.pool.acquire().await.unwrap();
    insert(&mut conn, Some("u1"), &inquiry("Linked"))
        .await
        .unwrap();
    insert(&mut conn, Some("ghost"), &inquiry("Orphan"))
        .await
        .unwrap();
    drop(conn);
    let stored = rows(&db.pool).await;
    assert_eq!(stored[0].0.as_deref(), Some("u1"));
    assert_eq!(stored[1].0, None);
    db.cleanup().await;
}

#[tokio::test]
async fn a_failed_insert_leaves_nothing_and_reports_the_error() {
    let db = database().await;
    let mut tx = db.pool.begin().await.unwrap();
    // PostgreSQL text cannot hold U+0000.
    let error = insert(&mut tx, None, &inquiry("Ada\u{0}Lovelace")).await;
    assert!(error.is_err());
    drop(tx);
    assert!(rows(&db.pool).await.is_empty());
    db.cleanup().await;
}

#[tokio::test]
async fn the_writer_holds_a_share_lock_that_conflicts_with_the_purge() {
    let db = database().await;
    add_user(&db.pool, "u1").await;
    let mut writer = db.pool.begin().await.unwrap();
    insert(&mut writer, Some("u1"), &inquiry("Held"))
        .await
        .unwrap();

    // The purge's `for update` cannot be taken while the writer's transaction
    // is open (55P03 lock_not_available), another writer's `for share` can.
    assert_eq!(
        nowait_code(&db.pool, "update", "u1").await.as_deref(),
        Some("55P03")
    );
    assert_eq!(nowait_code(&db.pool, "share", "u1").await, None);

    writer.commit().await.unwrap();
    assert_eq!(nowait_code(&db.pool, "update", "u1").await, None);
    db.cleanup().await;
}

#[tokio::test]
async fn the_purge_lock_conflicts_with_a_writer() {
    let db = database().await;
    add_user(&db.pool, "u1").await;
    let mut purge = db.pool.begin().await.unwrap();
    sqlx::query(r#"select id from "user" where id = $1 for update"#)
        .bind("u1")
        .fetch_optional(&mut *purge)
        .await
        .unwrap();
    assert_eq!(
        nowait_code(&db.pool, "share", "u1").await.as_deref(),
        Some("55P03")
    );
    purge.rollback().await.unwrap();
    assert_eq!(nowait_code(&db.pool, "share", "u1").await, None);
    db.cleanup().await;
}
