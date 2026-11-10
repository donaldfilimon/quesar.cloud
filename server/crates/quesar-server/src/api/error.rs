//! The JSON envelope of every `/api/auth/*` and `/api/fn/*` response.
//!
//! Success is `{"ok":true,"result":...}`. Failure is
//! `{"ok":false,"error":{"name","code","message"}}`: the `{name,message}` the
//! TypeScript server sends, plus a machine-readable `code`. Every response is
//! `Cache-Control: no-store`. Messages never contain user input or secrets.

use std::error::Error as _;

use axum::Json;
use axum::http::header::{CACHE_CONTROL, RETRY_AFTER};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use quesar_auth::AuthError;
use quesar_services::rate_limit::RateLimitError;
use serde::Serialize;
use serde_json::json;

/// What `CrossSiteRequestError` says in `isolation.server.ts`.
const CROSS_SITE_MESSAGE: &str = "Forbidden: cross-site request blocked";
/// What the dispatcher says for a name it does not know (`route.server.ts`).
const UNKNOWN_FUNCTION_MESSAGE: &str = "Unknown server function.";
/// What the dispatcher says for a body it cannot read (`route.server.ts`).
const INVALID_BODY_MESSAGE: &str = "Malformed request.";
/// What the dispatcher falls back to for a failure with no message.
const INTERNAL_MESSAGE: &str = "Server function failed.";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApiError {
    /// 401 `UnauthorizedError`: no valid session.
    Unauthorized,
    /// 403 `CrossSiteRequestError`.
    CrossSite,
    /// 400 `ValidationError` with a machine code.
    Validation { code: &'static str, message: String },
    /// A domain failure: the status is the caller's, the name is `AuthError`.
    Auth {
        status: StatusCode,
        code: &'static str,
        message: String,
    },
    /// 429 `RateLimitedError`; `Retry-After` is the wait rounded up to seconds.
    RateLimited { retry_after_ms: i64 },
    /// 503 `AuthUnavailableError`: no database, or the store failed.
    Unavailable,
    /// 404 `NotFoundError`.
    NotFound,
    /// 405 `MethodNotAllowedError`: the path exists, the method does not.
    MethodNotAllowed,
    /// 404 `NotFoundError` / `UNKNOWN_FUNCTION`: no function of that name.
    UnknownFunction,
    /// 400 `ValidationError` / `INVALID_BODY`: the body is not JSON of the
    /// function's input type.
    InvalidBody,
    /// 413 `PayloadTooLargeError`: the body is over the function's cap.
    PayloadTooLarge,
    /// 500 `InternalError`: a failure the client can do nothing about. The
    /// cause is logged by [`ApiError::internal`] and never sent.
    Internal,
}

impl ApiError {
    pub fn validation(code: &'static str, message: impl Into<String>) -> Self {
        Self::Validation {
            code,
            message: message.into(),
        }
    }

    pub fn auth(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self::Auth {
            status,
            code,
            message: message.into(),
        }
    }

    /// An unexpected failure inside `function`. Logs `cause` at `error` with the
    /// function name and answers the fixed [`Self::Internal`] message: the cause
    /// is for the log, not for the caller. `cause` must carry no request data
    /// (no field values, no secrets).
    pub fn internal(function: &str, cause: impl std::fmt::Display) -> Self {
        tracing::error!(function, %cause, "server function failed");
        Self::Internal
    }

    pub fn status(&self) -> StatusCode {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::CrossSite => StatusCode::FORBIDDEN,
            Self::Validation { .. } => StatusCode::BAD_REQUEST,
            Self::Auth { status, .. } => *status,
            Self::RateLimited { .. } => StatusCode::TOO_MANY_REQUESTS,
            Self::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED,
            Self::UnknownFunction => StatusCode::NOT_FOUND,
            Self::InvalidBody => StatusCode::BAD_REQUEST,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Unauthorized => "UnauthorizedError",
            Self::CrossSite => "CrossSiteRequestError",
            Self::Validation { .. } => "ValidationError",
            Self::Auth { .. } => "AuthError",
            Self::RateLimited { .. } => "RateLimitedError",
            Self::Unavailable => "AuthUnavailableError",
            Self::NotFound => "NotFoundError",
            Self::MethodNotAllowed => "MethodNotAllowedError",
            Self::UnknownFunction => "NotFoundError",
            Self::InvalidBody => "ValidationError",
            Self::PayloadTooLarge => "PayloadTooLargeError",
            Self::Internal => "InternalError",
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::Unauthorized => "UNAUTHORIZED",
            Self::CrossSite => "CROSS_SITE_REQUEST",
            Self::Validation { code, .. } | Self::Auth { code, .. } => code,
            Self::RateLimited { .. } => "RATE_LIMITED",
            Self::Unavailable => "AUTH_UNAVAILABLE",
            Self::NotFound => "NOT_FOUND",
            Self::MethodNotAllowed => "METHOD_NOT_ALLOWED",
            Self::UnknownFunction => "UNKNOWN_FUNCTION",
            Self::InvalidBody => "INVALID_BODY",
            Self::PayloadTooLarge => "PAYLOAD_TOO_LARGE",
            Self::Internal => "INTERNAL",
        }
    }

    pub fn message(&self) -> &str {
        match self {
            Self::Unauthorized => "Unauthorized",
            Self::CrossSite => CROSS_SITE_MESSAGE,
            Self::Validation { message, .. } | Self::Auth { message, .. } => message,
            Self::RateLimited { .. } => "Too many requests",
            Self::Unavailable => "Authentication is not available",
            Self::NotFound => "Not found",
            Self::MethodNotAllowed => "Method not allowed",
            Self::UnknownFunction => UNKNOWN_FUNCTION_MESSAGE,
            Self::InvalidBody => INVALID_BODY_MESSAGE,
            Self::PayloadTooLarge => "Request body is too large",
            Self::Internal => INTERNAL_MESSAGE,
        }
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.name(), self.message())
    }
}

impl std::error::Error for ApiError {}

/// Whole seconds, rounded up, and at least one.
fn retry_after_seconds(retry_after_ms: i64) -> i64 {
    (retry_after_ms.max(0).saturating_add(999) / 1000).max(1)
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = json!({
            "ok": false,
            "error": { "name": self.name(), "code": self.code(), "message": self.message() },
        });
        let mut response = (self.status(), Json(body)).into_response();
        let headers = response.headers_mut();
        headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
        if let Self::RateLimited { retry_after_ms } = self {
            headers.insert(
                RETRY_AFTER,
                HeaderValue::from(retry_after_seconds(retry_after_ms)),
            );
        }
        response
    }
}

/// A database failure is the service being unavailable. The cause is logged
/// (it carries no request data); the client learns nothing more.
fn unavailable(what: &str, source: Option<&(dyn std::error::Error + 'static)>) -> ApiError {
    tracing::error!(
        what,
        cause = source.map(ToString::to_string),
        "auth store failure"
    );
    ApiError::Unavailable
}

impl From<AuthError> for ApiError {
    fn from(error: AuthError) -> Self {
        unavailable("auth", error.source())
    }
}

impl From<RateLimitError> for ApiError {
    fn from(error: RateLimitError) -> Self {
        unavailable("rate limit", error.source())
    }
}

/// `200 {"ok":true,"result":...}`, never cached.
pub fn ok<T: Serialize>(result: T) -> Response {
    let mut response = Json(json!({ "ok": true, "result": result })).into_response();
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_function_errors_have_fixed_names_codes_statuses_and_messages() {
        let cases = [
            (
                ApiError::UnknownFunction,
                404,
                "NotFoundError",
                "UNKNOWN_FUNCTION",
                "Unknown server function.",
            ),
            (
                ApiError::InvalidBody,
                400,
                "ValidationError",
                "INVALID_BODY",
                "Malformed request.",
            ),
            (
                ApiError::MethodNotAllowed,
                405,
                "MethodNotAllowedError",
                "METHOD_NOT_ALLOWED",
                "Method not allowed",
            ),
            (
                ApiError::PayloadTooLarge,
                413,
                "PayloadTooLargeError",
                "PAYLOAD_TOO_LARGE",
                "Request body is too large",
            ),
            (
                ApiError::Internal,
                500,
                "InternalError",
                "INTERNAL",
                "Server function failed.",
            ),
        ];
        for (error, status, name, code, message) in cases {
            assert_eq!(error.status().as_u16(), status, "{name}");
            assert_eq!(error.name(), name);
            assert_eq!(error.code(), code);
            assert_eq!(error.message(), message);
        }
    }
}
