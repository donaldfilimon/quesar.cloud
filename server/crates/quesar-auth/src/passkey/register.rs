//! Registering a passkey: `POST /passkey/register/options` and `.../verify`
//! (`generatePasskeyRegistrationOptions` / `verifyPasskeyRegistration`).

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;
use webauthn_rs::prelude::{
    Credential, Passkey, PasskeyRegistration, RegisterPublicKeyCredential, WebauthnError,
};

use super::flow::{self, Ceremony, Started, Taken};
use super::{Passkeys, store};
use crate::error::AuthError;
use crate::rows::{PasskeyRow, UserRow};

/// What a registration flow stores.
#[derive(Serialize, Deserialize)]
struct Payload {
    state: PasskeyRegistration,
    /// The WebAuthn user handle chosen when the flow began.
    #[serde(rename = "userHandle")]
    user_handle: Uuid,
}

#[derive(Debug)]
pub enum BeginError {
    Store(AuthError),
    /// `webauthn-rs` refused to build a challenge.
    Webauthn(WebauthnError),
}

impl From<AuthError> for BeginError {
    fn from(error: AuthError) -> Self {
        Self::Store(error)
    }
}

/// The result of [`begin`].
#[derive(Debug)]
pub struct Begun {
    pub started: Started,
    /// `PublicKeyCredentialCreationOptionsJSON`, the `optionsJSON` that
    /// `@simplewebauthn/browser`'s `startRegistration` takes.
    pub options: serde_json::Value,
}

/// Starts a registration for `user`. The user handle is the one their keys
/// already use, else a new random UUID; their existing credential ids are
/// excluded, so the same authenticator is not registered twice. The options ask
/// for a discoverable credential when the authenticator can make one
/// (`residentKey: "preferred"`, as Better Auth does), so the key can later
/// sign in without a username.
pub async fn begin(
    passkeys: &Passkeys,
    pool: &PgPool,
    user: &UserRow,
    now: OffsetDateTime,
) -> Result<Begun, BeginError> {
    let user_handle = store::user_handle(pool, &user.id)
        .await?
        .unwrap_or_else(Uuid::new_v4);
    let existing = store::credential_ids(pool, &user.id).await?;
    let exclude = (!existing.is_empty()).then(|| existing.into_iter().map(Into::into).collect());
    let (challenge, state) = passkeys
        .webauthn()
        .start_passkey_registration(user_handle, &user.email, &user.name, exclude)
        .map_err(BeginError::Webauthn)?;
    // A plain data structure; serializing it cannot fail. `webauthn-rs` does
    // not expose the resident-key type, so the preference is set on the JSON
    // the browser reads.
    let mut options = serde_json::to_value(&challenge.public_key).unwrap_or_default();
    if let Some(options) = options.as_object_mut() {
        let selection = options
            .entry("authenticatorSelection")
            .or_insert_with(|| serde_json::json!({}));
        if let Some(selection) = selection.as_object_mut() {
            selection.insert("residentKey".into(), "preferred".into());
        }
    }
    let payload = serde_json::to_value(Payload { state, user_handle }).unwrap_or_default();
    let started = flow::start(pool, Ceremony::Register, Some(&user.id), payload, now).await?;
    Ok(Begun { started, options })
}

/// Completes a registration whose flow has been taken (and whose binding the
/// caller has checked). `None` when the stored state is unusable, the
/// credential does not verify, or the credential id is already registered.
/// The reason is logged without any of the client's data.
pub async fn finish(
    passkeys: &Passkeys,
    pool: &PgPool,
    user_id: &str,
    taken: &Taken,
    credential: &RegisterPublicKeyCredential,
    name: Option<&str>,
    now: OffsetDateTime,
) -> Result<Option<PasskeyRow>, AuthError> {
    let Ok(payload) = serde_json::from_value::<Payload>(taken.payload.clone()) else {
        tracing::warn!("passkey registration flow row is malformed");
        return Ok(None);
    };
    let passkey: Passkey = match passkeys
        .webauthn()
        .finish_passkey_registration(credential, &payload.state)
    {
        Ok(passkey) => passkey,
        Err(error) => {
            tracing::info!(%error, "passkey registration did not verify");
            return Ok(None);
        }
    };
    let credential_id = passkey.cred_id().as_ref().to_vec();
    // The library's own credential record carries the backup flags.
    let record: Credential = passkey.clone().into();
    let mut tx = pool.begin().await?;
    let inserted = store::insert(
        &mut tx,
        store::NewPasskey {
            user_id,
            user_handle: payload.user_handle,
            credential_id: &credential_id,
            // A serializable record of public data.
            credential: serde_json::to_value(&passkey).unwrap_or_default(),
            name: store::clean_name(name),
            backup_eligible: record.backup_eligible,
            backed_up: record.backup_state,
        },
        now,
    )
    .await?;
    tx.commit().await?;
    if inserted.is_none() {
        tracing::info!("passkey registration refused: credential id already registered");
    }
    Ok(inserted)
}
