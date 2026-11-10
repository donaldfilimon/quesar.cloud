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

/// The HMAC key as the TypeScript derives it: `APP_ENCRYPTION_KEY`, else
/// `BETTER_AUTH_SECRET`, else a fixed fallback. Each is trimmed and an empty
/// value counts as unset (`env()` in `src/lib/env.server.ts`). The caller reads
/// the two environment variables and passes them here.
pub fn resolve_secret(
    app_encryption_key: Option<&str>,
    better_auth_secret: Option<&str>,
) -> String {
    fn usable(value: Option<&str>) -> Option<&str> {
        value.map(str::trim).filter(|v| !v.is_empty())
    }
    usable(app_encryption_key)
        .or_else(|| usable(better_auth_secret))
        .unwrap_or(FALLBACK_SECRET)
        .to_owned()
}

/// The client address from the proxy headers, as `clientSubject` picks it:
/// `cf-connecting-ip` only when Cloudflare is the trusted proxy, then
/// `x-real-ip`, then the rightmost `x-forwarded-for` hop, else `"unknown"`.
/// A header that is present but empty is used as is, as in the TypeScript.
pub fn client_ip(
    trust_cloudflare: bool,
    cf_connecting_ip: Option<&str>,
    x_real_ip: Option<&str>,
    x_forwarded_for: Option<&str>,
) -> String {
    let forwarded = || {
        x_forwarded_for
            .and_then(|v| v.split(',').next_back())
            .map(str::trim)
    };
    trust_cloudflare
        .then_some(cf_connecting_ip)
        .flatten()
        .or(x_real_ip)
        .or_else(forwarded)
        .unwrap_or("unknown")
        .to_owned()
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
    /// `secret` is the HMAC key for client subjects (see [`resolve_secret`]).
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
