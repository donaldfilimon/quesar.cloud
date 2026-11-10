//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};

use quesar_db::test_support::TestDatabase;
use quesar_db::{MigrateError, PgPool, migrate};
use sqlx::Row;

fn repo_migrations() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations")
}

fn sql_names(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir(dir)
        .unwrap()
        .map(|entry| entry.unwrap())
        .filter(|entry| entry.file_type().unwrap().is_file())
        .map(|entry| entry.file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".sql"))
        .collect();
    names.sort();
    names
}

async fn recorded(pool: &PgPool) -> Vec<String> {
    sqlx::query("SELECT name FROM _migrations ORDER BY name")
        .fetch_all(pool)
        .await
        .unwrap()
        .iter()
        .map(|row| row.get("name"))
        .collect()
}

#[tokio::test]
async fn applies_the_repository_migrations_to_an_empty_database() {
    let db = TestDatabase::create().await;
    let expected = sql_names(&repo_migrations());
    assert!(expected.len() >= 9);

    let applied = migrate(&db.pool, &repo_migrations()).await.unwrap();
    assert_eq!(applied, expected);

    for table in ["user", "session", "rate_limits", "field_notes"] {
        let found: bool = sqlx::query_scalar("SELECT to_regclass($1) IS NOT NULL")
            .bind(format!("public.\"{table}\""))
            .fetch_one(&db.pool)
            .await
            .unwrap();
        assert!(found, "table {table} should exist");
    }
    assert_eq!(recorded(&db.pool).await, expected);
    db.cleanup().await;
}

#[tokio::test]
async fn a_second_run_applies_nothing() {
    let db = TestDatabase::create().await;
    migrate(&db.pool, &repo_migrations()).await.unwrap();
    let again = migrate(&db.pool, &repo_migrations()).await.unwrap();
    assert!(again.is_empty());
    db.cleanup().await;
}

#[tokio::test]
async fn a_failing_file_stops_the_run_and_is_not_recorded() {
    let db = TestDatabase::create().await;
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("0001_ok.sql"),
        "CREATE TABLE ok_table (id INT);",
    )
    .unwrap();
    // The first statement succeeds; the transaction must still roll it back.
    std::fs::write(
        dir.path().join("0002_bad.sql"),
        "CREATE TABLE half_table (id INT); SELECT * FROM missing_table;",
    )
    .unwrap();
    std::fs::write(
        dir.path().join("0003_never.sql"),
        "CREATE TABLE never_table (id INT);",
    )
    .unwrap();

    let error = migrate(&db.pool, dir.path()).await.unwrap_err();
    assert!(matches!(&error, MigrateError::Apply { name, .. } if name == "0002_bad.sql"));
    assert!(error.to_string().contains("0002_bad.sql"));
    assert_eq!(recorded(&db.pool).await, ["0001_ok.sql"]);
    for table in ["half_table", "never_table"] {
        let found: bool = sqlx::query_scalar("SELECT to_regclass($1) IS NOT NULL")
            .bind(table)
            .fetch_one(&db.pool)
            .await
            .unwrap();
        assert!(!found, "{table} must not exist");
    }
    // The advisory lock was released: a fixed directory now migrates on the same pool.
    std::fs::write(
        dir.path().join("0002_bad.sql"),
        "CREATE TABLE fixed_table (id INT);",
    )
    .unwrap();
    let applied = migrate(&db.pool, dir.path()).await.unwrap();
    assert_eq!(applied, ["0002_bad.sql", "0003_never.sql"]);
    db.cleanup().await;
}

#[tokio::test]
async fn concurrent_runs_apply_each_file_once() {
    let db = TestDatabase::create().await;
    let dir = repo_migrations();
    let (first, second) = tokio::join!(migrate(&db.pool, &dir), migrate(&db.pool, &dir));
    let (first, second) = (first.unwrap(), second.unwrap());

    let expected = sql_names(&dir);
    let mut together: Vec<String> = first.iter().chain(second.iter()).cloned().collect();
    together.sort();
    assert_eq!(together, expected, "each file applied by exactly one run");
    assert_eq!(recorded(&db.pool).await, expected);
    db.cleanup().await;
}

#[tokio::test]
async fn subdirectories_and_other_files_are_ignored() {
    let db = TestDatabase::create().await;
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("0001_top.sql"),
        "CREATE TABLE top_table (id INT);",
    )
    .unwrap();
    std::fs::write(dir.path().join("notes.txt"), "not sql").unwrap();
    std::fs::create_dir(dir.path().join("auth")).unwrap();
    std::fs::write(
        dir.path().join("auth/0002_nested.sql"),
        "CREATE TABLE nested_table (id INT);",
    )
    .unwrap();

    let applied = migrate(&db.pool, dir.path()).await.unwrap();
    assert_eq!(applied, ["0001_top.sql"]);
    db.cleanup().await;
}

#[tokio::test]
async fn a_missing_directory_is_an_error_and_releases_the_lock() {
    let db = TestDatabase::create().await;
    let error = migrate(&db.pool, Path::new("/nonexistent/migrations"))
        .await
        .unwrap_err();
    assert!(matches!(error, MigrateError::ReadDir { .. }));
    let dir = tempfile::tempdir().unwrap();
    assert!(migrate(&db.pool, dir.path()).await.unwrap().is_empty());
    db.cleanup().await;
}
