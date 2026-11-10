//! The authentication core of the quesar.cloud server.
//!
//! Framework-free (no axum), so everything here is testable with only a
//! database. This task provides the foundation: identifiers, secret tokens, an
//! injectable clock, the row types over migration `0010_rust_auth.sql` and the
//! configuration read from the environment.

pub mod admin;
pub mod clock;
pub mod config;
pub mod deletion;
pub mod email_password;
pub mod error;
pub mod ids;
pub mod oauth;
pub mod password;
pub mod providers;
pub mod rows;
pub mod session;
pub mod token;
pub mod validate;

#[cfg(feature = "test-support")]
#[path = "../tests/support/mock_idp.rs"]
pub mod mock_idp;

pub use clock::{Clock, FixedClock, SystemClock};
pub use config::{
    AdminEmails, AppleConfig, AuthConfig, ClientSecret, OAuthClient, ProviderEndpoints, Providers,
};
pub use error::AuthError;
pub use ids::new_id;
pub use rows::{AccountRow, FlowRow, PasskeyRow, SessionRow, UserRow};
pub use token::{SecretToken, token_hash};
