//! The request pipeline: readiness gate, `/api/*`, then the static export.

use std::path::PathBuf;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE, LOCATION};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use quesar_services::rate_limit::ProxyTrust;

use crate::api::{self, ApiError, FnRouter, PublicServices};
use crate::auth::{self, AuthServices};
use crate::config::Config;
use crate::csp::PageHeaders;
use crate::readiness::{Readiness, runtime_readiness};
use crate::static_site;

const READINESS_PATH: &str = "/api/readiness";

/// Shared by every handler and extractor.
pub struct AppState {
    site_dir: PathBuf,
    /// Computed once: the environment does not change while the process runs.
    readiness: Readiness,
    /// Report-only CSP for HTML pages: production or development policy.
    page_headers: PageHeaders,
    /// `None` when the server runs without a database.
    pub(crate) auth: Option<AuthServices>,
    /// What public endpoints need and no database provides.
    pub(crate) public: PublicServices,
    /// `TRUSTED_PROXY`, for the client address.
    pub(crate) proxy_trust: ProxyTrust,
}

impl AppState {
    pub fn new(config: &Config, auth: Option<AuthServices>) -> Self {
        Self::with_public(config, auth, PublicServices::from_config(config))
    }

    pub fn with_public(
        config: &Config,
        auth: Option<AuthServices>,
        public: PublicServices,
    ) -> Self {
        Self {
            site_dir: config.site_dir.clone(),
            readiness: runtime_readiness(&config.environment, config.production),
            page_headers: PageHeaders::new(config.production),
            auth,
            public,
            proxy_trust: config.proxy_trust,
        }
    }
}

impl AppState {
    /// The database-backed services, for a handler that degrades without them
    /// instead of failing (contrast [`Self::auth_services`], which is a 503).
    pub fn database(&self) -> Option<&AuthServices> {
        self.auth.as_ref()
    }
}

type Shared = State<Arc<AppState>>;

fn readiness_response(state: &Readiness) -> Response {
    let status = if state.ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    let mut response = (status, Json(state)).into_response();
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

async fn readiness(State(state): Shared) -> Response {
    readiness_response(&state.readiness)
}

/// Refuses every request but the readiness probe until the configuration is sound.
async fn readiness_gate(State(state): Shared, request: Request, next: Next) -> Response {
    if !state.readiness.ready && request.uri().path() != READINESS_PATH {
        return readiness_response(&state.readiness);
    }
    next.run(request).await
}

/// An `/api/*` path no handler owns. JSON, never the HTML 404 page.
async fn api_not_found() -> ApiError {
    ApiError::NotFound
}

/// The mlai-era `/docs/intro` URL, as `next.config.ts` redirected it.
async fn docs_intro() -> Response {
    let mut response = StatusCode::PERMANENT_REDIRECT.into_response();
    response
        .headers_mut()
        .insert(LOCATION, HeaderValue::from_static("/docs/getting-started"));
    response
}

/// Whether `path` is `/api` or below it.
fn is_api_path(path: &str) -> bool {
    path == "/api" || path.starts_with("/api/")
}

async fn static_site(State(state): Shared, request: Request<Body>) -> Response {
    // An `/api/*` path no route owns is JSON, never the site's HTML 404. This
    // is not a `/api/{*rest}` route because that would shadow the fallback of
    // the nested `/api/auth` router.
    if is_api_path(request.uri().path()) {
        return api_not_found().await.into_response();
    }
    let mut response = static_site::serve(&state.site_dir, request).await;
    // Pages only (including the 404 page): not assets, media or the feed.
    let is_html = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("text/html"));
    if is_html {
        state.page_headers.apply(response.headers_mut());
    }
    response
}

/// The router without authentication: every `/api/auth/*` route answers 503.
pub fn router(config: &Config) -> Router {
    router_with(config, None)
}

/// The router with the auth services `main` built (or `None` without a
/// database) and the default [`PublicServices`].
pub fn router_with(config: &Config, auth: Option<AuthServices>) -> Router {
    router_with_public(config, auth, PublicServices::from_config(config))
}

/// As [`router_with`], with the public services the caller built (`main`), or
/// a test replaced one of.
pub fn router_with_public(
    config: &Config,
    auth: Option<AuthServices>,
    public: PublicServices,
) -> Router {
    router_with_functions(config, auth, public, api::functions())
}

/// As [`router_with_public`], with the functions mounted at `/api/fn` named by
/// the caller. A test registers its fixtures here and still goes through the
/// real readiness gate, mount layers and fallbacks.
pub fn router_with_functions(
    config: &Config,
    auth: Option<AuthServices>,
    public: PublicServices,
    functions: FnRouter,
) -> Router {
    let state = Arc::new(AppState::with_public(config, auth, public));
    let functions = api::routes(&state, functions);
    Router::new()
        .route(READINESS_PATH, get(readiness))
        .nest(auth::MOUNT, auth::routes(Arc::clone(&state)))
        // A service, not a nested router: a nested router does not answer
        // `/api/fn/` itself, and its fallback must see every path below.
        .nest_service(api::MOUNT, functions)
        .nest(api::telemetry::MOUNT, api::telemetry::routes())
        .route("/docs/intro", get(docs_intro))
        .fallback(static_site)
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            readiness_gate,
        ))
        .with_state(state)
}
