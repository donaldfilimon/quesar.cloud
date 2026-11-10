//! The `/api/fn/*` server-function API and the plumbing shared by every
//! endpoint that is not an auth route: the error envelope, bounded JSON
//! bodies, and the services that need no database.
//!
//! A function is `POST /api/fn/<name>` with the input itself as the JSON body.
//! Everything under the mount is same-origin only, checked before the name or
//! the method is looked at, so a cross-site caller cannot probe which names
//! exist (the TypeScript dispatcher does the same).

pub mod body;
pub mod error;
pub mod fn_router;
pub mod functions;

use std::sync::Arc;

use axum::Router;
use axum::extract::Request;
use axum::http::HeaderValue;
use axum::http::header::CACHE_CONTROL;
use axum::middleware::{self, Next};
use axum::response::Response;
use quesar_auth::AuthConfig;
use quesar_contract::commerce::CommerceReadiness;
use quesar_services::turnstile::TurnstileConfig;

pub use error::ApiError;
pub use fn_router::FnRouter;

use crate::auth::extract::SameOrigin;
use crate::auth::{BuildError, reissue};
use crate::config::Config;
use crate::router::AppState;

/// Where the functions are mounted.
pub const MOUNT: &str = "/api/fn";

/// What public endpoints need and no database provides. Fields are public so a
/// test can replace one before the router is built.
#[derive(Debug, Clone)]
pub struct PublicServices {
    /// The origins [`SameOrigin`] accepts: the configured public origin, plus
    /// the local development origins outside production.
    pub trusted_origins: Vec<String>,
    /// Turnstile settings, read once at startup.
    pub turnstile: TurnstileConfig,
    /// `QUASAR_SERVICE_ORIGIN` normalised, or `None` when unset or malformed.
    pub quasar_default_origin: Option<String>,
    /// What `commerce.getCommerceReadiness` answers.
    pub commerce: CommerceReadiness,
}

impl PublicServices {
    /// The production constructor. Later tasks add services that can fail to
    /// build (an HTTP client), which is why it returns a `Result`.
    pub fn build(config: &Config) -> Result<Self, BuildError> {
        Ok(Self::from_config(config))
    }

    /// What [`crate::router_with`] uses when the caller built none.
    pub(crate) fn from_config(config: &Config) -> Self {
        let environment = &config.environment;
        let auth = AuthConfig::from_lookup(
            |name| environment.read(name).map(str::to_owned),
            config.production,
        );
        Self {
            trusted_origins: auth.trusted_origins,
            turnstile: functions::config::turnstile(environment),
            quasar_default_origin: functions::config::quasar_default_origin(environment),
            commerce: functions::config::commerce(environment),
        }
    }
}

/// The functions the server offers. Tasks 5 and 6 register theirs here.
pub fn functions() -> FnRouter {
    functions::register(FnRouter::new())
}

/// An unknown path below the mount: JSON, never the static site's HTML 404.
async fn unknown_function() -> ApiError {
    ApiError::UnknownFunction
}

/// A known path with a method it does not take: JSON, not axum's empty 405.
/// axum adds the `Allow` header itself.
pub async fn method_not_allowed() -> ApiError {
    ApiError::MethodNotAllowed
}

/// Refuses a request that is not from a trusted origin. A layer, so it also
/// guards the fallbacks.
async fn same_origin(_: SameOrigin, request: Request, next: Next) -> Response {
    next.run(request).await
}

/// Every response under the mount is private.
async fn no_store(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

/// The router mounted at [`MOUNT`]: the functions, JSON fallbacks, the
/// same-origin check in front of all of them, and the session-cookie re-issue
/// the `/api/auth` router has. It is returned as a service: a nested `Router`
/// answers `/api/fn` but not `/api/fn/`, a nested service answers both.
pub fn routes(state: &Arc<AppState>, functions: FnRouter) -> Router {
    let (router, _names) = functions.finish();
    router
        .fallback(unknown_function)
        .method_not_allowed_fallback(method_not_allowed)
        .layer(middleware::from_fn(reissue::reissue_cookie))
        .layer(middleware::from_fn_with_state(
            Arc::clone(state),
            same_origin,
        ))
        .layer(middleware::from_fn(no_store))
        .with_state(Arc::clone(state))
}
