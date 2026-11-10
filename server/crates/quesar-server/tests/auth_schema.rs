//! The startup check for the authentication tables.

use std::path::{Path, PathBuf};

use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use quesar_server::auth::{BuildError, check_schema};

#[tokio::test]
async fn an_unmigrated_database_fails_with_the_migrate_command_and_no_sql() {
    let db = TestDatabase::create().await;
    let error = check_schema(&db.pool).await.unwrap_err();
    assert!(matches!(error, BuildError::SchemaMissing));
    let message = error.to_string();
    assert!(message.contains("quesar-server migrate"), "{message}");
    for detail in ["auth_sessions", "relation", "select", "42P01"] {
        assert!(!message.contains(detail), "{detail} leaked: {message}");
    }
    db.cleanup().await;
}

#[tokio::test]
async fn a_migrated_database_passes() {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    check_schema(&db.pool).await.unwrap();
    db.cleanup().await;
}
