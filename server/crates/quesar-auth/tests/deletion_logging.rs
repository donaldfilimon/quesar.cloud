//! A failed workspace revocation is logged by provider name and never with a
//! token. This is the only test in the binary because it installs a global
//! subscriber: a scoped one would race other tests for the cached interest of
//! the shared `warn!` callsite.
//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use quesar_auth::deletion::{
    BoxFuture, DeletionHooks, WdbxConfigGuard, WorkspaceRevoker, purge_and_delete,
};
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;

const SEALED: &str = "v1.x.y.z";

struct FailingRevoker;

impl WorkspaceRevoker for FailingRevoker {
    fn revoke<'a>(&'a self, _user_id: &'a str, _provider: &'a str) -> BoxFuture<'a, bool> {
        Box::pin(async { false })
    }
}

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl std::io::Write for Captured {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl<'a> tracing_subscriber::fmt::MakeWriter<'a> for Captured {
    type Writer = Captured;

    fn make_writer(&'a self) -> Self::Writer {
        self.clone()
    }
}

#[tokio::test]
async fn a_failed_revocation_is_logged_by_provider_without_any_token() {
    let captured = Captured::default();
    tracing::subscriber::set_global_default(
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::TRACE)
            .with_writer(captured.clone())
            .finish(),
    )
    .unwrap();

    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('victim', 'N', 'v@example.com', true)"#,
    )
    .execute(&db.pool)
    .await
    .unwrap();
    sqlx::query(
        "insert into workspace_connections (user_id, provider, sealed) values ('victim', 'google', $1)",
    )
    .bind(SEALED)
    .execute(&db.pool)
    .await
    .unwrap();
    let hooks = DeletionHooks {
        commerce: Arc::new(WdbxConfigGuard::default()),
        workspace: Arc::new(FailingRevoker),
    };

    let report = purge_and_delete(&db.pool, "victim", &hooks).await.unwrap();

    assert!(!report.workspace[0].revoked);
    let users: i64 = sqlx::query_scalar(r#"select count(*) from "user" where id = 'victim'"#)
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(users, 0);
    let connections: i64 = sqlx::query_scalar("select count(*) from workspace_connections")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(connections, 0);
    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(log.contains("WARN"), "{log}");
    assert!(log.contains("google"), "{log}");
    assert!(!log.contains(SEALED), "{log}");
    db.cleanup().await;
}
