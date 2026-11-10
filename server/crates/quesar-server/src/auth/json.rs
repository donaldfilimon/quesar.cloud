//! Reading a credential-bearing JSON body.
//!
//! The body is read under a cap, parsed straight into the request type and
//! then overwritten. That is best effort: the final buffer is zeroed;
//! earlier reallocations and hyper's frames are not. Request
//! types must not derive `Debug` over a plain `String` password: use
//! [`password`] with `#[serde(deserialize_with)]`, which builds the redacted,
//! zeroizing [`Password`] directly from the parser.

use std::fmt;

use axum::body::Body;
use axum::http::HeaderMap;
use quesar_auth::password::Password;
use serde::de::{self, DeserializeOwned, Deserializer, Visitor};

use super::error::ApiError;
use crate::api::body;

/// Sign-up, sign-in and profile bodies are a few hundred bytes.
pub const AUTH_BODY_MAX: usize = 16 * 1024;

/// [`body::read`] at [`AUTH_BODY_MAX`].
pub async fn read<T: DeserializeOwned>(headers: &HeaderMap, body: Body) -> Result<T, ApiError> {
    body::read(headers, body, AUTH_BODY_MAX).await
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
