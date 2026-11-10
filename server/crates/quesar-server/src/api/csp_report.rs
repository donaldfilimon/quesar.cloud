//! `POST /api/csp-report`, the Content-Security-Policy violation sink
//! (`src/lib/server/csp-report.server.ts`).
//!
//! The policy ships report-only, so these reports are the only signal of what
//! an enforced policy would break. Nothing is stored: a report carries full
//! URLs and user-agent context, so the first [`CSP_LOG_LIMIT`] UTF-16 units go
//! to the log and nowhere else. Browsers post without credentials and expect a
//! fast, bodyless reply, so the handler never reads a cookie, never checks the
//! origin and never answers 5xx.
//!
//! The order matters: the limiter runs before the body is read, because the
//! read still buffers up to the cap. For that the handler takes the raw
//! request; a body extractor in its signature would read the body first.
//!
//! The report is attacker-controlled text. It is logged as one `Debug`-escaped
//! field, so a newline or an ANSI escape inside it cannot forge a log line or
//! repaint a terminal. Any other method is the enveloped 405.

use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use quesar_services::rate_limit::Bucket;
use serde_json::json;

use crate::api::method_not_allowed;
use crate::auth::extract::ClientIp;
use crate::body_limit::{CSP_REPORT_BODY_MAX, read_text_limited};
use crate::router::AppState;

/// Where the sink is mounted; `csp::REPORTING_ENDPOINTS` names the same path.
pub const MOUNT: &str = "/api/csp-report";

/// Only the first 2000 UTF-16 units of a report are logged
/// (`CSP_LOG_LIMIT` in `csp-report.server.ts`).
pub const CSP_LOG_LIMIT: usize = 2000;

fn no_content() -> Response {
    StatusCode::NO_CONTENT.into_response()
}

/// The longest prefix of `text` that is at most `limit` UTF-16 units.
///
/// JavaScript's `slice` may cut a surrogate pair in half; a Rust string cannot
/// hold half a character, so the whole character is dropped instead.
fn prefix_utf16(text: &str, limit: usize) -> &str {
    let mut units = 0;
    for (index, character) in text.char_indices() {
        units += character.len_utf16();
        if units > limit {
            return &text[..index];
        }
    }
    text
}

async fn csp_report(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    request: Request<Body>,
) -> Response {
    let (parts, body) = request.into_parts();

    // 1. Without a database there is no limiter; the report is dropped
    //    silently (one log line per request would be noise).
    let Some(services) = state.database() else {
        return no_content();
    };
    let now_ms =
        i64::try_from(services.clock.now().unix_timestamp_nanos() / 1_000_000).unwrap_or(i64::MAX);
    match services
        .limiter
        .hit(Bucket::CspReport, &ip.subject(services), now_ms)
        .await
    {
        Ok(hit) if hit.allowed => {}
        Ok(_) => {
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({ "error": "Too many requests. Try again shortly." })),
            )
                .into_response();
        }
        Err(_) => {
            tracing::error!("csp report rate limit unavailable");
            return no_content();
        }
    }

    // 2. The body: 64 KiB, as text (invalid UTF-8 is replaced).
    let raw = match read_text_limited(&parts.headers, body, CSP_REPORT_BODY_MAX).await {
        Ok(raw) => raw,
        Err(error) => return error.into_response(),
    };

    // 3. Two wire formats arrive (legacy `report-uri` and the Reporting API
    //    array); log whichever came, escaped, as one event.
    if !raw.is_empty() {
        tracing::warn!(report = ?prefix_utf16(&raw, CSP_LOG_LIMIT), "CSP violation report");
    }

    no_content()
}

/// The sink's router, to be nested at [`MOUNT`].
pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(csp_report))
        .method_not_allowed_fallback(method_not_allowed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_prefix_counts_utf16_units_not_bytes_or_chars() {
        assert_eq!(prefix_utf16("abc", 10), "abc");
        assert_eq!(prefix_utf16("abcdef", 3), "abc");
        assert_eq!(prefix_utf16("", 3), "");
        // U+00E9 is one unit (two bytes); U+1F600 is two units.
        assert_eq!(prefix_utf16("ééé", 2), "éé");
        assert_eq!(prefix_utf16("a\u{1F600}b", 3), "a\u{1F600}");
        // A pair that would straddle the limit is dropped whole.
        assert_eq!(prefix_utf16("a\u{1F600}b", 2), "a");
        assert_eq!(prefix_utf16("\u{1F600}", 1), "");
    }

    #[test]
    fn a_long_report_is_cut_at_exactly_the_limit() {
        let text = "x".repeat(5000);
        assert_eq!(prefix_utf16(&text, CSP_LOG_LIMIT).len(), CSP_LOG_LIMIT);
    }
}
