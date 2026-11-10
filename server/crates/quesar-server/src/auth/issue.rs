//! The one way a session is issued: sign-up, sign-in and (later) OAuth and
//! passkeys all end here.

use axum::http::header::{SET_COOKIE, USER_AGENT};
use axum::http::{HeaderMap, HeaderValue};
use axum::response::Response;
use quesar_auth::session;
use quesar_auth::{AuthError, SessionRow};
use sqlx::{Postgres, Transaction};

use super::AuthServices;
use super::error::ApiError;

/// A committed session and the `Set-Cookie` value that carries its token.
/// The token itself is not kept: it exists only inside `cookie`.
pub struct Issued {
    pub session: SessionRow,
    pub cookie: String,
}

impl std::fmt::Debug for Issued {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Issued")
            .field("session", &self.session.id)
            .finish_non_exhaustive()
    }
}

/// Creates the session in `tx`, commits, and only then builds the cookie, so a
/// rolled-back sign-up never hands out a token. Prunes expired rows now and
/// then; a prune failure is logged and never fails the request.
pub async fn issue_session(
    services: &AuthServices,
    mut tx: Transaction<'_, Postgres>,
    user_id: &str,
    ip: &str,
    headers: &HeaderMap,
) -> Result<Issued, ApiError> {
    let now = services.clock.now();
    let user_agent = headers
        .get(USER_AGENT)
        .and_then(|value| value.to_str().ok());
    let (session, token) = session::create(&mut tx, user_id, Some(ip), user_agent, now).await?;
    tx.commit().await.map_err(AuthError::from)?;
    let cookie = session::set_cookie(&token);
    if let Err(error) = session::maybe_prune(&services.pool, now).await {
        tracing::warn!(%error, "pruning expired sessions failed");
    }
    Ok(Issued { session, cookie })
}

/// Adds a `Set-Cookie` header. The values here are ASCII built by `session`,
/// so a rejection is a bug, not input.
pub fn with_cookie(mut response: Response, cookie: &str) -> Result<Response, ApiError> {
    let value = HeaderValue::from_str(cookie).map_err(|_| {
        tracing::error!("session cookie is not a valid header value");
        ApiError::Unavailable
    })?;
    response.headers_mut().append(SET_COOKIE, value);
    Ok(response)
}
