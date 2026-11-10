use std::time::Duration;

use sqlx::PgPool;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};

/// Enough for one process behind a reverse proxy; a runaway handler cannot
/// exhaust the database's connection slots.
const MAX_CONNECTIONS: u32 = 10;
/// A request waiting longer than this for a connection fails instead of hanging.
const ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug)]
pub enum DbError {
    /// The URL did not parse. Carries no detail: the text may hold a password.
    InvalidUrl,
    Connect(sqlx::Error),
}

impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidUrl => f.write_str("DATABASE_URL is not a valid Postgres URL"),
            Self::Connect(_) => f.write_str("could not connect to the database"),
        }
    }
}

impl std::error::Error for DbError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::InvalidUrl => None,
            Self::Connect(error) => Some(error),
        }
    }
}

/// Opens the pool, failing now if the database cannot be reached.
pub async fn connect(database_url: &str) -> Result<PgPool, DbError> {
    let options = database_url
        .parse::<PgConnectOptions>()
        .map_err(|_| DbError::InvalidUrl)?;
    connect_with(options).await
}

/// `connect` for callers that already hold parsed options.
pub async fn connect_with(options: PgConnectOptions) -> Result<PgPool, DbError> {
    PgPoolOptions::new()
        .max_connections(MAX_CONNECTIONS)
        .acquire_timeout(ACQUIRE_TIMEOUT)
        .connect_with(options)
        .await
        .map_err(DbError::Connect)
}
