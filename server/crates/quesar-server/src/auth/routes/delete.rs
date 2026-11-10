//! `POST /delete-account {password?}`: delete the signed-in user and their data.
//!
//! Ports Better Auth's `deleteUser` (`update-user.mjs`) with the
//! `beforeDelete` hook of `server.ts`:
//!
//! - A password is verified against the credential account. Without one, the
//!   session must be fresh.
//! - `purge_and_delete` removes the data and the user in one transaction; the
//!   external cleanups it calls may refuse, and then nothing is deleted.
//! - On success the session cookie is cleared (the sessions went with the user).

use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use quesar_auth::deletion::{DeletionError, purge_and_delete};
use quesar_auth::password::Password;
use quesar_auth::{email_password, session, validate};
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::json;

use crate::auth::ApiError;
use crate::auth::error::ok;
use crate::auth::extract::{AuthUser, SameOrigin};
use crate::auth::hashing::HashingError;
use crate::auth::issue::with_cookie;
use crate::auth::json;
use crate::router::AppState;

#[derive(Deserialize)]
struct DeleteBody {
    /// Absent and empty both mean "no password", as an empty
    /// `body.password` is falsy in Better Auth.
    #[serde(default = "json::empty_password", deserialize_with = "json::password")]
    password: Password,
}

fn bad_request(code: &'static str, message: &'static str) -> ApiError {
    ApiError::auth(StatusCode::BAD_REQUEST, code, message)
}

fn hashing_failed(error: HashingError) -> ApiError {
    tracing::error!(%error, "password verification failed");
    ApiError::Unavailable
}

pub async fn delete_account(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    // Per user, before any password work: a stolen session cannot be used to
    // guess the password quickly. The purge deletes this counter with the rest.
    services
        .limit(Bucket::AuthCredential, &auth.user.id)
        .await?;
    let input: DeleteBody = json::read(&headers, body).await?;

    if input.password.expose().is_empty() {
        if !session::is_fresh(&auth.session, services.clock.now()) {
            return Err(bad_request(
                "SESSION_EXPIRED",
                "Session expired. Re-authenticate to perform this action.",
            ));
        }
    } else {
        validate::password_max(input.password.expose())
            .map_err(|error| ApiError::validation(error.code(), error.to_string()))?;
        let Some(hash) = email_password::credential_hash(&services.pool, &auth.user.id).await?
        else {
            return Err(bad_request(
                "CREDENTIAL_ACCOUNT_NOT_FOUND",
                "Credential account not found",
            ));
        };
        let matches = services
            .hashing
            .verify(input.password, hash)
            .await
            .map_err(hashing_failed)?;
        if !matches {
            return Err(bad_request("INVALID_PASSWORD", "Invalid password"));
        }
    }

    match purge_and_delete(&services.pool, &auth.user.id, &services.deletion).await {
        Ok(report) => {
            tracing::info!(
                workspace = report.workspace.len(),
                inquiries_unlinked = report.inquiries_unlinked,
                "account deleted"
            );
        }
        Err(DeletionError::Commerce(error)) => {
            tracing::warn!(%error, "account deletion refused by the commerce cleanup");
            return Err(ApiError::auth(
                StatusCode::SERVICE_UNAVAILABLE,
                "DELETION_UNAVAILABLE",
                "Account deletion is not available right now. Nothing was deleted.",
            ));
        }
        Err(error @ DeletionError::Database(_)) => {
            tracing::error!(%error, "account deletion failed");
            return Err(ApiError::auth(
                StatusCode::INTERNAL_SERVER_ERROR,
                "DELETION_FAILED",
                "Account deletion did not finish.",
            ));
        }
    }
    with_cookie(ok(json!({})), &session::clear_cookie())
}
