//! Passkeys (WebAuthn): registration, discoverable sign-in, listing and
//! deletion, on `webauthn-rs`. Ports `@better-auth/passkey` (`index.mjs`,
//! `MAX_AGE_IN_SECONDS = 300`) with the two differences recorded in the plan:
//! user verification is required (Contradiction 9), and the ceremony state is
//! a single-use `auth_flows` row bound to the browser that began it, not a
//! signed cookie.
//!
//! Framework-free: the HTTP layer lives in `quesar-server`.

use std::fmt;
use std::time::Duration;

use url::Url;
use webauthn_rs::prelude::{Webauthn, WebauthnBuilder, WebauthnError};

/// The request bodies a browser sends, for the HTTP layer to deserialize into.
pub use webauthn_rs::prelude::{PublicKeyCredential, RegisterPublicKeyCredential};

use crate::config::AuthConfig;

pub mod authenticate;
pub mod flow;
pub mod register;
pub mod store;

/// How long the browser has to complete a ceremony, and how long its flow row
/// lives (`MAX_AGE_IN_SECONDS`).
pub const CEREMONY_TTL: time::Duration = time::Duration::seconds(300);
/// The same 300 s as the `timeout` the browser is told.
const BROWSER_TIMEOUT: Duration = Duration::from_secs(300);
/// A passkey's display name is cut to this many characters.
pub const NAME_MAX_CHARS: usize = 80;

/// Why the relying party could not be configured. Passkeys are then off; the
/// rest of the server is unaffected.
#[derive(Debug)]
pub enum ConfigError {
    /// `rp_origins` is empty or holds no URL.
    NoOrigin,
    /// The relying-party id is not the domain (or a parent) of the first origin.
    Webauthn(WebauthnError),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoOrigin => f.write_str("no valid WebAuthn origin is configured"),
            Self::Webauthn(error) => write!(f, "WebAuthn relying party is invalid: {error}"),
        }
    }
}

impl std::error::Error for ConfigError {}

/// The configured relying party. Built once at startup.
pub struct Passkeys {
    webauthn: Webauthn,
}

impl fmt::Debug for Passkeys {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Passkeys").finish_non_exhaustive()
    }
}

impl Passkeys {
    /// `WebauthnBuilder::new(rp_id, first_origin)`, the remaining origins
    /// appended, and the relying-party name (`server.ts:200`).
    pub fn new(config: &AuthConfig) -> Result<Self, ConfigError> {
        let mut origins = config
            .rp_origins
            .iter()
            .filter_map(|origin| Url::parse(origin).ok());
        let first = origins.next().ok_or(ConfigError::NoOrigin)?;
        let mut builder = WebauthnBuilder::new(&config.rp_id, &first)
            .map_err(ConfigError::Webauthn)?
            .rp_name(&config.rp_name)
            .timeout(BROWSER_TIMEOUT);
        for origin in origins {
            builder = builder.append_allowed_origin(&origin);
        }
        Ok(Self {
            webauthn: builder.build().map_err(ConfigError::Webauthn)?,
        })
    }

    pub(crate) fn webauthn(&self) -> &Webauthn {
        &self.webauthn
    }
}
