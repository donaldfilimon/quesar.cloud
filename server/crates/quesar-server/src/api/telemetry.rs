//! `POST /api/telemetry`, the anonymous page-telemetry sink
//! (`src/lib/server/telemetry.server.ts`).
//!
//! It stores an allowlisted event name, an allowlisted pathname and a
//! timestamp: no user id, no address, no user agent, no cookie. Always 204
//! except for a malformed request (413 oversize, 400 not an object or an
//! unknown event) and 429 over the limit. Sink failures (database, limiter)
//! are swallowed and logged as a class only: telemetry must never affect the
//! page.
//!
//! The order is the TypeScript's and it matters: an opted-out visitor costs not
//! even a limiter row, and the limiter runs before the body is read. For that
//! the handler takes the raw request; a body extractor in its signature would
//! read the body first.
//!
//! No envelope and no same-origin check (the TypeScript has none; the event
//! and path allowlists and the per-client limit bound what a third party can
//! write). Any other method is the enveloped 405.

use std::sync::Arc;

use axum::Router;
use axum::extract::{Request, State};
use axum::http::header::HeaderName;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, body::Body};
use quesar_services::rate_limit::Bucket;
use quesar_services::telemetry::{EVENTS, app_route_patterns, normalize_path};
use serde_json::{Value, json};

use crate::api::method_not_allowed;
use crate::auth::extract::ClientIp;
use crate::body_limit::{TELEMETRY_BODY_MAX, read_json_limited};
use crate::router::AppState;

/// Where the sink is mounted.
pub const MOUNT: &str = "/api/telemetry";

const DNT: HeaderName = HeaderName::from_static("dnt");
const SEC_GPC: HeaderName = HeaderName::from_static("sec-gpc");

fn no_content() -> Response {
    StatusCode::NO_CONTENT.into_response()
}

fn too_many() -> Response {
    (
        StatusCode::TOO_MANY_REQUESTS,
        Json(json!({ "error": "Too many requests. Try again shortly." })),
    )
        .into_response()
}

/// Whether any one line of `name` is `1`, trimmed.
///
/// The TypeScript compares `Headers.get`, which joins repeated lines with
/// `, `, so `1, 1` does not match there. Honouring one line is a departure
/// that only ever stores less.
fn opted_out(headers: &HeaderMap, name: &HeaderName) -> bool {
    headers
        .get_all(name)
        .iter()
        .any(|value| value.to_str().is_ok_and(|text| text.trim() == "1"))
}

async fn telemetry(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    request: Request<Body>,
) -> Response {
    let (parts, body) = request.into_parts();

    // 1. Do Not Track and Global Privacy Control: nothing is stored or counted.
    if opted_out(&parts.headers, &DNT) || opted_out(&parts.headers, &SEC_GPC) {
        return no_content();
    }

    // 2. Without a database there is no limiter and nowhere to store.
    let Some(services) = state.database() else {
        return no_content();
    };
    let now_ms =
        i64::try_from(services.clock.now().unix_timestamp_nanos() / 1_000_000).unwrap_or(i64::MAX);
    match services
        .limiter
        .hit(Bucket::Telemetry, &ip.subject(services), now_ms)
        .await
    {
        Ok(hit) if hit.allowed => {}
        Ok(_) => return too_many(),
        Err(_) => {
            tracing::error!("telemetry rate limit unavailable");
            return no_content();
        }
    }

    // 3. The body: 4 KiB, a JSON object.
    let object = match read_json_limited(&parts.headers, body, TELEMETRY_BODY_MAX).await {
        Ok(object) => object,
        Err(error) => return error.into_response(),
    };

    // 4. The event is one of the allowlisted names.
    let Some(event) = object
        .get("event")
        .and_then(Value::as_str)
        .filter(|event| EVENTS.contains(event))
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Unrecognized event name." })),
        )
            .into_response();
    };
    let path = normalize_path(
        object.get("path").unwrap_or(&Value::Null),
        app_route_patterns(),
    );

    // 5. Store it; a failure never reaches the visitor.
    let stored = sqlx::query("insert into telemetry_events (event, path) values ($1, $2)")
        .bind(event)
        .bind(&path)
        .execute(&services.pool)
        .await;
    if stored.is_err() {
        tracing::error!("database error saving telemetry event");
    }
    no_content()
}

/// The sink's router, to be nested at [`MOUNT`].
pub fn routes() -> Router<Arc<AppState>> {
    // Build the route list now rather than on the first request.
    let _ = app_route_patterns();
    Router::new()
        .route("/", post(telemetry))
        .method_not_allowed_fallback(method_not_allowed)
}
