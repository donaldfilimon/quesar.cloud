//! What every provider shares: its name, the identity it asserts and the ways
//! an exchange can fail.

use std::fmt;

use crate::config::{AuthConfig, LOCAL_DEV_ORIGINS};
use crate::oauth::http::HttpError;
use crate::oauth::id_token::IdTokenError;
use crate::oauth::jwks::JwksError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ProviderId {
    Google,
    Apple,
    Twitter,
}

impl ProviderId {
    /// The `"account"."providerId"` value and the path segment.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Google => "google",
            Self::Apple => "apple",
            Self::Twitter => "twitter",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "google" => Some(Self::Google),
            "apple" => Some(Self::Apple),
            "twitter" => Some(Self::Twitter),
            _ => None,
        }
    }

    /// Providers that sign an ID token carrying a nonce.
    pub fn uses_nonce(self) -> bool {
        matches!(self, Self::Google | Self::Apple)
    }

    /// Providers whose verified email may link to an existing user and whose
    /// unverified email is refused (`validateUserInfo` in `server.ts`). X
    /// never links by email (Contradiction 2).
    pub fn asserts_email(self) -> bool {
        matches!(self, Self::Google | Self::Apple)
    }
}

/// The origin the callback URL is built on: the configured public origin, else
/// the first development origin (`baseURL` fallback in `server.ts`).
pub fn base_origin(config: &AuthConfig) -> String {
    config
        .public_origin
        .clone()
        .unwrap_or_else(|| LOCAL_DEV_ORIGINS[0].to_owned())
}

/// `<origin>/api/auth/callback/<provider>`.
pub fn redirect_uri(config: &AuthConfig, provider: ProviderId) -> String {
    format!(
        "{}/api/auth/callback/{}",
        base_origin(config),
        provider.as_str()
    )
}

/// A verified provider assertion about who signed in.
#[derive(Clone, PartialEq, Eq)]
pub struct Identity {
    pub provider: ProviderId,
    /// The provider's stable user id (`sub`); `"account"."accountId"`.
    pub subject: String,
    pub email: Option<String>,
    /// Only a JSON `true` counts.
    pub email_verified: bool,
    pub name: Option<String>,
    pub image: Option<String>,
}

impl fmt::Debug for Identity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Personal data stays out of logs.
        f.debug_struct("Identity")
            .field("provider", &self.provider)
            .finish_non_exhaustive()
    }
}

/// Why a code exchange gave no identity. Never carries provider text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderError {
    Http(HttpError),
    /// The token response has no ID token.
    NoIdToken,
    IdToken(IdTokenError),
}

impl fmt::Display for ProviderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Http(error) => write!(f, "{error}"),
            Self::NoIdToken => f.write_str("token response has no ID token"),
            Self::IdToken(error) => write!(f, "{error}"),
        }
    }
}

impl std::error::Error for ProviderError {}

impl From<HttpError> for ProviderError {
    fn from(error: HttpError) -> Self {
        Self::Http(error)
    }
}

impl From<IdTokenError> for ProviderError {
    fn from(error: IdTokenError) -> Self {
        Self::IdToken(error)
    }
}

impl From<JwksError> for ProviderError {
    fn from(error: JwksError) -> Self {
        Self::IdToken(IdTokenError::Jwks(error))
    }
}
