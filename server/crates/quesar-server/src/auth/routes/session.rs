//! The current session and the signed-in user's list of sessions.
//!
//! The session cookie is re-sent on refresh by the `auth` router's response
//! layer (`reissue`), not here.

use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use quesar_auth::session;
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::auth::ApiError;
use crate::auth::error::ok;
use crate::auth::extract::{AuthUser, ClientIp, MaybeUser, SameOrigin};
use crate::auth::json;
use crate::auth::view::{SessionListItem, UserAndSession};
use crate::router::AppState;

/// `GET /session`: `null` or `{user, session}`.
pub async fn current(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    MaybeUser(found): MaybeUser,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthGeneral, &ip.subject(services))
        .await?;
    Ok(match found {
        Some(found) => ok(UserAndSession::new(&found.user, &found.session)),
        None => ok(Value::Null),
    })
}

/// `GET /sessions`: only while this sign-in is under a day old.
pub async fn list(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let now = services.clock.now();
    if !session::is_fresh(&auth.session, now) {
        return Err(ApiError::auth(
            StatusCode::FORBIDDEN,
            "SESSION_NOT_FRESH",
            "Session is not fresh",
        ));
    }
    let sessions = session::list(&services.pool, &auth.user.id, now).await?;
    let items: Vec<_> = sessions
        .iter()
        .map(|row| SessionListItem::new(row, &auth.session.id))
        .collect();
    Ok(ok(json!({ "sessions": items })))
}

#[derive(Deserialize)]
struct RevokeBody {
    #[serde(default)]
    id: String,
}

/// `POST /sessions/revoke {id}`: one of the caller's own sessions, by id.
pub async fn revoke(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let input: RevokeBody = json::read(&headers, body).await?;
    if session::revoke(&services.pool, &auth.user.id, &input.id).await? {
        Ok(ok(json!({})))
    } else {
        Err(ApiError::NotFound)
    }
}

/// `POST /sessions/revoke-others`: every session but this one.
pub async fn revoke_others(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let revoked = session::revoke_others(&services.pool, &auth.user.id, &auth.session.id).await?;
    Ok(ok(json!({ "revoked": revoked })))
}
