//! Server-side sessions and the session cookie.
//!
//! Only the SHA-256 of the cookie token is stored (`auth_sessions.token_hash`).
//! Every lookup goes to the database; there is no cache, so a revoke takes
//! effect on the next request. Lifetimes are Better Auth 1.7.19's defaults:
//! 7 days, refreshed once a day of age has passed.

use std::collections::hash_map::RandomState;
use std::hash::BuildHasher;

use http::{HeaderMap, header};
use sqlx::{PgConnection, PgPool};
use time::{Duration, OffsetDateTime};

use crate::error::AuthError;
use crate::ids::new_id;
use crate::rows::{SessionRow, UserRow};
use crate::token::{SecretToken, token_hash};

pub const SESSION_TTL: Duration = Duration::days(7);
pub const UPDATE_AGE: Duration = Duration::days(1);
pub const FRESH_AGE: Duration = Duration::days(1);
pub const COOKIE_NAME: &str = "__Host-quesar.session_token";

const USER_AGENT_MAX: usize = 512;
const TOKEN_LEN: usize = 43;
/// About one creation in this many also prunes expired rows.
const PRUNE_ONE_IN: u64 = 50;

const SESSION_COLUMNS: &str =
    "id, user_id, token_hash, created_at, updated_at, expires_at, ip_address, user_agent";

/// Stores a new session and returns it with the token to give the client.
/// `ip` is the raw client IP; Better Auth stores and shows it.
///
/// The caller must emit the cookie only after the transaction commits: a
/// rolled-back session leaves the client holding a token that matches nothing.
pub async fn create(
    tx: &mut PgConnection,
    user_id: &str,
    ip: Option<&str>,
    user_agent: Option<&str>,
    now: OffsetDateTime,
) -> Result<(SessionRow, SecretToken), AuthError> {
    let token = SecretToken::generate();
    let row: SessionRow = sqlx::query_as(&format!(
        "insert into auth_sessions
           (id, user_id, token_hash, created_at, updated_at, expires_at, ip_address, user_agent)
         values ($1, $2, $3, $4, $4, $5, $6, $7)
         returning {SESSION_COLUMNS}"
    ))
    .bind(new_id())
    .bind(user_id)
    .bind(token.hash().to_vec())
    .bind(now)
    .bind(now + SESSION_TTL)
    .bind(ip)
    .bind(user_agent.map(truncate_user_agent))
    .fetch_one(tx)
    .await?;
    Ok((row, token))
}

fn truncate_user_agent(value: &str) -> &str {
    if value.len() <= USER_AGENT_MAX {
        return value;
    }
    let mut end = USER_AGENT_MAX;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    &value[..end]
}

/// Finds the session and user a presented token belongs to.
///
/// An expired row is deleted and resolves to `None`. A session a day or more
/// past its last extension is extended to a full lifetime (`refreshed`). The
/// lookup by hash goes through a unique index; see [`token_hash`] for why that
/// needs no constant-time comparison.
pub async fn resolve(
    pool: &PgPool,
    token: &str,
    now: OffsetDateTime,
) -> Result<Option<(SessionRow, UserRow, bool)>, AuthError> {
    let row: Option<SessionRow> = sqlx::query_as(&format!(
        "select {SESSION_COLUMNS} from auth_sessions where token_hash = $1"
    ))
    .bind(token_hash(token).to_vec())
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    if row.expires_at <= now {
        sqlx::query("delete from auth_sessions where id = $1 and expires_at <= $2")
            .bind(&row.id)
            .bind(now)
            .execute(pool)
            .await?;
        return Ok(None);
    }
    let Some((row, refreshed)) = refresh_if_due(pool, row, now).await? else {
        return Ok(None);
    };
    let user: Option<UserRow> = sqlx::query_as(
        r#"select id, name, email, "emailVerified", image, "createdAt", "updatedAt"
           from "user" where id = $1"#,
    )
    .bind(&row.user_id)
    .fetch_optional(pool)
    .await?;
    Ok(user.map(|user| (row, user, refreshed)))
}

/// Extends `row` to a full lifetime when `UPDATE_AGE` has passed since its
/// last extension. `None` when the row is gone or expired (a concurrent revoke,
/// or a caller holding a dead row).
///
/// The update is a compare-and-swap on the `expires_at` the caller read and
/// requires the row to be unexpired at `now`, so it never revives a dead
/// session, never shortens a newer refresh, and of two concurrent refreshes
/// exactly one reports `refreshed = true`; the loser gets the winner's row.
pub async fn refresh_if_due(
    pool: &PgPool,
    row: SessionRow,
    now: OffsetDateTime,
) -> Result<Option<(SessionRow, bool)>, AuthError> {
    if row.expires_at <= now {
        return Ok(None);
    }
    if row.expires_at - SESSION_TTL + UPDATE_AGE > now {
        return Ok(Some((row, false)));
    }
    let refreshed: Option<SessionRow> = sqlx::query_as(&format!(
        "update auth_sessions set expires_at = $2, updated_at = $3
         where id = $1 and expires_at = $4 and expires_at > $3
         returning {SESSION_COLUMNS}"
    ))
    .bind(&row.id)
    .bind(now + SESSION_TTL)
    .bind(now)
    .bind(row.expires_at)
    .fetch_optional(pool)
    .await?;
    if let Some(updated) = refreshed {
        return Ok(Some((updated, true)));
    }
    // Lost a race: the row is revoked, expired, or already refreshed.
    let current: Option<SessionRow> = sqlx::query_as(&format!(
        "select {SESSION_COLUMNS} from auth_sessions where id = $1 and expires_at > $2"
    ))
    .bind(&row.id)
    .bind(now)
    .fetch_optional(pool)
    .await?;
    Ok(current.map(|row| (row, false)))
}

/// Revokes one of the user's own sessions. False when the id is not theirs.
pub async fn revoke(pool: &PgPool, user_id: &str, session_id: &str) -> Result<bool, AuthError> {
    let result = sqlx::query("delete from auth_sessions where id = $1 and user_id = $2")
        .bind(session_id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

/// Revokes every session of the user except `keep_id`; returns how many.
pub async fn revoke_others(pool: &PgPool, user_id: &str, keep_id: &str) -> Result<u64, AuthError> {
    let result = sqlx::query("delete from auth_sessions where user_id = $1 and id <> $2")
        .bind(user_id)
        .bind(keep_id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}

/// Sign-out: deletes the session a presented token belongs to.
pub async fn delete_by_token(pool: &PgPool, token: &str) -> Result<bool, AuthError> {
    let result = sqlx::query("delete from auth_sessions where token_hash = $1")
        .bind(token_hash(token).to_vec())
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

/// The user's unexpired sessions, newest first.
pub async fn list(
    pool: &PgPool,
    user_id: &str,
    now: OffsetDateTime,
) -> Result<Vec<SessionRow>, AuthError> {
    Ok(sqlx::query_as(&format!(
        "select {SESSION_COLUMNS} from auth_sessions
         where user_id = $1 and expires_at > $2
         order by created_at desc, id"
    ))
    .bind(user_id)
    .bind(now)
    .fetch_all(pool)
    .await?)
}

/// Whether the session is recent enough for sensitive actions.
pub fn is_fresh(row: &SessionRow, now: OffsetDateTime) -> bool {
    now - row.created_at < FRESH_AGE
}

/// Deletes expired sessions and expired `auth_flows`; returns the rows removed.
pub async fn prune_expired(pool: &PgPool, now: OffsetDateTime) -> Result<u64, AuthError> {
    let sessions = sqlx::query("delete from auth_sessions where expires_at <= $1")
        .bind(now)
        .execute(pool)
        .await?;
    let flows = sqlx::query("delete from auth_flows where expires_at <= $1")
        .bind(now)
        .execute(pool)
        .await?;
    Ok(sessions.rows_affected() + flows.rows_affected())
}

/// Call after a creation: prunes on about 1 in 50 calls.
pub async fn maybe_prune(pool: &PgPool, now: OffsetDateTime) -> Result<(), AuthError> {
    if RandomState::new()
        .hash_one(now.unix_timestamp_nanos())
        .is_multiple_of(PRUNE_ONE_IN)
    {
        prune_expired(pool, now).await?;
    }
    Ok(())
}

fn cookie_attributes(value: &str, max_age: i64) -> String {
    format!("{COOKIE_NAME}={value}; Path=/; Max-Age={max_age}; HttpOnly; Secure; SameSite=Lax")
}

/// The `Set-Cookie` value for a new session. No `Domain`, as `__Host-` needs.
pub fn set_cookie(token: &SecretToken) -> String {
    cookie_attributes(token.expose(), SESSION_TTL.whole_seconds())
}

/// The `Set-Cookie` value that re-issues a presented token after `resolve`
/// reported `refreshed`, so the browser cookie lives as long as the session.
/// `None` unless the text passes the same 43-character base64url gate as
/// [`read_cookie`]; this is the only way to turn presented text into a cookie.
pub fn set_cookie_for_presented(token: &str) -> Option<String> {
    well_formed(token).then(|| cookie_attributes(token, SESSION_TTL.whole_seconds()))
}

/// The `Set-Cookie` value that removes the session cookie.
pub fn clear_cookie() -> String {
    cookie_attributes("", 0)
}

/// The session token from the request's `Cookie` headers, if well-formed.
///
/// Takes the first cookie of that name across all headers; a value that is not
/// 43 base64url characters counts as absent, so no database call is made.
pub fn read_cookie(headers: &HeaderMap) -> Option<String> {
    let value = headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|header| header.to_str().ok())
        .flat_map(|header| header.split(';'))
        .find_map(|pair| {
            let (name, value) = pair.trim().split_once('=')?;
            (name == COOKIE_NAME).then_some(value)
        })?;
    well_formed(value).then(|| value.to_owned())
}

fn well_formed(value: &str) -> bool {
    value.len() == TOKEN_LEN
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}
