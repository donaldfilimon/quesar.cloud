//! One module per identity provider: its authorization URL and the exchange of
//! an authorization code for a verified [`Identity`](crate::oauth::provider::Identity).

pub mod apple;
pub mod google;
pub mod twitter;

use crate::oauth::jwks::JwksCache;

/// What a code exchange needs besides the provider's own configuration.
pub struct Deps<'a> {
    /// The shared client: no redirects, 10 s timeout.
    pub http: &'a reqwest::Client,
    pub jwks: &'a JwksCache,
    /// Plain http endpoints are allowed (development and the mock provider),
    /// never in production.
    pub allow_http: bool,
}
