//! A ceremony's single-use `auth_flows` row and the cookie that binds it to
//! the browser that began it.
//!
//! This follows `oauth::flow`: the WebAuthn state (challenge, allowed
//! credentials) is stored here and never sent to the client, the row is taken
//! out in one `DELETE ... RETURNING` whose predicate includes expiry on the
//! injected clock, and the finish call must also present the binding cookie
//! whose hash is stored. The client holds only the flow id.

use std::fmt;

use http::{HeaderMap, header};
use sqlx::{PgPool, Row};
use subtle::ConstantTimeEq;
use time::OffsetDateTime;

use super::CEREMONY_TTL;
use crate::error::AuthError;
use crate::ids::new_id;
use crate::session;
use crate::token::{SecretToken, token_hash};

/// `SecretToken` text length: 32 bytes as unpadded base64url.
const TOKEN_LEN: usize = 43;

/// The two ceremonies. Each has its own flow kind and binding cookie, so a
/// registration in one tab does not break a sign-in in another.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Ceremony {
    Register,
    Authenticate,
}

impl Ceremony {
    fn kind(self) -> &'static str {
        match self {
            Self::Register => "passkey_register",
            Self::Authenticate => "passkey_authenticate",
        }
    }

    pub fn cookie_name(self) -> &'static str {
        match self {
            Self::Register => "__Host-quesar.passkey_register_binding",
            Self::Authenticate => "__Host-quesar.passkey_authenticate_binding",
        }
    }
}

/// A flow just stored: what goes to the browser.
pub struct Started {
    /// The row id the client sends back as `flowId`. 32 random alphanumerics.
    pub flow_id: String,
    /// The binding cookie value.
    pub binding: SecretToken,
}

impl fmt::Debug for Started {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Started")
            .field("flow_id", &self.flow_id)
            .finish_non_exhaustive()
    }
}

/// Stores a ceremony expiring after [`CEREMONY_TTL`]. `user_id` is the signed-in
/// user for a registration and `None` for a sign-in. Prunes expired rows now
/// and then; a prune failure is not the caller's problem.
pub async fn start(
    pool: &PgPool,
    ceremony: Ceremony,
    user_id: Option<&str>,
    payload: serde_json::Value,
    now: OffsetDateTime,
) -> Result<Started, AuthError> {
    let flow_id = new_id();
    let binding = SecretToken::generate();
    sqlx::query(
        "insert into auth_flows
           (id, kind, binding_hash, user_id, payload, created_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(&flow_id)
    .bind(ceremony.kind())
    .bind(binding.hash().as_slice())
    .bind(user_id)
    .bind(payload)
    .bind(now)
    .bind(now + CEREMONY_TTL)
    .execute(pool)
    .await?;
    if let Err(error) = session::maybe_prune(pool, now).await {
        tracing::warn!(%error, "pruning expired flows failed");
    }
    Ok(Started { flow_id, binding })
}

/// A flow taken out of the table. It is gone from the database whatever
/// happens next, so none of it can be used twice.
pub struct Taken {
    /// The stored WebAuthn state.
    pub payload: serde_json::Value,
    binding_hash: Vec<u8>,
}

impl fmt::Debug for Taken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Taken").finish_non_exhaustive()
    }
}

impl Taken {
    /// Whether `presented` (the binding cookie) is the one this flow was
    /// started with. Compared in constant time.
    pub fn binding_matches(&self, presented: &str) -> bool {
        let presented = token_hash(presented);
        bool::from(presented.as_slice().ct_eq(self.binding_hash.as_slice()))
    }
}

/// Takes the flow `flow_id` out of the table in one statement. The predicate
/// holds the ceremony kind and the owner (`user_id` for a registration, `None`
/// for a sign-in), so another user's id, or a sign-in id presented to the
/// registration endpoint, matches nothing and consumes nothing. An expired row
/// is deleted and reported as absent: expiry is judged in the same statement on
/// the injected clock.
///
/// The lookup is by a 32-character random id through the primary key, so it
/// leaks nothing an attacker can use and needs no constant-time compare; the
/// secret half, the binding, is compared in constant time by
/// [`Taken::binding_matches`].
pub async fn consume(
    pool: &PgPool,
    ceremony: Ceremony,
    flow_id: &str,
    user_id: Option<&str>,
    now: OffsetDateTime,
) -> Result<Option<Taken>, AuthError> {
    let row = sqlx::query(
        "delete from auth_flows
         where id = $1 and kind = $2 and user_id is not distinct from $3
         returning binding_hash, payload, (expires_at <= $4) as expired",
    )
    .bind(flow_id)
    .bind(ceremony.kind())
    .bind(user_id)
    .bind(now)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    let binding_hash: Option<Vec<u8>> = row.try_get("binding_hash")?;
    let payload: serde_json::Value = row.try_get("payload")?;
    let expired: bool = row.try_get("expired")?;
    match binding_hash {
        Some(binding_hash) if !expired => Ok(Some(Taken {
            payload,
            binding_hash,
        })),
        Some(_) => Ok(None),
        None => {
            // Not a row this module wrote.
            tracing::warn!("passkey flow row has no binding");
            Ok(None)
        }
    }
}

fn cookie_attributes(ceremony: Ceremony, value: &str, max_age: i64) -> String {
    format!(
        "{}={value}; Path=/; Max-Age={max_age}; HttpOnly; Secure; SameSite=Lax",
        ceremony.cookie_name()
    )
}

/// The `Set-Cookie` value that carries the binding to the browser.
pub fn binding_cookie(ceremony: Ceremony, binding: &SecretToken) -> String {
    cookie_attributes(ceremony, binding.expose(), CEREMONY_TTL.whole_seconds())
}

/// The `Set-Cookie` value that removes the binding cookie.
pub fn clear_binding_cookie(ceremony: Ceremony) -> String {
    cookie_attributes(ceremony, "", 0)
}

/// The binding from the request's `Cookie` headers: the first cookie of that
/// name, if it is 43 base64url characters.
pub fn read_binding_cookie(ceremony: Ceremony, headers: &HeaderMap) -> Option<String> {
    let name = ceremony.cookie_name();
    let value = headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|header| header.to_str().ok())
        .flat_map(|header| header.split(';'))
        .find_map(|pair| {
            let (candidate, value) = pair.trim().split_once('=')?;
            (candidate == name).then_some(value)
        })?;
    (value.len() == TOKEN_LEN
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_'))
    .then(|| value.to_owned())
}
