//! The single-use OAuth flow: an `auth_flows` row from the redirect to the
//! callback, and the cookie that binds it to the browser that started it.
//!
//! Better Auth keeps this state in `verification` and checks a signed `state`
//! cookie too (`oauth2/state.mjs`, `state.mjs:60-90`); here the row holds the
//! SHA-256 of the state and of a separate binding value, and the binding
//! travels in a `__Host-` cookie (Contradiction 7). The state alone does not
//! sign anyone in: a callback must also present the binding of the browser
//! that began the flow, so a state planted by an attacker (login CSRF) fails.

use std::fmt;

use http::{HeaderMap, header};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use subtle::ConstantTimeEq;
use time::{Duration, OffsetDateTime};
use zeroize::Zeroizing;

use crate::error::AuthError;
use crate::ids::new_id;
use crate::oauth::pkce::Verifier;
use crate::oauth::provider::ProviderId;
use crate::session;
use crate::token::{SecretToken, token_hash};

/// A flow lives ten minutes (`expiresAt: Date.now() + 6e5`).
pub const FLOW_TTL: Duration = Duration::minutes(10);
pub const BINDING_COOKIE: &str = "__Host-quesar.oauth_binding";
/// `SecretToken` text length: 32 bytes as unpadded base64url.
const TOKEN_LEN: usize = 43;

/// What the callback needs, stored as the row's `payload`. Plain text for ten
/// minutes (risk 8 of the plan).
#[derive(Serialize, Deserialize)]
struct Payload {
    verifier: String,
    nonce: Option<String>,
    callback: String,
    #[serde(rename = "errorCallback")]
    error_callback: String,
    /// What a `form_post` callback delivered (Apple); absent until it did.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    posted: Option<Posted>,
}

/// What a cross-site `form_post` callback (Sign in with Apple) delivered,
/// parked on the flow until the same-site GET that completes it. Already
/// validated and size-capped by the route; `error` is one of our fixed codes,
/// never provider text.
#[derive(Clone, Serialize, Deserialize)]
pub struct Posted {
    pub code: Option<String>,
    pub error: Option<String>,
    /// The display name from Apple's first-sign-in `user` field.
    pub name: Option<String>,
}

impl fmt::Debug for Posted {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Posted").finish_non_exhaustive()
    }
}

/// An OIDC nonce: `Debug` is redacted and the text is wiped on drop.
pub struct Nonce(Zeroizing<String>);

impl Nonce {
    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for Nonce {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Nonce([redacted])")
    }
}

/// A flow just stored: the values that go to the browser.
pub struct Started {
    /// The `state` query parameter.
    pub state: SecretToken,
    /// The binding cookie value.
    pub binding: SecretToken,
    /// S256 challenge for the authorization URL.
    pub challenge: String,
    /// The `nonce` query parameter, for providers that sign one.
    pub nonce: Option<SecretToken>,
}

impl fmt::Debug for Started {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Started").finish_non_exhaustive()
    }
}

/// Stores a new flow. `callback` and `error_callback` must already have passed
/// [`crate::oauth::paths`]. Prunes expired rows now and then; a prune failure
/// is not the caller's problem.
pub async fn start(
    pool: &PgPool,
    provider: ProviderId,
    callback: &str,
    error_callback: &str,
    now: OffsetDateTime,
) -> Result<Started, AuthError> {
    let state = SecretToken::generate();
    let binding = SecretToken::generate();
    let verifier = Verifier::generate();
    let nonce = provider.uses_nonce().then(SecretToken::generate);
    let payload = Payload {
        verifier: verifier.expose().to_owned(),
        nonce: nonce.as_ref().map(|nonce| nonce.expose().to_owned()),
        callback: callback.to_owned(),
        error_callback: error_callback.to_owned(),
        posted: None,
    };
    // A struct of strings always serializes.
    let payload = serde_json::to_value(&payload).unwrap_or_default();
    sqlx::query(
        "insert into auth_flows
           (id, kind, provider, state_hash, binding_hash, payload, created_at, expires_at)
         values ($1, 'oauth', $2, $3, $4, $5, $6, $7)",
    )
    .bind(new_id())
    .bind(provider.as_str())
    .bind(state.hash().as_slice())
    .bind(binding.hash().as_slice())
    .bind(payload)
    .bind(now)
    .bind(now + FLOW_TTL)
    .execute(pool)
    .await?;
    if let Err(error) = session::maybe_prune(pool, now).await {
        tracing::warn!(%error, "pruning expired flows failed");
    }
    Ok(Started {
        state,
        binding,
        challenge: verifier.challenge(),
        nonce,
    })
}

/// A flow taken out of the table. It is gone from the database whatever
/// happens next, so none of it can be used twice.
pub struct Flow {
    /// The provider the flow was started for (`"google"`, ...).
    pub provider: String,
    pub verifier: Verifier,
    pub nonce: Option<Nonce>,
    pub callback: String,
    pub error_callback: String,
    /// Set when the provider answered by `form_post` ([`attach_post`]).
    pub posted: Option<Posted>,
    /// The injected clock had passed `expires_at` when the flow was taken.
    pub expired: bool,
    binding_hash: Vec<u8>,
}

impl fmt::Debug for Flow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Flow")
            .field("provider", &self.provider)
            .finish_non_exhaustive()
    }
}

impl Flow {
    /// Whether `presented` (the binding cookie) is the one this flow was
    /// started with. Compared in constant time.
    pub fn binding_matches(&self, presented: &str) -> bool {
        let presented = token_hash(presented);
        bool::from(presented.as_slice().ct_eq(self.binding_hash.as_slice()))
    }
}

/// Takes the flow for `state` out of the table in one statement
/// (`delete ... returning`), so a replayed callback finds nothing and two
/// concurrent ones cannot both win. Expiry is judged in the same statement
/// against the injected clock, and an expired row is deleted too.
///
/// The lookup is by the SHA-256 of 256 random bits through a unique index, so
/// it leaks nothing an attacker can use and needs no constant-time compare.
pub async fn consume(
    pool: &PgPool,
    state: &str,
    now: OffsetDateTime,
) -> Result<Option<Flow>, AuthError> {
    let row = sqlx::query(
        "delete from auth_flows where state_hash = $1 and kind = 'oauth'
         returning provider, binding_hash, payload, (expires_at <= $2) as expired",
    )
    .bind(token_hash(state).as_slice())
    .bind(now)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    let provider: Option<String> = row.try_get("provider")?;
    let binding_hash: Option<Vec<u8>> = row.try_get("binding_hash")?;
    let payload: serde_json::Value = row.try_get("payload")?;
    let expired: bool = row.try_get("expired")?;
    let (Some(provider), Some(binding_hash), Ok(payload)) = (
        provider,
        binding_hash,
        serde_json::from_value::<Payload>(payload),
    ) else {
        // Not a row this module wrote: treat it as no flow at all.
        tracing::warn!("oauth flow row is malformed");
        return Ok(None);
    };
    Ok(Some(Flow {
        provider,
        verifier: Verifier::from_stored(payload.verifier),
        nonce: payload.nonce.map(|nonce| Nonce(Zeroizing::new(nonce))),
        callback: payload.callback,
        error_callback: payload.error_callback,
        posted: payload.posted,
        expired,
        binding_hash,
    }))
}

/// What [`attach_post`] did.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Attach {
    /// Stored; the GET callback can now complete the flow.
    Stored,
    /// No such Apple flow.
    Unknown,
    /// The flow had expired; go to its error path.
    Expired { error_callback: String },
    /// This state was already posted once; go to its error path.
    AlreadyPosted { error_callback: String },
}

/// Parks what an Apple `form_post` delivered on the flow, once. The flow is
/// not consumed and nothing is exchanged: the same-site GET that follows does
/// that, with the binding cookie the cross-site POST cannot carry.
///
/// One `update` with the predicates in its `where`, so two racing posts cannot
/// both store, and expiry is judged on the injected clock. Lookup by the
/// SHA-256 of 256 random bits (see [`consume`]).
pub async fn attach_post(
    pool: &PgPool,
    state: &str,
    posted: &Posted,
    now: OffsetDateTime,
) -> Result<Attach, AuthError> {
    let hash = token_hash(state);
    // A struct of optional strings always serializes.
    let posted = serde_json::to_value(posted).unwrap_or_default();
    let stored = sqlx::query(
        "update auth_flows set payload = jsonb_set(payload, '{posted}', $3)
         where state_hash = $1 and kind = 'oauth' and provider = 'apple'
           and expires_at > $2 and not jsonb_exists(payload, 'posted')",
    )
    .bind(hash.as_slice())
    .bind(now)
    .bind(posted)
    .execute(pool)
    .await?;
    if stored.rows_affected() == 1 {
        return Ok(Attach::Stored);
    }
    let row = sqlx::query(
        "select (expires_at <= $2) as expired, payload ->> 'errorCallback' as error_callback
         from auth_flows where state_hash = $1 and kind = 'oauth' and provider = 'apple'",
    )
    .bind(hash.as_slice())
    .bind(now)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else {
        return Ok(Attach::Unknown);
    };
    let expired: bool = row.try_get("expired")?;
    let error_callback: Option<String> = row.try_get("error_callback")?;
    let error_callback = error_callback.unwrap_or_default();
    Ok(if expired {
        Attach::Expired { error_callback }
    } else {
        Attach::AlreadyPosted { error_callback }
    })
}

fn cookie_attributes(value: &str, max_age: i64) -> String {
    format!("{BINDING_COOKIE}={value}; Path=/; Max-Age={max_age}; HttpOnly; Secure; SameSite=Lax")
}

/// The `Set-Cookie` value that carries the binding to the browser.
pub fn binding_cookie(binding: &SecretToken) -> String {
    cookie_attributes(binding.expose(), FLOW_TTL.whole_seconds())
}

/// The `Set-Cookie` value that removes the binding cookie.
pub fn clear_binding_cookie() -> String {
    cookie_attributes("", 0)
}

/// The binding from the request's `Cookie` headers: the first cookie of that
/// name, if it is 43 base64url characters.
pub fn read_binding_cookie(headers: &HeaderMap) -> Option<String> {
    let value = headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|header| header.to_str().ok())
        .flat_map(|header| header.split(';'))
        .find_map(|pair| {
            let (name, value) = pair.trim().split_once('=')?;
            (name == BINDING_COOKIE).then_some(value)
        })?;
    (value.len() == TOKEN_LEN
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_'))
    .then(|| value.to_owned())
}
