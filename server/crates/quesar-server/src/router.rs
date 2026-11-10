//! The request pipeline: readiness gate, `/api/*`, then the static export.

use std::path::PathBuf;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::header::{CACHE_CONTROL, LOCATION};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use axum::{Json, Router};
use serde_json::json;

use crate::config::Config;
use crate::readiness::{Readiness, runtime_readiness};
use crate::static_site;

const READINESS_PATH: &str = "/api/readiness";

struct AppState {
    site_dir: PathBuf,
    /// Computed once: the environment does not change while the process runs.
    readiness: Readiness,
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
async fn api_not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        Json(json!({ "ok": false, "error": { "name": "NotFoundError", "message": "Not found" } })),
    )
        .into_response()
}

/// The mlai-era `/docs/intro` URL, as `next.config.ts` redirected it.
async fn docs_intro() -> Response {
    let mut response = StatusCode::PERMANENT_REDIRECT.into_response();
    response
        .headers_mut()
        .insert(LOCATION, HeaderValue::from_static("/docs/getting-started"));
    response
}

async fn static_site(State(state): Shared, request: Request<Body>) -> Response {
    static_site::serve(&state.site_dir, request).await
}

pub fn router(config: &Config) -> Router {
    let state = Arc::new(AppState {
        site_dir: config.site_dir.clone(),
        readiness: runtime_readiness(&config.environment, config.production),
    });
    Router::new()
        .route(READINESS_PATH, get(readiness))
        .route("/api", any(api_not_found))
        .route("/api/{*rest}", any(api_not_found))
        .route("/docs/intro", get(docs_intro))
        .fallback(static_site)
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            readiness_gate,
        ))
        .with_state(state)
}
