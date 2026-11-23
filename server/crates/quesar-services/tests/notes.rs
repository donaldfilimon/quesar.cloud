//! Field note writes and account deletion share a lock on the owning user.

use std::path::Path;
use std::time::Duration;

use quesar_auth::deletion::{DeletionHooks, purge_and_delete};
use quesar_db::test_support::TestDatabase;
use quesar_services::notes;
use sqlx::PgPool;
use time::OffsetDateTime;

const USER: &str = "notes-owner";

async fn database() -> TestDatabase {
    let db = TestDatabase::create().await;
    let migrations = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    quesar_db::migrate(&db.pool, &migrations).await.unwrap();
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified")
           values ($1, 'Note Owner', 'note-owner@example.test', true)"#,
    )
    .bind(USER)
    .execute(&db.pool)
    .await
    .unwrap();
    db
}

async fn wait_for_lock(pool: &PgPool, statement: &str) {
    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            let blocked: bool = sqlx::query_scalar(
                "select exists (
                   select from pg_stat_activity
                   where datname = current_database() and wait_event_type = 'Lock'
                     and query like $1
                )",
            )
            .bind(format!("%{statement}%"))
            .fetch_one(pool)
            .await
            .unwrap();
            if blocked {
                return;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("the competing transaction should wait on the user row");
}

#[tokio::test]
async fn note_addition_waits_for_account_deletion_and_leaves_no_orphan() {
    let db = database().await;
    let mut deletion = db.pool.begin().await.unwrap();
    sqlx::query(r#"select id from "user" where id = $1 for update"#)
        .bind(USER)
        .fetch_one(&mut *deletion)
        .await
        .unwrap();

    let pool = db.pool.clone();
    let addition = tokio::spawn(async move {
        let mut writer = pool.begin().await.unwrap();
        let added = notes::add(
            &mut writer,
            USER,
            "abi",
            "Field note",
            OffsetDateTime::UNIX_EPOCH,
        )
        .await
        .unwrap();
        writer.commit().await.unwrap();
        added
    });

    wait_for_lock(&db.pool, "for share").await;
    sqlx::query(r#"delete from "user" where id = $1"#)
        .bind(USER)
        .execute(&mut *deletion)
        .await
        .unwrap();
    deletion.commit().await.unwrap();
    assert!(!addition.await.unwrap());
    assert!(notes::list(&db.pool, USER).await.unwrap().is_empty());
    db.cleanup().await;
}

#[tokio::test]
async fn account_deletion_waits_for_note_addition_and_purges_the_committed_note() {
    let db = database().await;
    let mut writer = db.pool.begin().await.unwrap();
    assert!(
        notes::add(
            &mut writer,
            USER,
            "abi",
            "Field note",
            OffsetDateTime::UNIX_EPOCH
        )
        .await
        .unwrap()
    );

    let pool = db.pool.clone();
    let purge = tokio::spawn(async move {
        let hooks = DeletionHooks::defaults(std::iter::empty::<(&str, &str)>());
        purge_and_delete(&pool, USER, &hooks).await.unwrap()
    });

    wait_for_lock(&db.pool, "for update").await;
    writer.commit().await.unwrap();
    let report = purge.await.unwrap();
    assert_eq!(report.deleted.field_notes, 1);
    assert!(notes::list(&db.pool, USER).await.unwrap().is_empty());
    db.cleanup().await;
}
