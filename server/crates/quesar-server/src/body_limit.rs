//! Byte-capped request body reads, for handlers that take bodies from clients
//! who are not signed in.
//!
//! Port of `src/lib/server/body-limit.server.ts`. Rate limiting caps request
//! count; this caps request size. `Content-Length` is only a cheap early exit:
//! chunked requests have none, and a client can lie, so the stream is counted.
//! Over the cap, or a stream that errors mid-read (a client aborting an
//! upload), is refused with 413, as in TypeScript.

use axum::Json;
use axum::body::{Body, Bytes};
use axum::extract::{FromRequest, Request};
use axum::http::header::CONTENT_LENGTH;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use http_body_util::BodyExt;
use serde_json::{Map, Value, json};

/// `/api/telemetry` (`telemetry.server.ts`: `readJsonLimited(req, 4 * 1024)`).
pub const TELEMETRY_BODY_MAX: usize = 4 * 1024;
/// `/api/csp-report` (`csp-report.server.ts`: `readBodyLimited(req, 64 * 1024)`).
pub const CSP_REPORT_BODY_MAX: usize = 64 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BodyLimitError {
    /// More than the cap, by `Content-Length` or by counting the stream.
    TooLarge,
    /// The stream failed before the end.
    Aborted,
    /// Not JSON, or JSON that is not an object (`null`, numbers, strings, arrays).
    InvalidJson,
}

impl std::fmt::Display for BodyLimitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::TooLarge => "request body is too large",
            Self::Aborted => "request body was interrupted",
            Self::InvalidJson => "request body is not a JSON object",
        })
    }
}

impl std::error::Error for BodyLimitError {}

impl IntoResponse for BodyLimitError {
    /// `payloadTooLarge()` (413) and `invalidJsonBody()` (400), with the same messages.
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::TooLarge | Self::Aborted => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "That's too much to send at once. Shorten it and try again.",
            ),
            Self::InvalidJson => (
                StatusCode::BAD_REQUEST,
                "We couldn't read that request. Reload the page and try again.",
            ),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

/// Reads at most `max` bytes. Stops reading, and drops the rest of the body,
/// the moment the running total passes `max`.
pub async fn read_body_limited(
    headers: &HeaderMap,
    mut body: Body,
    max: usize,
) -> Result<Bytes, BodyLimitError> {
    let declared = headers
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<u64>().ok());
    if declared.is_some_and(|declared| declared > max as u64) {
        return Err(BodyLimitError::TooLarge);
    }

    let mut collected: Vec<u8> = Vec::new();
    while let Some(frame) = body.frame().await {
        let frame = frame.map_err(|_| BodyLimitError::Aborted)?;
        let Ok(data) = frame.into_data() else {
            continue;
        };
        if collected.len() + data.len() > max {
            return Err(BodyLimitError::TooLarge);
        }
        collected.extend_from_slice(&data);
    }
    Ok(Bytes::from(collected))
}

/// `readBodyLimited`: the body as text (invalid UTF-8 is replaced, as `TextDecoder` does).
pub async fn read_text_limited(
    headers: &HeaderMap,
    body: Body,
    max: usize,
) -> Result<String, BodyLimitError> {
    let bytes = read_body_limited(headers, body, max).await?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// `readJsonLimited`: a capped body that must be a JSON object. Fields are not
/// validated; callers keep their own per-field checks.
pub async fn read_json_limited(
    headers: &HeaderMap,
    body: Body,
    max: usize,
) -> Result<Map<String, Value>, BodyLimitError> {
    let bytes = read_body_limited(headers, body, max).await?;
    match serde_json::from_slice::<Value>(&bytes) {
        Ok(Value::Object(object)) => Ok(object),
        _ => Err(BodyLimitError::InvalidJson),
    }
}

/// Extractor: the raw body, capped at `MAX` bytes.
#[derive(Debug)]
pub struct LimitedBytes<const MAX: usize>(pub Bytes);

impl<S: Send + Sync, const MAX: usize> FromRequest<S> for LimitedBytes<MAX> {
    type Rejection = BodyLimitError;

    async fn from_request(request: Request, _state: &S) -> Result<Self, Self::Rejection> {
        let (parts, body) = request.into_parts();
        read_body_limited(&parts.headers, body, MAX).await.map(Self)
    }
}

/// Extractor: a JSON object body, capped at `MAX` bytes.
#[derive(Debug)]
pub struct LimitedJson<const MAX: usize>(pub Map<String, Value>);

impl<S: Send + Sync, const MAX: usize> FromRequest<S> for LimitedJson<MAX> {
    type Rejection = BodyLimitError;

    async fn from_request(request: Request, _state: &S) -> Result<Self, Self::Rejection> {
        let (parts, body) = request.into_parts();
        read_json_limited(&parts.headers, body, MAX).await.map(Self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::channel::Channel;

    fn headers_with_length(length: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_LENGTH, length.parse().unwrap());
        headers
    }

    #[tokio::test]
    async fn a_body_at_the_cap_is_accepted_and_one_byte_over_is_refused() {
        let at = read_body_limited(&HeaderMap::new(), Body::from(vec![b'a'; 100]), 100).await;
        assert_eq!(at.unwrap().len(), 100);
        let over = read_body_limited(&HeaderMap::new(), Body::from(vec![b'a'; 101]), 100).await;
        assert_eq!(over.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[tokio::test]
    async fn an_empty_body_is_an_empty_string() {
        let text = read_text_limited(&HeaderMap::new(), Body::empty(), 10).await;
        assert_eq!(text.unwrap(), "");
    }

    #[tokio::test]
    async fn a_declared_length_over_the_cap_is_refused_without_reading() {
        // The body is empty but the header claims more than the cap.
        let refused = read_body_limited(&headers_with_length("101"), Body::empty(), 100).await;
        assert_eq!(refused.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[tokio::test]
    async fn a_lying_content_length_cannot_bypass_the_cap() {
        let body = Body::from(vec![b'a'; 500]);
        let refused = read_body_limited(&headers_with_length("5"), body, 100).await;
        assert_eq!(refused.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[tokio::test]
    async fn a_non_numeric_content_length_is_ignored_and_the_stream_is_counted() {
        let body = Body::from(vec![b'a'; 500]);
        let refused = read_body_limited(&headers_with_length("lots"), body, 100).await;
        assert_eq!(refused.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[tokio::test]
    async fn a_missing_content_length_cannot_bypass_the_cap() {
        let body = Body::from(vec![b'a'; 500]);
        let refused = read_body_limited(&HeaderMap::new(), body, 100).await;
        assert_eq!(refused.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[tokio::test]
    async fn a_chunked_body_over_the_cap_is_refused_without_buffering_the_rest() {
        let (mut sender, channel) = Channel::<Bytes>::new(1);
        let reader = tokio::spawn(async move {
            read_body_limited(&HeaderMap::new(), Body::new(channel), 100).await
        });
        // 60 + 60 passes the cap on the second chunk; the sender must then find
        // the reader gone, proving the remaining chunks were never consumed.
        sender.send_data(Bytes::from(vec![b'a'; 60])).await.unwrap();
        sender.send_data(Bytes::from(vec![b'a'; 60])).await.unwrap();
        assert_eq!(reader.await.unwrap().unwrap_err(), BodyLimitError::TooLarge);
        assert!(sender.send_data(Bytes::from(vec![b'a'; 60])).await.is_err());
    }

    #[tokio::test]
    async fn a_body_that_errors_mid_read_is_refused_like_an_oversize_one() {
        let (mut sender, channel) = Channel::<Bytes, std::io::Error>::new(1);
        let reader = tokio::spawn(async move {
            read_body_limited(&HeaderMap::new(), Body::new(channel), 100).await
        });
        sender.send_data(Bytes::from_static(b"abc")).await.unwrap();
        sender.abort(std::io::Error::other("client went away"));
        let error = reader.await.unwrap().unwrap_err();
        assert_eq!(error, BodyLimitError::Aborted);
        assert_eq!(
            error.into_response().status(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
    }

    #[tokio::test]
    async fn json_must_be_an_object_within_the_cap() {
        let ok = read_json_limited(&HeaderMap::new(), Body::from(r#"{"a":1}"#), 100).await;
        assert_eq!(ok.unwrap()["a"], 1);
        for raw in ["null", "5", r#""str""#, "true", "[]", "{nope"] {
            let refused = read_json_limited(&HeaderMap::new(), Body::from(raw), 100).await;
            assert_eq!(refused.unwrap_err(), BodyLimitError::InvalidJson, "{raw}");
        }
        let big = read_json_limited(&HeaderMap::new(), Body::from(r#"{"a":"xxxxxxxx"}"#), 8).await;
        assert_eq!(big.unwrap_err(), BodyLimitError::TooLarge);
    }

    #[test]
    fn refusals_use_the_typescript_statuses() {
        assert_eq!(
            BodyLimitError::TooLarge.into_response().status(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
        assert_eq!(
            BodyLimitError::InvalidJson.into_response().status(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn named_limits_match_the_typescript_call_sites() {
        assert_eq!(TELEMETRY_BODY_MAX, 4096);
        assert_eq!(CSP_REPORT_BODY_MAX, 65536);
    }

    #[tokio::test]
    async fn the_extractors_enforce_their_cap() {
        let small = Request::post("/").body(Body::from(r#"{"a":1}"#)).unwrap();
        let LimitedJson::<16>(object) = LimitedJson::from_request(small, &()).await.unwrap();
        assert_eq!(object["a"], 1);
        let big = Request::post("/").body(Body::from(vec![b'a'; 17])).unwrap();
        let refused = LimitedBytes::<16>::from_request(big, &()).await;
        assert_eq!(refused.unwrap_err(), BodyLimitError::TooLarge);
    }
}
