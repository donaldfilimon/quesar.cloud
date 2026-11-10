//! Reading a function's JSON input.
//!
//! The body is read under a cap, parsed straight into the request type and
//! then overwritten. That is best effort: the final buffer is zeroed;
//! earlier reallocations and hyper's frames are not. Request types that hold a
//! secret must not derive `Debug` over a plain `String`: see
//! [`crate::auth::json::password`].

use axum::body::{Body, Bytes};
use axum::http::HeaderMap;
use serde::de::DeserializeOwned;
use serde_json::Value;
use zeroize::Zeroize;

use super::error::ApiError;
use crate::body_limit::{BodyLimitError, read_body_limited};

/// The default cap on a function's input.
pub const FN_BODY_MAX: usize = 16 * 1024;

async fn read_bytes(headers: &HeaderMap, body: Body, max: usize) -> Result<Bytes, ApiError> {
    read_body_limited(headers, body, max)
        .await
        .map_err(|error| match error {
            BodyLimitError::TooLarge | BodyLimitError::Aborted => ApiError::PayloadTooLarge,
            BodyLimitError::InvalidJson => ApiError::InvalidBody,
        })
}

/// Zeroes the buffer when nothing else shares it.
fn scrub(bytes: Bytes) {
    if let Ok(mut unique) = bytes.try_into_mut() {
        unique.as_mut().zeroize();
    }
}

/// The body as a `T`: over `max` bytes is [`ApiError::PayloadTooLarge`], and
/// anything `serde` refuses (not JSON, wrong shape, wrong field type) is
/// [`ApiError::InvalidBody`].
pub async fn read<T: DeserializeOwned>(
    headers: &HeaderMap,
    body: Body,
    max: usize,
) -> Result<T, ApiError> {
    let bytes = read_bytes(headers, body, max).await?;
    let parsed = serde_json::from_slice::<T>(&bytes);
    scrub(bytes);
    parsed.map_err(|_| ApiError::InvalidBody)
}

/// As [`read`], untyped, for a handler that coerces its fields itself (a
/// missing or non-string member counts as empty, as in the TypeScript).
pub async fn read_value(headers: &HeaderMap, body: Body, max: usize) -> Result<Value, ApiError> {
    read::<Value>(headers, body, max).await
}
