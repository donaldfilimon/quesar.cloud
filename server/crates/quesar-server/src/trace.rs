//! Request tracing that never records a query string.
//!
//! OAuth callbacks arrive as `/api/auth/callback/google?code=...&state=...`;
//! `tower-http`'s default span logs the whole URI, so this span carries the
//! method and the path only.

use axum::body::Body;
use axum::http::Request;
use tracing::Span;

pub fn request_span(request: &Request<Body>) -> Span {
    tracing::info_span!(
        "request",
        method = %request.method(),
        path = request.uri().path(),
    )
}
