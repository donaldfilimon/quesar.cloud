//! The authentication core of the quesar.cloud server.
//!
//! Framework-free (no axum), so everything here is testable with only a
//! database. This task provides the foundation: identifiers, secret tokens, an
//! injectable clock, the row types over migration `0010_rust_auth.sql` and the
//! configuration read from the environment.

pub mod clock;
pub mod config;
pub mod error;
pub mod ids;
pub mod rows;
pub mod token;

pub use clock::{Clock, FixedClock, SystemClock};
pub use config::{
    AdminEmails, AppleConfig, AuthConfig, ClientSecret, OAuthClient, ProviderEndpoints, Providers,
};
pub use error::AuthError;
pub use ids::new_id;
pub use rows::{AccountRow, FlowRow, PasskeyRow, SessionRow, UserRow};
pub use token::{SecretToken, token_hash};
