//! Authentication wiring for the HTTP server: request checks, the error
//! envelope, rate limiting and the services the endpoints share.
//!
//! The auth core lives in `quesar-auth` and knows nothing of HTTP. Without a
//! database the server runs with `AppState::auth == None`, and every
//! `/api/auth/*` route but the public ones answers 503.

pub mod error;
pub mod extract;
pub mod hashing;
pub mod issue;
pub mod json;
pub mod reissue;
pub mod routes;
pub mod view;

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::extract::{OriginalUri, Request, State};
use axum::middleware::{self, Next};
use axum::response::Response;
use quesar_auth::deletion::DeletionHooks;
use quesar_auth::oauth::jwks::JwksCache;
use quesar_auth::password::{Argon2Hasher, HashError};
use quesar_auth::providers::apple::AppleSecrets;
use quesar_auth::{AppleConfig, AuthConfig, Clock};
use quesar_db::PgPool;
use quesar_services::rate_limit::{self, Bucket, RateLimiter, SecretMissing};

use crate::config::Config;
use crate::router::AppState;

pub use error::ApiError;
pub use hashing::{Hashing, MAX_CONCURRENT_HASHES};

/// Where the auth API is mounted.
pub const MOUNT: &str = "/api/auth";
/// Paths (below [`MOUNT`]) that answer without a database.
const PUBLIC_WITHOUT_DATABASE: &[&str] = &["/api/auth/methods"];
/// Paths that still answer when sign-in is switched off with
/// `VITE_AUTH_ENABLED=false`. Everything else on `/api/auth` is 503, so a
/// route that can issue a session (sign-up, sign-in, OAuth, passkeys) is
/// closed by default; a new route opts in only by being added here, and only
/// if it needs a session (the extractors find none while auth is off, so it
/// answers 401) or cannot issue one.
const AVAILABLE_WHEN_DISABLED: &[&str] = &[
    "/api/auth/methods",
    "/api/auth/sign-out",
    "/api/auth/session",
    "/api/auth/sessions",
    "/api/auth/sessions/revoke",
    "/api/auth/sessions/revoke-others",
    "/api/auth/profile",
    // Needs a session, so it answers 401 while sign-in is off.
    "/api/auth/delete-account",
];
/// Identity-provider calls give up after this long.
const PROVIDER_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug)]
pub enum BuildError {
    /// Production without `APP_ENCRYPTION_KEY` or `BETTER_AUTH_SECRET`.
    RateLimitSecret(SecretMissing),
    HttpClient(reqwest::Error),
    Hashing(HashError),
}

impl std::fmt::Display for BuildError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::RateLimitSecret(error) => write!(f, "{error}"),
            Self::HttpClient(error) => write!(f, "cannot build the provider HTTP client: {error}"),
            Self::Hashing(error) => write!(f, "cannot prepare password hashing: {error}"),
        }
    }
}

impl std::error::Error for BuildError {}

/// Everything an auth endpoint needs, built once at startup.
pub struct AuthServices {
    pub pool: PgPool,
    pub limiter: RateLimiter,
    pub config: AuthConfig,
    pub clock: Arc<dyn Clock>,
    /// For identity-provider calls: follows no redirects, times out after 10 s.
    pub http: reqwest::Client,
    pub hashing: Hashing,
    /// `VITE_AUTH_ENABLED` is not exactly `false`. When off, `/methods` offers
    /// nothing (the static build's setting).
    pub auth_enabled: bool,
    /// `QUESAR_ENV=production`: provider endpoints must then be https.
    pub production: bool,
    /// Identity providers' signing keys.
    pub jwks: JwksCache,
    /// Apple's parsed key and current client secret. `None` when Apple is not
    /// configured or its key cannot be used, and Apple sign-in is then off.
    apple: Option<AppleSecrets>,
    /// The external cleanups an account deletion calls. M2 defaults: the
    /// WDBX configuration guard and no workspace revocation; M5 and M6 replace
    /// them.
    pub deletion: DeletionHooks,
}

impl std::fmt::Debug for AuthServices {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AuthServices").finish_non_exhaustive()
    }
}

impl AuthServices {
    /// Reads the auth configuration from `server.environment`. In production a
    /// missing rate-limit key is an error here as well as in readiness.
    pub fn build(pool: PgPool, server: &Config, clock: Arc<dyn Clock>) -> Result<Self, BuildError> {
        let environment = &server.environment;
        let secret = rate_limit::resolve_secret_for(
            server.production,
            environment.read("APP_ENCRYPTION_KEY"),
            environment.read("BETTER_AUTH_SECRET"),
        )
        .map_err(BuildError::RateLimitSecret)?;
        let limiter = RateLimiter::new(pool.clone(), secret.as_bytes());
        let config = AuthConfig::from_lookup(
            |name| environment.read(name).map(str::to_owned),
            server.production,
        );
        let apple = config.providers.apple.as_ref().and_then(|apple| {
            AppleSecrets::new(apple, clock.now())
                .inspect_err(|_| {
                    // The error names no key material.
                    tracing::warn!("APPLE_PRIVATE_KEY cannot be used; Apple sign-in is off");
                })
                .ok()
        });
        let http = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(PROVIDER_TIMEOUT)
            .build()
            .map_err(BuildError::HttpClient)?;
        let hashing = Hashing::new(Arc::new(Argon2Hasher), MAX_CONCURRENT_HASHES)
            .map_err(BuildError::Hashing)?;
        Ok(Self {
            pool,
            limiter,
            config,
            clock,
            http,
            hashing,
            auth_enabled: environment.read("VITE_AUTH_ENABLED") != Some("false"),
            production: server.production,
            jwks: JwksCache::new(),
            apple,
            deletion: DeletionHooks::defaults(
                environment
                    .raw_pairs()
                    .map(|(name, value)| (name.to_owned(), value.to_owned())),
            ),
        })
    }

    /// Apple's configuration with its secrets, only when Apple sign-in is
    /// usable: configured, and its private key mints a client secret.
    pub fn apple(&self) -> Option<(&AppleConfig, &AppleSecrets)> {
        Some((self.config.providers.apple.as_ref()?, self.apple.as_ref()?))
    }

    /// Counts one hit for `subject` (a user id, or [`extract::ClientIp::subject`])
    /// in `bucket`; 429 with `Retry-After` when over the limit. Call it before
    /// any handler work, a password hash or a provider call.
    pub async fn limit(&self, bucket: Bucket, subject: &str) -> Result<(), ApiError> {
        let now_ms =
            i64::try_from(self.clock.now().unix_timestamp_nanos() / 1_000_000).unwrap_or(i64::MAX);
        let hit = self.limiter.hit(bucket, subject, now_ms).await?;
        if hit.allowed {
            Ok(())
        } else {
            Err(ApiError::RateLimited {
                retry_after_ms: hit.retry_after_ms,
            })
        }
    }
}

impl AppState {
    /// The auth services, or 503 when the server runs without a database.
    pub fn auth_services(&self) -> Result<&AuthServices, ApiError> {
        self.auth.as_ref().ok_or(ApiError::Unavailable)
    }
}

/// Answers 503 for everything but [`PUBLIC_WITHOUT_DATABASE`] when there is no
/// database, and for everything but [`AVAILABLE_WHEN_DISABLED`] when sign-in
/// is switched off.
async fn require_database(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Response {
    let path = request
        .extensions()
        .get::<OriginalUri>()
        .map_or_else(|| request.uri().path(), |original| original.0.path());
    let refused = match &state.auth {
        None => !PUBLIC_WITHOUT_DATABASE.contains(&path),
        Some(services) => !services.auth_enabled && !AVAILABLE_WHEN_DISABLED.contains(&path),
    };
    if refused {
        return axum::response::IntoResponse::into_response(ApiError::Unavailable);
    }
    next.run(request).await
}

/// An unknown `/api/auth/*` path: JSON, never the static site's HTML 404.
async fn not_found() -> ApiError {
    ApiError::NotFound
}

/// The `/api/auth` router. Later tasks add their routes to [`routes::router`].
pub fn routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    routes::router()
        .fallback(not_found)
        .layer(middleware::from_fn(reissue::reissue_cookie))
        .layer(middleware::from_fn_with_state(state, require_database))
}
