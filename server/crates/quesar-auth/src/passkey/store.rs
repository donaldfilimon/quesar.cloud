//! The `auth_passkeys` table. Every statement that touches one user's keys is
//! scoped by `user_id`, which comes from the session, never from the client.

use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;
use uuid::Uuid;

use super::NAME_MAX_CHARS;
use crate::error::AuthError;
use crate::ids::new_id;
use crate::rows::{PasskeyRow, UserRow};

const COLUMNS: &str = "id, user_id, user_handle, credential_id, credential, name, device_type, backed_up, created_at, last_used_at";

/// The user's keys, oldest first.
pub async fn list(pool: &PgPool, user_id: &str) -> Result<Vec<PasskeyRow>, AuthError> {
    Ok(sqlx::query_as(&format!(
        "select {COLUMNS} from auth_passkeys where user_id = $1 order by created_at, id"
    ))
    .bind(user_id)
    .fetch_all(pool)
    .await?)
}

/// The WebAuthn user handle already used for this user's keys, if any. One
/// handle per user: a second registration reuses it.
pub async fn user_handle(pool: &PgPool, user_id: &str) -> Result<Option<Uuid>, AuthError> {
    Ok(sqlx::query_scalar(
        "select user_handle from auth_passkeys where user_id = $1 order by created_at, id limit 1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?)
}

/// The credential ids of the user's keys, for `excludeCredentials`.
pub async fn credential_ids(pool: &PgPool, user_id: &str) -> Result<Vec<Vec<u8>>, AuthError> {
    Ok(sqlx::query_scalar(
        "select credential_id from auth_passkeys where user_id = $1 order by created_at, id",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?)
}

/// Trims a client-sent name, turns blank into `None` and cuts it to
/// [`NAME_MAX_CHARS`] characters (on a character boundary).
pub fn clean_name(name: Option<&str>) -> Option<String> {
    let trimmed = name?.trim();
    (!trimmed.is_empty()).then(|| trimmed.chars().take(NAME_MAX_CHARS).collect())
}

/// What a new key is stored with.
pub struct NewPasskey<'a> {
    pub user_id: &'a str,
    /// The handle the authenticator was created with.
    pub user_handle: Uuid,
    pub credential_id: &'a [u8],
    pub credential: serde_json::Value,
    pub name: Option<String>,
    pub backup_eligible: bool,
    pub backed_up: bool,
}

/// `multiDevice` for a backup-eligible (syncable) key, else `singleDevice`.
pub fn device_type(backup_eligible: bool) -> &'static str {
    if backup_eligible {
        "multiDevice"
    } else {
        "singleDevice"
    }
}

/// What [`insert`] did.
#[derive(Debug)]
pub enum Inserted {
    Stored(Box<PasskeyRow>),
    /// The credential id is already registered (to this or another account).
    Duplicate,
    /// The user already has keys under a different handle than the one the
    /// authenticator was given. Storing this key would make it unusable at
    /// sign-in (the handle check would never match), so nothing is stored.
    HandleMismatch,
}

/// Inserts a key under `new.user_handle`, which must be the handle the
/// authenticator was created with. If the user already has keys under another
/// handle (a second registration begun before any key existed, finishing
/// after the first), nothing is stored. An advisory lock on the user makes the
/// check and the insert atomic against a concurrent registration.
pub async fn insert(
    tx: &mut PgConnection,
    new: NewPasskey<'_>,
    now: OffsetDateTime,
) -> Result<Inserted, AuthError> {
    sqlx::query("select pg_advisory_xact_lock(hashtextextended('auth_passkeys:' || $1::text, 0))")
        .bind(new.user_id)
        .execute(&mut *tx)
        .await?;
    let existing: Option<Uuid> = sqlx::query_scalar(
        "select user_handle from auth_passkeys where user_id = $1 order by created_at, id limit 1",
    )
    .bind(new.user_id)
    .fetch_optional(&mut *tx)
    .await?;
    if existing.is_some_and(|handle| handle != new.user_handle) {
        return Ok(Inserted::HandleMismatch);
    }
    let row: Option<PasskeyRow> = sqlx::query_as(&format!(
        "insert into auth_passkeys
           (id, user_id, user_handle, credential_id, credential, name, device_type, backed_up, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (credential_id) do nothing
         returning {COLUMNS}"
    ))
    .bind(new_id())
    .bind(new.user_id)
    .bind(new.user_handle)
    .bind(new.credential_id)
    .bind(new.credential)
    .bind(new.name)
    .bind(device_type(new.backup_eligible))
    .bind(new.backed_up)
    .bind(now)
    .fetch_optional(&mut *tx)
    .await?;
    Ok(row.map_or(Inserted::Duplicate, |row| Inserted::Stored(Box::new(row))))
}

/// Deletes one of the user's own keys. `false` when there is no such key for
/// this user (another user's id matches nothing).
pub async fn delete(pool: &PgPool, user_id: &str, id: &str) -> Result<bool, AuthError> {
    let deleted = sqlx::query("delete from auth_passkeys where id = $1 and user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(deleted.rows_affected() == 1)
}

/// Reads and row-locks the key with this credential id, so two sign-ins with
/// one key are checked against its counter one after the other.
pub async fn lock_by_credential_id(
    tx: &mut PgConnection,
    credential_id: &[u8],
) -> Result<Option<PasskeyRow>, AuthError> {
    Ok(sqlx::query_as(&format!(
        "select {COLUMNS} from auth_passkeys where credential_id = $1 for update"
    ))
    .bind(credential_id)
    .fetch_optional(&mut *tx)
    .await?)
}

/// Writes back what a successful sign-in changed: the credential (counter and
/// backup flags), the derived columns and `last_used_at`.
pub async fn record_use(
    tx: &mut PgConnection,
    id: &str,
    credential: serde_json::Value,
    backup_eligible: bool,
    backed_up: bool,
    now: OffsetDateTime,
) -> Result<(), AuthError> {
    sqlx::query(
        "update auth_passkeys
         set credential = $2, device_type = $3, backed_up = $4, last_used_at = $5
         where id = $1",
    )
    .bind(id)
    .bind(credential)
    .bind(device_type(backup_eligible))
    .bind(backed_up)
    .bind(now)
    .execute(&mut *tx)
    .await?;
    Ok(())
}

/// The user a key belongs to.
pub async fn user(tx: &mut PgConnection, user_id: &str) -> Result<Option<UserRow>, AuthError> {
    Ok(sqlx::query_as(
        r#"select id, name, email, "emailVerified", image, "createdAt", "updatedAt"
           from "user" where id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?)
}
