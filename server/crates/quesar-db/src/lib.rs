//! Postgres access for the quesar.cloud server.
//!
//! `connect` opens the bounded pool and `migrate` applies `migrations/*.sql`
//! exactly as `scripts/migrate.ts` does, so either runner can follow the other
//! on the same database.

mod migrate;
mod pool;
#[cfg(feature = "test-support")]
pub mod test_support;

pub use migrate::{MigrateError, migrate};
pub use pool::{DbError, connect, connect_with};
pub use sqlx::PgPool;
