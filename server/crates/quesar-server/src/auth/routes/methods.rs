//! `GET /methods`: which sign-in buttons to show (`signInMethods` in
//! `methods.server.ts`).

use std::sync::Arc;

use axum::extract::State;
use axum::response::Response;
use quesar_services::rate_limit::Bucket;
use serde::Serialize;

use crate::auth::error::ok;
use crate::auth::extract::{ClientIp, FetchMetadata};
use crate::auth::{ApiError, AuthServices};
use crate::router::AppState;

#[derive(Debug, Serialize)]
struct Methods {
    email: bool,
    passkey: bool,
    social: Vec<&'static str>,
}

impl Methods {
    /// No database, or sign-in switched off with `VITE_AUTH_ENABLED=false`.
    fn none() -> Self {
        Self {
            email: false,
            passkey: false,
            social: Vec::new(),
        }
    }

    fn of(services: &AuthServices) -> Self {
        if !services.auth_enabled {
            return Self::none();
        }
        let providers = &services.config.providers;
        let mut social = Vec::new();
        if providers.google.is_some() {
            social.push("google");
        }
        // Apple is offered only when its private key mints a client secret.
        if services.apple().is_some() {
            social.push("apple");
        }
        if providers.twitter.is_some() {
            social.push("twitter");
        }
        Self {
            email: true,
            passkey: services.passkeys().is_some(),
            social,
        }
    }
}

/// Answers without a database (everything false); with one, it is rate limited
/// like any other endpoint.
pub async fn methods(
    _: FetchMetadata,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
) -> Result<Response, ApiError> {
    let Some(services) = state.auth.as_ref() else {
        return Ok(ok(Methods::none()));
    };
    services
        .limit(Bucket::AuthGeneral, &ip.subject(services))
        .await?;
    Ok(ok(Methods::of(services)))
}
