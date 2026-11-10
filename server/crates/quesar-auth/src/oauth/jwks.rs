//! A provider's published signing keys, cached.
//!
//! The set is kept for one hour. A token that names an unknown `kid` may
//! trigger a refetch, but at most once a minute, so a stream of forged tokens
//! cannot turn into a stream of requests to the provider. Only RSA keys that
//! may sign (`use` absent or `sig`) with `alg` absent or `RS256` are kept.
//! Time comes from the injected clock.

use std::collections::HashMap;
use std::fmt;
use std::sync::Mutex;

use serde::Deserialize;
use time::{Duration, OffsetDateTime};

use crate::oauth::http::{self, HttpError};

pub const JWKS_TTL: Duration = Duration::hours(1);
pub const JWKS_REFETCH_MIN: Duration = Duration::minutes(1);

/// An RSA public key: base64url modulus and exponent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Jwk {
    pub kid: String,
    pub n: String,
    pub e: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JwksError {
    Fetch(HttpError),
    /// No key with this `kid`, and no refetch was due.
    UnknownKey,
}

impl fmt::Display for JwksError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Fetch(error) => write!(f, "cannot fetch signing keys: {error}"),
            Self::UnknownKey => f.write_str("unknown signing key"),
        }
    }
}

impl std::error::Error for JwksError {}

#[derive(Deserialize)]
struct RawSet {
    keys: Vec<RawKey>,
}

#[derive(Deserialize)]
struct RawKey {
    kty: Option<String>,
    kid: Option<String>,
    n: Option<String>,
    e: Option<String>,
    alg: Option<String>,
    #[serde(rename = "use")]
    usage: Option<String>,
}

impl RawKey {
    fn into_jwk(self) -> Option<Jwk> {
        let signs = self.usage.as_deref().is_none_or(|usage| usage == "sig");
        let rs256 = self.alg.as_deref().is_none_or(|alg| alg == "RS256");
        if self.kty.as_deref() != Some("RSA") || !signs || !rs256 {
            return None;
        }
        Some(Jwk {
            kid: self.kid?,
            n: self.n?,
            e: self.e?,
        })
    }
}

struct Entry {
    keys: Vec<Jwk>,
    fetched_at: OffsetDateTime,
    /// The last time a fetch was started, whether or not it succeeded.
    last_attempt: OffsetDateTime,
}

/// Keys per JWKS URL.
#[derive(Default)]
pub struct JwksCache {
    entries: Mutex<HashMap<String, Entry>>,
}

impl fmt::Debug for JwksCache {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("JwksCache").finish_non_exhaustive()
    }
}

enum Plan {
    Found(Jwk),
    Fetch,
    Unknown,
}

impl JwksCache {
    pub fn new() -> Self {
        Self::default()
    }

    fn plan(&self, url: &str, kid: &str, now: OffsetDateTime) -> Plan {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let Some(entry) = entries.get_mut(url) else {
            return Plan::Fetch;
        };
        if now - entry.fetched_at >= JWKS_TTL {
            entry.last_attempt = now;
            return Plan::Fetch;
        }
        if let Some(key) = entry.keys.iter().find(|key| key.kid == kid) {
            return Plan::Found(key.clone());
        }
        if now - entry.last_attempt >= JWKS_REFETCH_MIN {
            entry.last_attempt = now;
            Plan::Fetch
        } else {
            Plan::Unknown
        }
    }

    /// The key `kid` at `url`, fetching the set when it is missing, stale, or
    /// (at most once a minute) lacks that `kid`.
    pub async fn key(
        &self,
        http: &reqwest::Client,
        url: &str,
        kid: &str,
        now: OffsetDateTime,
        allow_http: bool,
    ) -> Result<Jwk, JwksError> {
        match self.plan(url, kid, now) {
            Plan::Found(key) => return Ok(key),
            Plan::Unknown => return Err(JwksError::UnknownKey),
            Plan::Fetch => {}
        }
        let raw: RawSet = http::get_json(http, url, allow_http)
            .await
            .map_err(JwksError::Fetch)?;
        let keys: Vec<Jwk> = raw.keys.into_iter().filter_map(RawKey::into_jwk).collect();
        let found = keys.iter().find(|key| key.kid == kid).cloned();
        self.entries
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .insert(
                url.to_owned(),
                Entry {
                    keys,
                    fetched_at: now,
                    last_attempt: now,
                },
            );
        found.ok_or(JwksError::UnknownKey)
    }
}
