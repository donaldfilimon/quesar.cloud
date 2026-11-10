//! A throwaway database per test, so tests run in parallel without sharing state.
//!
//! Enable with `features = ["test-support"]` in a dev-dependency. The server
//! comes from `TEST_DATABASE_URL`; start one with `scripts/dev-postgres.sh start`.

use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::postgres::PgConnectOptions;
use sqlx::{Connection, PgConnection, PgPool};

static COUNTER: AtomicU32 = AtomicU32::new(0);

fn admin_options() -> PgConnectOptions {
    let Ok(url) = std::env::var("TEST_DATABASE_URL") else {
        panic!(
            "TEST_DATABASE_URL is not set. Run `scripts/dev-postgres.sh start` and export the URL it prints."
        );
    };
    match url.trim().parse() {
        Ok(options) => options,
        Err(_) => panic!("TEST_DATABASE_URL is not a valid Postgres URL"),
    }
}

/// A freshly created, uniquely named database. Call `cleanup` at the end of
/// the test; if the test panics first, `Drop` removes it instead.
pub struct TestDatabase {
    pub pool: PgPool,
    name: String,
    admin: PgConnectOptions,
    cleaned: bool,
}

impl TestDatabase {
    /// Panics (failing the test) if `TEST_DATABASE_URL` is unset or unreachable.
    pub async fn create() -> Self {
        let admin = admin_options();
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.as_nanos());
        let name = format!(
            "quesar_test_{}_{}_{nanos}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        );
        let mut connection = PgConnection::connect_with(&admin)
            .await
            .unwrap_or_else(|error| panic!("cannot reach TEST_DATABASE_URL: {error}"));
        sqlx::query(&format!("CREATE DATABASE \"{name}\""))
            .execute(&mut connection)
            .await
            .unwrap_or_else(|error| panic!("cannot create {name}: {error}"));
        let pool = crate::connect_with(admin.clone().database(&name))
            .await
            .unwrap_or_else(|error| panic!("cannot connect to {name}: {error}"));
        Self {
            pool,
            name,
            admin,
            cleaned: false,
        }
    }

    /// Closes the pool and drops the database.
    pub async fn cleanup(mut self) {
        self.pool.close().await;
        drop_database(&self.admin, &self.name).await;
        self.cleaned = true;
    }
}

impl Drop for TestDatabase {
    fn drop(&mut self) {
        if self.cleaned {
            return;
        }
        // Reached when a test panicked before `cleanup`. A separate thread with
        // its own runtime, because this may run inside a runtime being torn down.
        let (admin, name) = (self.admin.clone(), self.name.clone());
        let _ = std::thread::spawn(move || {
            if let Ok(runtime) = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
            {
                runtime.block_on(drop_database(&admin, &name));
            }
        })
        .join();
    }
}

async fn drop_database(admin: &PgConnectOptions, name: &str) {
    if let Ok(mut connection) = PgConnection::connect_with(admin).await {
        let _ = sqlx::query(&format!("DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)"))
            .execute(&mut connection)
            .await;
    }
}
