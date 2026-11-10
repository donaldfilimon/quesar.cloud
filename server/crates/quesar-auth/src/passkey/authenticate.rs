//! Signing in with a passkey: `POST /passkey/authenticate/options` and
//! `.../verify`. Discoverable (usernameless): the browser picks the key and
//! sends its user handle; nothing about an account is asked up front.

use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use webauthn_rs::prelude::{
    Credential, DiscoverableAuthentication, DiscoverableKey, Passkey, PublicKeyCredential,
    WebauthnError,
};

use super::flow::{self, Ceremony, Started, Taken};
use super::{Passkeys, store};
use crate::error::AuthError;
use crate::rows::UserRow;

/// What a sign-in flow stores.
#[derive(Serialize, Deserialize)]
struct Payload {
    state: DiscoverableAuthentication,
}

/// The result of [`begin`].
#[derive(Debug)]
pub struct Begun {
    pub started: Started,
    /// `PublicKeyCredentialRequestOptionsJSON`, the `optionsJSON` that
    /// `@simplewebauthn/browser`'s `startAuthentication` takes.
    pub options: serde_json::Value,
}

#[derive(Debug)]
pub enum BeginError {
    Store(AuthError),
    Webauthn(WebauthnError),
}

impl From<AuthError> for BeginError {
    fn from(error: AuthError) -> Self {
        Self::Store(error)
    }
}

/// Starts a discoverable sign-in. The flow has no user.
pub async fn begin(
    passkeys: &Passkeys,
    pool: &PgPool,
    now: OffsetDateTime,
) -> Result<Begun, BeginError> {
    let (challenge, state) = passkeys
        .webauthn()
        .start_discoverable_authentication()
        .map_err(BeginError::Webauthn)?;
    // Both are plain data structures; serializing them cannot fail.
    let options = serde_json::to_value(&challenge.public_key).unwrap_or_default();
    let payload = serde_json::to_value(Payload { state }).unwrap_or_default();
    let started = flow::start(pool, Ceremony::Authenticate, None, payload, now).await?;
    Ok(Begun { started, options })
}

/// Why a sign-in was not accepted. The HTTP layer maps every one of
/// [`Rejected`](Self::Rejected) and [`PossibleClone`](Self::PossibleClone) to
/// the same response.
#[derive(Debug)]
pub enum VerifyError {
    /// Unknown credential, wrong user handle, a signature or challenge or
    /// origin that does not verify, or unusable stored state.
    Rejected,
    /// The signature counter did not advance: the key may have been cloned.
    PossibleClone,
    Store(AuthError),
}

impl From<AuthError> for VerifyError {
    fn from(error: AuthError) -> Self {
        Self::Store(error)
    }
}

impl From<sqlx::Error> for VerifyError {
    fn from(error: sqlx::Error) -> Self {
        Self::Store(error.into())
    }
}

/// Checks a sign-in assertion against its taken flow and, on success, writes
/// the updated credential (counter, backup flags) and `last_used_at` on
/// `tx`. Returns the user who owns the key. The caller issues the
/// session on the same `tx`, so the counter and the session commit together
/// and a failed sign-in leaves no trace but the consumed flow.
///
/// The key row is locked until `tx` ends: two assertions from one key are
/// compared with its counter one after the other, which makes the clone check
/// real. The handle in the assertion must be the one stored with the key.
pub async fn verify(
    passkeys: &Passkeys,
    tx: &mut PgConnection,
    taken: &Taken,
    credential: &PublicKeyCredential,
    now: OffsetDateTime,
) -> Result<UserRow, VerifyError> {
    let Ok(payload) = serde_json::from_value::<Payload>(taken.payload.clone()) else {
        tracing::warn!("passkey sign-in flow row is malformed");
        return Err(VerifyError::Rejected);
    };
    let webauthn = passkeys.webauthn();
    let (handle, credential_id) = webauthn
        .identify_discoverable_authentication(credential)
        .map_err(|_| VerifyError::Rejected)?;
    let row = store::lock_by_credential_id(tx, credential_id)
        .await?
        .ok_or(VerifyError::Rejected)?;
    if row.user_handle != handle {
        return Err(VerifyError::Rejected);
    }
    let Ok(mut passkey) = serde_json::from_value::<Passkey>(row.credential.clone()) else {
        tracing::warn!(passkey = %row.id, "stored passkey credential is malformed");
        return Err(VerifyError::Rejected);
    };
    let result = match webauthn.finish_discoverable_authentication(
        credential,
        payload.state,
        &[DiscoverableKey::from(&passkey)],
    ) {
        Ok(result) => result,
        Err(WebauthnError::CredentialPossibleCompromise) => {
            tracing::warn!(
                passkey = %row.id,
                user = %row.user_id,
                "passkey signature counter did not advance; possible cloned authenticator, sign-in refused"
            );
            return Err(VerifyError::PossibleClone);
        }
        Err(error) => {
            tracing::info!(%error, "passkey sign-in did not verify");
            return Err(VerifyError::Rejected);
        }
    };
    passkey.update_credential(&result);
    let record: Credential = passkey.clone().into();
    store::record_use(
        tx,
        &row.id,
        // A serializable record of public data.
        serde_json::to_value(&passkey).unwrap_or_default(),
        record.backup_eligible,
        record.backup_state,
        now,
    )
    .await?;
    // Cascade delete makes a key without a user impossible; treat it as absent.
    store::user(tx, &row.user_id)
        .await?
        .ok_or(VerifyError::Rejected)
}
