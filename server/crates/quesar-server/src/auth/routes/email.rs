//! Email and password: sign-up, sign-in and sign-out.
//!
//! Ports `sign-up.mjs`, `sign-in.mjs` and the name hook in `server.ts`. A
//! failed sign-in is the same response, and the same one hash verification,
//! whether the email is unknown, has no password or the password is wrong.

use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use quesar_auth::email_password::{self, Credentials, NewUser};
use quesar_auth::password::Password;
use quesar_auth::validate::{self, ValidationError};
use quesar_auth::{AuthError, session};
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::json;

use crate::auth::ApiError;
use crate::auth::error::ok;
use crate::auth::extract::{ClientIp, SameOrigin};
use crate::auth::hashing::HashingError;
use crate::auth::issue::{issue_session, with_cookie};
use crate::auth::json;
use crate::auth::view::UserAndSession;
use crate::router::AppState;

#[derive(Deserialize)]
struct SignUpBody {
    #[serde(default)]
    name: String,
    #[serde(default)]
    email: String,
    #[serde(default = "json::empty_password", deserialize_with = "json::password")]
    password: Password,
}

#[derive(Deserialize)]
struct SignInBody {
    #[serde(default)]
    email: String,
    #[serde(default = "json::empty_password", deserialize_with = "json::password")]
    password: Password,
}

fn invalid(error: ValidationError) -> ApiError {
    ApiError::validation(error.code(), error.to_string())
}

fn user_exists() -> ApiError {
    ApiError::auth(
        StatusCode::UNPROCESSABLE_ENTITY,
        "USER_ALREADY_EXISTS",
        "User already exists. Use another email.",
    )
}

/// The one failure of every bad sign-in.
fn invalid_credentials() -> ApiError {
    ApiError::auth(
        StatusCode::UNAUTHORIZED,
        "INVALID_EMAIL_OR_PASSWORD",
        "Invalid email or password",
    )
}

fn hashing_failed(error: HashingError) -> ApiError {
    tracing::error!(%error, "password hashing failed");
    ApiError::Unavailable
}

pub async fn sign_up(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit_route(Bucket::AuthCredential, "sign-up", &ip.subject(services))
        .await?;
    let input: SignUpBody = json::read(&headers, body).await?;
    let (name, email) =
        email_password::validate_sign_up(&input.name, &input.email, input.password.expose())
            .map_err(invalid)?;
    // Sign-up cannot hide that an email is registered (no mailer), so refuse
    // before spending a hash. The insert below still decides a race.
    if email_password::email_exists(&services.pool, &email).await? {
        return Err(user_exists());
    }
    let hash = services
        .hashing
        .hash(input.password)
        .await
        .map_err(hashing_failed)?;

    let mut tx = services.pool.begin().await.map_err(AuthError::from)?;
    let user = match email_password::create_user_with_password(
        &mut tx,
        &name,
        &email,
        &hash,
        services.clock.now(),
    )
    .await?
    {
        NewUser::Created(user) => user,
        NewUser::EmailTaken => return Err(user_exists()),
    };
    let issued = issue_session(services, tx, &user.id, &ip.0, &headers).await?;
    with_cookie(
        ok(UserAndSession::new(&user, &issued.session)),
        &issued.cookie,
    )
}

pub async fn sign_in(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit_route(Bucket::AuthCredential, "sign-in", &ip.subject(services))
        .await?;
    let input: SignInBody = json::read(&headers, body).await?;
    let email = validate::email(&input.email).map_err(invalid)?;
    // Only the maximum: a short password must cost a hash and fail like any
    // wrong one, not answer differently.
    validate::password_max(input.password.expose()).map_err(invalid)?;

    let user = match email_password::find_credentials(&services.pool, &email).await? {
        Some(Credentials {
            user,
            password: Some(hash),
        }) => services
            .hashing
            .verify(input.password, hash)
            .await
            .map_err(hashing_failed)?
            .then_some(user),
        // No such user, or one with no password: the same work, then the same answer.
        _ => {
            services
                .hashing
                .verify_unknown(input.password)
                .await
                .map_err(hashing_failed)?;
            None
        }
    };
    let Some(user) = user else {
        return Err(invalid_credentials());
    };

    // `issue_session` also drops the session the client presented.
    let tx = services.pool.begin().await.map_err(AuthError::from)?;
    let issued = issue_session(services, tx, &user.id, &ip.0, &headers).await?;
    with_cookie(
        ok(UserAndSession::new(&user, &issued.session)),
        &issued.cookie,
    )
}

pub async fn sign_out(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthGeneral, &ip.subject(services))
        .await?;
    if let Some(presented) = session::read_cookie(&headers) {
        session::delete_by_token(&services.pool, &presented).await?;
    }
    with_cookie(ok(json!({})), &session::clear_cookie())
}
