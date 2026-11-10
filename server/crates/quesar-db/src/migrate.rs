//! The migration runner. `scripts/migrate.ts` is the spec; the two must stay
//! interchangeable on one database:
//!
//! - applied files are recorded by file name in `_migrations (name, applied_at)`;
//! - the session advisory lock is `pg_advisory_lock(716483, 1)`, held on one
//!   connection from before the table is read until after the last file;
//! - each file runs in a transaction together with its bookkeeping row.

use std::path::{Path, PathBuf};

use sqlx::postgres::PgConnection;
use sqlx::{Connection, PgPool, Row};

/// The two-integer advisory lock key `scripts/migrate.ts` takes.
const LOCK_KEY: (i32, i32) = (716_483, 1);

#[derive(Debug)]
pub enum MigrateError {
    ReadDir {
        dir: PathBuf,
        source: std::io::Error,
    },
    ReadFile {
        name: String,
        source: std::io::Error,
    },
    /// Bookkeeping or locking failed, not a migration file.
    Database(sqlx::Error),
    /// The named file failed; nothing of it was recorded.
    Apply { name: String, source: sqlx::Error },
}

impl std::fmt::Display for MigrateError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ReadDir { dir, source } => {
                write!(
                    f,
                    "cannot read migrations directory {}: {source}",
                    dir.display()
                )
            }
            Self::ReadFile { name, source } => write!(f, "cannot read migration {name}: {source}"),
            // The driver's message can quote SQL, so only the SQLSTATE is shown;
            // the full error stays reachable through `source()`.
            Self::Database(source) => {
                write!(f, "migration bookkeeping failed{}", sqlstate(source))
            }
            Self::Apply { name, source } => {
                write!(f, "error applying {name}{}", sqlstate(source))
            }
        }
    }
}

/// ` (SQLSTATE 42P01)` when the database reported a code, else nothing.
fn sqlstate(error: &sqlx::Error) -> String {
    error
        .as_database_error()
        .and_then(|database| database.code())
        .map_or_else(String::new, |code| format!(" (SQLSTATE {code})"))
}

impl std::error::Error for MigrateError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::ReadDir { source, .. } | Self::ReadFile { source, .. } => Some(source),
            Self::Database(source) | Self::Apply { source, .. } => Some(source),
        }
    }
}

impl From<sqlx::Error> for MigrateError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error)
    }
}

/// Applies the pending `*.sql` files directly in `dir` (subdirectories such as
/// `migrations/auth/` are ignored) and returns their names in apply order.
pub async fn migrate(pool: &PgPool, dir: &Path) -> Result<Vec<String>, MigrateError> {
    // Detached, so this connection is never pooled: if the future is dropped
    // while the session lock is held (a timeout, shutdown), dropping the
    // connection closes it and Postgres releases the lock with the session.
    // Any other advisory-lock holder should do the same.
    let mut connection = pool.acquire().await?.detach();
    // Session lock: lives on this exact connection through discovery and recording.
    sqlx::query("SELECT pg_advisory_lock($1, $2)")
        .bind(LOCK_KEY.0)
        .bind(LOCK_KEY.1)
        .execute(&mut connection)
        .await?;
    let outcome = apply_pending(&mut connection, dir).await;
    let unlocked = sqlx::query("SELECT pg_advisory_unlock($1, $2)")
        .bind(LOCK_KEY.0)
        .bind(LOCK_KEY.1)
        .execute(&mut connection)
        .await;
    // Closing ends the session, which releases the lock even if unlocking failed.
    // A failure to close adds nothing: the connection is gone either way.
    let _ = connection.close().await;
    let applied = outcome?;
    unlocked?;
    Ok(applied)
}

async fn apply_pending(
    connection: &mut PgConnection,
    dir: &Path,
) -> Result<Vec<String>, MigrateError> {
    let files = list_migrations(dir).await?;
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    )
    .execute(&mut *connection)
    .await?;
    let done: Vec<String> = sqlx::query("SELECT name FROM _migrations")
        .fetch_all(&mut *connection)
        .await?
        .iter()
        .map(|row| row.get::<String, _>("name"))
        .collect();

    let mut applied = Vec::new();
    for name in files.into_iter().filter(|name| !done.contains(name)) {
        let text = tokio::fs::read_to_string(dir.join(&name))
            .await
            .map_err(|source| MigrateError::ReadFile {
                name: name.clone(),
                source,
            })?;
        apply_one(connection, &name, &text)
            .await
            .map_err(|source| MigrateError::Apply {
                name: name.clone(),
                source,
            })?;
        tracing::info!(migration = %name, "applied migration");
        applied.push(name);
    }
    Ok(applied)
}

/// One file and its bookkeeping row in one transaction. Dropping the
/// transaction on error rolls it back.
async fn apply_one(
    connection: &mut PgConnection,
    name: &str,
    text: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = sqlx::Connection::begin(&mut *connection).await?;
    // `raw_sql` uses the simple-query protocol, which runs a multi-statement file whole.
    sqlx::raw_sql(text).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO _migrations (name) VALUES ($1)")
        .bind(name)
        .execute(&mut *tx)
        .await?;
    tx.commit().await
}

/// File names ending in `.sql`, directly in `dir`, sorted by name.
async fn list_migrations(dir: &Path) -> Result<Vec<String>, MigrateError> {
    let read_dir_error = |source| MigrateError::ReadDir {
        dir: dir.to_path_buf(),
        source,
    };
    let mut entries = tokio::fs::read_dir(dir).await.map_err(read_dir_error)?;
    let mut names = Vec::new();
    while let Some(entry) = entries.next_entry().await.map_err(read_dir_error)? {
        // `metadata` follows symlinks (unlike `DirEntry::file_type`), so a
        // symlinked .sql file counts; a dangling link or a link to a directory does not.
        let is_file = tokio::fs::metadata(entry.path())
            .await
            .map(|metadata| metadata.is_file())
            .unwrap_or(false);
        if let Ok(name) = entry.file_name().into_string()
            && is_file
            && name.ends_with(".sql")
        {
            names.push(name);
        }
    }
    names.sort();
    Ok(names)
}
