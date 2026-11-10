//! Email and password accounts: input rules and the queries behind sign-up,
//! sign-in and the display-name change.
//!
//! Hashing is not here. The server hashes off the async runtime and hands the
//! result in, so this module never blocks. Rows follow Better Auth's
//! conventions (`migrations/0001_auth.sql`): a credential `"account"` has
//! `"providerId" = 'credential'`, `"accountId" = "user".id` and the hash in
//! `"password"`; `"account"."updatedAt"` has no default.

use sqlx::{FromRow, PgConnection, PgPool};
use time::OffsetDateTime;

use crate::error::AuthError;
use crate::ids::new_id;
use crate::password::PhcString;
use crate::rows::UserRow;
use crate::validate::{self, ValidationError};

const USER_COLUMNS: &str = r#"id, name, email, "emailVerified", image, "createdAt", "updatedAt""#;

/// The sign-up rules in Better Auth's order: email, then password length, then
/// the display name. Returns the trimmed name and the lowercased email.
pub fn validate_sign_up(
    name: &str,
    email: &str,
    password: &str,
) -> Result<(String, String), ValidationError> {
    let email = validate::email(email)?;
    validate::password_len(password)?;
    let name = validate::display_name(name)?;
    Ok((name, email))
}

/// Whether a user with this (already lowercased) email exists.
pub async fn email_exists(pool: &PgPool, email: &str) -> Result<bool, AuthError> {
    Ok(
        sqlx::query_scalar(r#"select exists (select 1 from "user" where email = $1)"#)
            .bind(email)
            .fetch_one(pool)
            .await?,
    )
}

#[derive(Debug)]
pub enum NewUser {
    Created(UserRow),
    /// Another user already has the email (including a sign-up that lost a race).
    EmailTaken,
}

/// Inserts the `"user"` (`"emailVerified" = false`) and its credential
/// `"account"` in the caller's transaction. A taken email changes nothing.
pub async fn create_user_with_password(
    tx: &mut PgConnection,
    name: &str,
    email: &str,
    hash: &PhcString,
    now: OffsetDateTime,
) -> Result<NewUser, AuthError> {
    let user: Option<UserRow> = sqlx::query_as(&format!(
        r#"insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
           values ($1, $2, $3, false, $4, $4)
           on conflict (email) do nothing
           returning {USER_COLUMNS}"#
    ))
    .bind(new_id())
    .bind(name)
    .bind(email)
    .bind(now)
    .fetch_optional(&mut *tx)
    .await?;
    let Some(user) = user else {
        return Ok(NewUser::EmailTaken);
    };
    sqlx::query(
        r#"insert into "account"
             (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           values ($1, $2, 'credential', $2, $3, $4, $4)"#,
    )
    .bind(new_id())
    .bind(&user.id)
    .bind(hash.as_str())
    .bind(now)
    .execute(&mut *tx)
    .await?;
    Ok(NewUser::Created(user))
}

/// A user and the hash of their credential account, if they have one.
#[derive(FromRow)]
struct CredentialRow {
    #[sqlx(flatten)]
    user: UserRow,
    password: Option<String>,
}

pub struct Credentials {
    pub user: UserRow,
    /// `None` for a user who signed up only through a provider or a passkey.
    pub password: Option<PhcString>,
}

impl std::fmt::Debug for Credentials {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Credentials")
            .field("user", &self.user)
            .field("password", &self.password.as_ref().map(|_| "[redacted]"))
            .finish()
    }
}

/// The user with this (already lowercased) email and their password hash.
pub async fn find_credentials(
    pool: &PgPool,
    email: &str,
) -> Result<Option<Credentials>, AuthError> {
    let row: Option<CredentialRow> = sqlx::query_as(
        r#"select u.id, u.name, u.email, u."emailVerified", u.image,
                  u."createdAt", u."updatedAt", a.password
           from "user" u
           left join "account" a on a."userId" = u.id and a."providerId" = 'credential'
           where u.email = $1
           order by a."createdAt"
           limit 1"#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|row| Credentials {
        user: row.user,
        password: row.password.map(PhcString::new),
    }))
}

/// The password hash of the user's credential account, if they have one
/// (Better Auth's `findCredentialAccount`: the first credential account, and
/// one without a password counts as none).
pub async fn credential_hash(pool: &PgPool, user_id: &str) -> Result<Option<PhcString>, AuthError> {
    let hash: Option<Option<String>> = sqlx::query_scalar(
        r#"select password from "account"
           where "userId" = $1 and "providerId" = 'credential'
           order by "createdAt" limit 1"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(hash.flatten().map(PhcString::new))
}

/// Sets the (already validated) display name; `None` when the user is gone.
pub async fn rename(
    pool: &PgPool,
    user_id: &str,
    name: &str,
    now: OffsetDateTime,
) -> Result<Option<UserRow>, AuthError> {
    Ok(sqlx::query_as(&format!(
        r#"update "user" set name = $2, "updatedAt" = $3 where id = $1
           returning {USER_COLUMNS}"#
    ))
    .bind(user_id)
    .bind(name)
    .bind(now)
    .fetch_optional(pool)
    .await?)
}
