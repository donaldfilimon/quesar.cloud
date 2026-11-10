//! Database-backed fixed-window rate limiter, the port of
//! `src/lib/server/rate-limit.server.ts` over the same `rate_limits` table.
//!
//! One atomic upsert counts each hit, so concurrent requests cannot exceed the
//! limit. A `subject` is a user id (stored as given) or [`RateLimiter::client_subject`]
//! of a request: a keyed hash, never a raw IP. Old windows are pruned
//! opportunistically (about 1 in 50 hits, rows older than 24 hours).
//!
//! The TypeScript returns only `{ allowed, remaining }`; `retry_after_ms` is an
//! addition (time until the current window ends) for the Rust HTTP layer.

use std::fmt;
use std::hash::{BuildHasher, RandomState};
use std::net::SocketAddr;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::PgPool;
use zeroize::Zeroizing;

/// Rows older than this are pruned (`now - 24 * 60 * 60_000` in the TypeScript).
const RETENTION_MS: i64 = 24 * 60 * 60_000;
/// One hit in this many triggers a prune (`Math.random() < 0.02`).
const PRUNE_ONE_IN: u64 = 50;
/// The subject is the first 32 characters of the base64url digest.
const SUBJECT_CHARS: usize = 32;
/// The TypeScript's last-resort HMAC key when no secret is configured.
const FALLBACK_SECRET: &str = "quesar-rate-limit";

/// A fixed window: at most `max` hits per `window_ms`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Limit {
    pub window_ms: i64,
    pub max: i64,
}

/// The named buckets: the `LIMITS` table of the TypeScript plus the two ad-hoc
/// limits its callers pass inline (`commerce.ts`, `audits-expire.ts`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Bucket {
    Llm,
    Inquiry,
    Telemetry,
    CspReport,
    Workspace,
    CommerceCreate,
    AuditExpiry,
    /// Sign-in and sign-up: Better Auth's `/sign-in*` and `/sign-up*` rule.
    AuthCredential,
    /// Every other auth endpoint.
    AuthGeneral,
}

impl Bucket {
    /// The stored `bucket` column value (the string callers pass to `hit`).
    pub fn name(self) -> &'static str {
        match self {
            Self::Llm => "llm",
            Self::Inquiry => "inquiry",
            Self::Telemetry => "telemetry",
            Self::CspReport => "csp-report",
            Self::Workspace => "workspace",
            Self::CommerceCreate => "commerce-create",
            Self::AuditExpiry => "audit-expiry",
            Self::AuthCredential => "auth",
            Self::AuthGeneral => "auth-general",
        }
    }

    pub fn limit(self) -> Limit {
        let (window_ms, max) = match self {
            Self::Llm => (60_000, 12),
            Self::Inquiry => (10 * 60_000, 5),
            Self::Telemetry => (60_000, 120),
            Self::CspReport => (60_000, 60),
            Self::Workspace => (60_000, 60),
            Self::CommerceCreate => (3_600_000, 20),
            Self::AuditExpiry => (60_000, 5),
            Self::AuthCredential => (10_000, 3),
            Self::AuthGeneral => (10_000, 100),
        };
        Limit { window_ms, max }
    }
}

/// The outcome of counting one hit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitResult {
    pub allowed: bool,
    pub remaining: i64,
    /// Milliseconds until the current window ends; always positive.
    pub retry_after_ms: i64,
}

#[derive(Debug)]
pub enum RateLimitError {
    /// The database refused the upsert or the prune.
    Database(sqlx::Error),
    /// The limit's window is not positive.
    InvalidLimit,
}

impl fmt::Display for RateLimitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Database(_) => "rate limit store unavailable",
            Self::InvalidLimit => "rate limit window must be positive",
        })
    }
}

impl std::error::Error for RateLimitError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::InvalidLimit => None,
        }
    }
}

impl From<sqlx::Error> for RateLimitError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error)
    }
}

/// Start of the window containing `now_ms` (`windowStart` in the TypeScript).
pub fn window_start(now_ms: i64, window_ms: i64) -> i64 {
    now_ms.div_euclid(window_ms) * window_ms
}

/// Milliseconds since the Unix epoch, for callers without an injected clock.
pub fn system_now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| i64::try_from(elapsed.as_millis()).unwrap_or(0))
}

/// The HMAC key for client subjects: a configured secret, or the public
/// constant the TypeScript falls back to. Subjects keyed with the fallback are
/// unkeyed hashes (IPv4 is small enough to brute-force), so production must
/// refuse it; see [`resolve_secret_for`].
#[derive(Clone, PartialEq, Eq)]
pub enum RateLimitSecret {
    Configured(String),
    Fallback,
}

impl RateLimitSecret {
    /// The key bytes for [`RateLimiter::new`].
    pub fn as_bytes(&self) -> &[u8] {
        match self {
            Self::Configured(secret) => secret.as_bytes(),
            Self::Fallback => FALLBACK_SECRET.as_bytes(),
        }
    }

    pub fn is_fallback(&self) -> bool {
        matches!(self, Self::Fallback)
    }
}

impl fmt::Debug for RateLimitSecret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Configured(_) => "RateLimitSecret::Configured(..)",
            Self::Fallback => "RateLimitSecret::Fallback",
        })
    }
}

/// Production was asked for a rate-limit key and none is configured.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecretMissing;

impl fmt::Display for SecretMissing {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("rate limiting needs APP_ENCRYPTION_KEY or BETTER_AUTH_SECRET in production")
    }
}

impl std::error::Error for SecretMissing {}

/// The HMAC key as the TypeScript derives it: `APP_ENCRYPTION_KEY`, else
/// `BETTER_AUTH_SECRET`, else the fixed fallback, reported as
/// [`RateLimitSecret::Fallback`]. Each is trimmed and an empty value counts as
/// unset (`env()` in `src/lib/env.server.ts`). The caller reads the two
/// environment variables and passes them here.
pub fn resolve_secret(
    app_encryption_key: Option<&str>,
    better_auth_secret: Option<&str>,
) -> RateLimitSecret {
    fn usable(value: Option<&str>) -> Option<&str> {
        value.map(str::trim).filter(|v| !v.is_empty())
    }
    usable(app_encryption_key)
        .or_else(|| usable(better_auth_secret))
        .map_or(RateLimitSecret::Fallback, |secret| {
            RateLimitSecret::Configured(secret.to_owned())
        })
}

/// [`resolve_secret`] for wiring a limiter: in production the fallback is an
/// error (unlike the TypeScript, whose readiness check prevents it); elsewhere
/// it is allowed.
pub fn resolve_secret_for(
    production: bool,
    app_encryption_key: Option<&str>,
    better_auth_secret: Option<&str>,
) -> Result<RateLimitSecret, SecretMissing> {
    match resolve_secret(app_encryption_key, better_auth_secret) {
        RateLimitSecret::Fallback if production => Err(SecretMissing),
        secret => Ok(secret),
    }
}

/// Which proxy header, if any, names the real client address. Read from
/// `TRUSTED_PROXY` by [`ProxyTrust::from_setting`].
///
/// Deliberate deviation from `clientSubject` in `rate-limit.server.ts`: the
/// TypeScript always trusted `x-real-ip` (and then `x-forwarded-for`) because it
/// ran behind Vercel, which overwrites them. This server sits behind a proxy
/// that may pass a client-supplied `X-Real-IP` through, so by default no header
/// is trusted and the peer socket address is used. A header is read only in the
/// mode that names it, and a missing header never falls back to another
/// client-controllable one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ProxyTrust {
    /// No proxy header is trusted: the peer address is the client.
    #[default]
    None,
    /// `x-real-ip`, set by the proxy (Caddy needs `header_up X-Real-IP {remote_host}`).
    XRealIp,
    /// The rightmost `x-forwarded-for` hop (the one the trusted proxy appended).
    XForwardedFor,
    /// `cf-connecting-ip`, set by Cloudflare.
    Cloudflare,
}

impl ProxyTrust {
    /// Parses the `TRUSTED_PROXY` value: `x-real-ip`, `x-forwarded-for` or
    /// `cloudflare`, matched case-sensitively after trimming. Unset or anything
    /// else trusts no header.
    pub fn from_setting(raw: Option<&str>) -> Self {
        match raw.map(str::trim) {
            Some("x-real-ip") => Self::XRealIp,
            Some("x-forwarded-for") => Self::XForwardedFor,
            Some("cloudflare") => Self::Cloudflare,
            _ => Self::None,
        }
    }
}

/// The values of a header joined with ", " the way Fetch's `Headers.get` does,
/// skipping values that are not UTF-8. `None` when no usable value exists.
fn joined_header(headers: &http::HeaderMap, name: &str) -> Option<String> {
    let values: Vec<&str> = headers
        .get_all(name)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .collect();
    (!values.is_empty()).then(|| values.join(", "))
}

/// The client address for rate limiting: the header `trust` names, else the
/// peer address, else `"unknown"`. A trusted header that is present but empty
/// (or whitespace) names no client, so it falls back to the peer address: an
/// empty subject would put every such client in one shared bucket. Repeated
/// header lines are joined like Fetch does before the rightmost
/// `x-forwarded-for` hop is taken.
pub fn client_ip_from_headers(
    headers: &http::HeaderMap,
    trust: ProxyTrust,
    peer: Option<SocketAddr>,
) -> String {
    let from_header = match trust {
        ProxyTrust::None => None,
        ProxyTrust::XRealIp => joined_header(headers, "x-real-ip"),
        ProxyTrust::XForwardedFor => joined_header(headers, "x-forwarded-for")
            .and_then(|v| v.split(',').next_back().map(|hop| hop.trim().to_owned())),
        ProxyTrust::Cloudflare => joined_header(headers, "cf-connecting-ip"),
    };
    let peer_ip = peer.map(|addr| addr.ip().to_canonical().to_string());
    // With no peer address (only in tests; the server always has one) an empty
    // header stays as given, which the shared contract vectors pin.
    let from_header = match (from_header, &peer_ip) {
        (Some(ip), Some(_)) if ip.trim().is_empty() => None,
        (header, _) => header,
    };
    from_header
        .or(peer_ip)
        .unwrap_or_else(|| "unknown".to_owned())
}

/// When a hit also prunes expired rows. Production uses `Sampled`, the
/// TypeScript's roughly 1-in-50; the other two make tests deterministic.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum PruneSampling {
    #[default]
    Sampled,
    Never,
    Always,
}

pub struct RateLimiter {
    pool: PgPool,
    secret: Zeroizing<Vec<u8>>,
    prune_sampling: PruneSampling,
}

impl fmt::Debug for RateLimiter {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RateLimiter").finish_non_exhaustive()
    }
}

impl RateLimiter {
    /// `secret` is the HMAC key for client subjects (see [`resolve_secret_for`]).
    pub fn new(pool: PgPool, secret: impl Into<Vec<u8>>) -> Self {
        Self {
            pool,
            secret: Zeroizing::new(secret.into()),
            prune_sampling: PruneSampling::default(),
        }
    }

    /// Replaces the default 1-in-50 prune sampling (for tests).
    #[must_use]
    pub fn with_prune_sampling(mut self, prune_sampling: PruneSampling) -> Self {
        self.prune_sampling = prune_sampling;
        self
    }

    /// A stable, non-reversible subject for an anonymous client address:
    /// `base64url(HMAC-SHA256(secret, "ip:" + ip))`, first 32 characters.
    pub fn client_subject(&self, ip: &str) -> String {
        let mut mac = match Hmac::<Sha256>::new_from_slice(&self.secret) {
            Ok(mac) => mac,
            // HMAC accepts keys of any length; this arm cannot be reached.
            Err(_) => return String::new(),
        };
        mac.update(b"ip:");
        mac.update(ip.as_bytes());
        let mut subject = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        subject.truncate(SUBJECT_CHARS);
        subject
    }

    /// Counts one hit for a named bucket at `now_ms`.
    pub async fn hit(
        &self,
        bucket: Bucket,
        subject: &str,
        now_ms: i64,
    ) -> Result<HitResult, RateLimitError> {
        self.hit_with(bucket.name(), subject, bucket.limit(), now_ms)
            .await
    }

    /// Counts one hit for any bucket name and limit (`hit` in the TypeScript).
    pub async fn hit_with(
        &self,
        bucket: &str,
        subject: &str,
        limit: Limit,
        now_ms: i64,
    ) -> Result<HitResult, RateLimitError> {
        if limit.window_ms <= 0 {
            return Err(RateLimitError::InvalidLimit);
        }
        let start = window_start(now_ms, limit.window_ms);
        let count: i32 = sqlx::query_scalar(
            "insert into rate_limits (bucket, subject, window_start, count) \
             values ($1, $2, 'epoch'::timestamptz + $3::float8 * interval '1 millisecond', 1) \
             on conflict (bucket, subject, window_start) \
             do update set count = rate_limits.count + 1 \
             returning count",
        )
        .bind(bucket)
        .bind(subject)
        .bind(start as f64)
        .fetch_one(&self.pool)
        .await?;
        let prune = match self.prune_sampling {
            PruneSampling::Sampled => RandomState::new()
                .hash_one(now_ms)
                .is_multiple_of(PRUNE_ONE_IN),
            PruneSampling::Never => false,
            PruneSampling::Always => true,
        };
        if prune {
            self.prune(now_ms).await?;
        }
        let count = i64::from(count);
        Ok(HitResult {
            allowed: count <= limit.max,
            remaining: (limit.max - count).max(0),
            retry_after_ms: start + limit.window_ms - now_ms,
        })
    }

    /// Deletes windows that started more than 24 hours before `now_ms`;
    /// returns the number of rows removed.
    pub async fn prune(&self, now_ms: i64) -> Result<u64, RateLimitError> {
        let cutoff = (now_ms - RETENTION_MS) as f64;
        let done = sqlx::query(
            "delete from rate_limits \
             where window_start < 'epoch'::timestamptz + $1::float8 * interval '1 millisecond'",
        )
        .bind(cutoff)
        .execute(&self.pool)
        .await?;
        Ok(done.rows_affected())
    }
}
