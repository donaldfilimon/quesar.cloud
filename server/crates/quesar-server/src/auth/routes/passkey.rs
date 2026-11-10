//! Passkeys: registration, sign-in, listing and deletion.
//!
//! Ports `@better-auth/passkey` (`index.mjs`). Registration needs a fresh
//! session (`freshSessionMiddleware` on both registration endpoints);
//! deletion needs only a session that owns the key (`requireResourceOwnership`),
//! as in the TypeScript. The ceremony state lives in an `auth_flows` row the
//! client only names (`flowId`); the browser that began it also holds a
//! `__Host-` binding cookie, and a finish call without it is refused.

use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use quesar_auth::passkey::authenticate::{self, VerifyError};
use quesar_auth::passkey::flow::{self, Ceremony, Started};
use quesar_auth::passkey::{
    Passkeys, PublicKeyCredential, RegisterPublicKeyCredential, register, store,
};
use quesar_auth::{AuthError, session};
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::auth::error::ok;
use crate::auth::extract::{AuthUser, ClientIp, SameOrigin};
use crate::auth::issue::{issue_session, with_cookie};
use crate::auth::view::{PasskeyView, UserAndSession};
use crate::auth::{ApiError, AuthServices, json};
use crate::router::AppState;

fn challenge_not_found() -> ApiError {
    ApiError::auth(
        StatusCode::BAD_REQUEST,
        "CHALLENGE_NOT_FOUND",
        "Challenge not found",
    )
}

fn registration_failed() -> ApiError {
    ApiError::auth(
        StatusCode::BAD_REQUEST,
        "PASSKEY_REGISTRATION_FAILED",
        "Failed to verify registration",
    )
}

/// The one failure of every bad sign-in: an unknown credential, a handle that
/// does not match, a signature that does not verify and a possibly cloned key
/// look the same.
fn authentication_failed() -> ApiError {
    ApiError::auth(
        StatusCode::UNAUTHORIZED,
        "PASSKEY_AUTHENTICATION_FAILED",
        "Authentication failed",
    )
}

/// The relying party, or 404 when the configured origin cannot host passkeys.
fn passkeys(services: &AuthServices) -> Result<&Passkeys, ApiError> {
    services.passkeys().ok_or_else(|| {
        ApiError::auth(
            StatusCode::NOT_FOUND,
            "PASSKEYS_NOT_AVAILABLE",
            "Passkeys are not available",
        )
    })
}

fn require_fresh(services: &AuthServices, auth: &AuthUser) -> Result<(), ApiError> {
    if session::is_fresh(&auth.session, services.clock.now()) {
        Ok(())
    } else {
        Err(ApiError::auth(
            StatusCode::FORBIDDEN,
            "SESSION_NOT_FRESH",
            "Session is not fresh",
        ))
    }
}

/// `{flowId, options}` with the binding cookie.
fn begun(ceremony: Ceremony, started: &Started, options: Value) -> Result<Response, ApiError> {
    let response = ok(json!({ "flowId": started.flow_id, "options": options }));
    with_cookie(response, &flow::binding_cookie(ceremony, &started.binding))
}

/// A ceremony is finished with the cookie of the browser that began it.
fn binding_of(ceremony: Ceremony, headers: &HeaderMap) -> Result<String, ApiError> {
    flow::read_binding_cookie(ceremony, headers).ok_or_else(challenge_not_found)
}

fn log_begin(error: impl std::fmt::Debug) -> ApiError {
    tracing::error!(?error, "cannot start a passkey ceremony");
    ApiError::Unavailable
}

/// `POST /passkey/register/options`.
pub async fn register_options(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let relying_party = passkeys(services)?;
    require_fresh(services, &auth)?;
    let begun_flow = register::begin(
        relying_party,
        &services.pool,
        &auth.user,
        services.clock.now(),
    )
    .await
    .map_err(|error| match error {
        register::BeginError::Store(error) => ApiError::from(error),
        register::BeginError::Webauthn(error) => log_begin(error),
    })?;
    begun(Ceremony::Register, &begun_flow.started, begun_flow.options)
}

#[derive(Deserialize)]
struct RegisterBody {
    #[serde(default, rename = "flowId")]
    flow_id: String,
    #[serde(default)]
    credential: Value,
    #[serde(default)]
    name: Option<String>,
}

/// `POST /passkey/register/verify`.
pub async fn register_verify(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let relying_party = passkeys(services)?;
    require_fresh(services, &auth)?;
    let input: RegisterBody = json::read(&headers, body).await?;
    let binding = binding_of(Ceremony::Register, &headers)?;
    // Matches the flow's owner in the statement: another user's flow id finds
    // nothing and is not consumed.
    let taken = flow::consume(
        &services.pool,
        Ceremony::Register,
        &input.flow_id,
        Some(&auth.user.id),
        services.clock.now(),
    )
    .await?
    .filter(|taken| taken.binding_matches(&binding))
    .ok_or_else(challenge_not_found)?;
    let credential = serde_json::from_value::<RegisterPublicKeyCredential>(input.credential)
        .map_err(|_| registration_failed())?;
    let created = register::finish(
        relying_party,
        &services.pool,
        &auth.user.id,
        &taken,
        &credential,
        input.name.as_deref(),
        services.clock.now(),
    )
    .await?
    .ok_or_else(registration_failed)?;
    let response = ok(json!({ "passkey": PasskeyView::from(&created) }));
    with_cookie(response, &flow::clear_binding_cookie(Ceremony::Register))
}

/// `POST /passkey/authenticate/options`.
pub async fn authenticate_options(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthCredential, &ip.subject(services))
        .await?;
    let relying_party = passkeys(services)?;
    let begun_flow = authenticate::begin(relying_party, &services.pool, services.clock.now())
        .await
        .map_err(|error| match error {
            authenticate::BeginError::Store(error) => ApiError::from(error),
            authenticate::BeginError::Webauthn(error) => log_begin(error),
        })?;
    begun(
        Ceremony::Authenticate,
        &begun_flow.started,
        begun_flow.options,
    )
}

#[derive(Deserialize)]
struct AuthenticateBody {
    #[serde(default, rename = "flowId")]
    flow_id: String,
    #[serde(default)]
    credential: Value,
}

/// `POST /passkey/authenticate/verify`.
///
/// The flow is taken first, then the assertion is checked and the key's
/// counter updated on the same transaction that creates the session.
pub async fn authenticate_verify(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthCredential, &ip.subject(services))
        .await?;
    let relying_party = passkeys(services)?;
    let input: AuthenticateBody = json::read(&headers, body).await?;
    let binding = binding_of(Ceremony::Authenticate, &headers)?;
    let taken = flow::consume(
        &services.pool,
        Ceremony::Authenticate,
        &input.flow_id,
        None,
        services.clock.now(),
    )
    .await?
    .filter(|taken| taken.binding_matches(&binding))
    .ok_or_else(challenge_not_found)?;
    let credential = serde_json::from_value::<PublicKeyCredential>(input.credential)
        .map_err(|_| authentication_failed())?;

    let mut tx = services.pool.begin().await.map_err(AuthError::from)?;
    let user = authenticate::verify(
        relying_party,
        &mut tx,
        &taken,
        &credential,
        services.clock.now(),
    )
    .await
    .map_err(|error| match error {
        VerifyError::Rejected | VerifyError::PossibleClone => authentication_failed(),
        VerifyError::Store(error) => ApiError::from(error),
    })?;
    let issued = issue_session(services, tx, &user.id, &ip.0, &headers).await?;
    let response = ok(UserAndSession::new(&user, &issued.session));
    let response = with_cookie(response, &issued.cookie)?;
    with_cookie(
        response,
        &flow::clear_binding_cookie(Ceremony::Authenticate),
    )
}

/// `GET /passkeys`.
pub async fn list(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let rows = store::list(&services.pool, &auth.user.id).await?;
    let passkeys: Vec<PasskeyView> = rows.iter().map(PasskeyView::from).collect();
    Ok(ok(json!({ "passkeys": passkeys })))
}

#[derive(Deserialize)]
struct DeleteBody {
    #[serde(default)]
    id: String,
}

/// `POST /passkey/delete {id}`: one of the caller's own keys.
pub async fn delete(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let input: DeleteBody = json::read(&headers, body).await?;
    if store::delete(&services.pool, &auth.user.id, &input.id).await? {
        Ok(ok(json!({})))
    } else {
        Err(ApiError::NotFound)
    }
}
