//! Reading a credential-bearing JSON body.
//!
//! The body is read under a cap, parsed straight into the request type and
//! then overwritten, so a password does not sit in a freed buffer. Request
//! types must not derive `Debug` over a plain `String` password: use
//! [`password`] with `#[serde(deserialize_with)]`, which builds the redacted,
//! zeroizing [`Password`] directly from the parser.

use std::fmt;

use axum::body::Body;
use axum::http::{HeaderMap, StatusCode};
use quesar_auth::password::Password;
use serde::de::{self, DeserializeOwned, Deserializer, Visitor};
use zeroize::Zeroize;

use super::error::ApiError;
use crate::body_limit::{BodyLimitError, read_body_limited};

/// Sign-up, sign-in and profile bodies are a few hundred bytes.
pub const AUTH_BODY_MAX: usize = 16 * 1024;

pub async fn read<T: DeserializeOwned>(headers: &HeaderMap, body: Body) -> Result<T, ApiError> {
    let bytes = read_body_limited(headers, body, AUTH_BODY_MAX)
        .await
        .map_err(|error| match error {
            BodyLimitError::TooLarge | BodyLimitError::Aborted => ApiError::auth(
                StatusCode::PAYLOAD_TOO_LARGE,
                "PAYLOAD_TOO_LARGE",
                "Request body is too large",
            ),
            BodyLimitError::InvalidJson => invalid_body(),
        })?;
    let parsed = serde_json::from_slice::<T>(&bytes);
    // Best effort: zero the buffer when nothing else shares it.
    if let Ok(mut unique) = bytes.try_into_mut() {
        unique.as_mut().zeroize();
    }
    parsed.map_err(|_| invalid_body())
}

fn invalid_body() -> ApiError {
    ApiError::validation("INVALID_BODY", "Invalid request body")
}

/// `#[serde(deserialize_with = "json::password")]`
pub fn password<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Password, D::Error> {
    struct PasswordVisitor;

    impl Visitor<'_> for PasswordVisitor {
        type Value = Password;

        fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.write_str("a string")
        }

        fn visit_str<E: de::Error>(self, value: &str) -> Result<Password, E> {
            Ok(Password::new(value))
        }

        fn visit_string<E: de::Error>(self, value: String) -> Result<Password, E> {
            Ok(Password::new(value))
        }
    }

    deserializer.deserialize_string(PasswordVisitor)
}

/// For a missing `password` field: an empty password, which fails like any
/// wrong one.
pub fn empty_password() -> Password {
    Password::new("")
}
