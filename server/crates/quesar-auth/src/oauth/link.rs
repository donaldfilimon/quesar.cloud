//! Which local user a provider identity signs in as.
//!
//! A port of `handleOAuthUserInfo` (`oauth2/link-account.mjs`) with the
//! `validateUserInfo` and `observeOAuthAssertion` hooks of `server.ts` and
//! `oauth-provenance.server.ts`. Everything runs in the caller's transaction,
//! which then also creates the session, so a user and account never exist
//! without the sign-in that made them.
//!
//! Differences from the TypeScript, all on the refusing side:
//! - X never links by email (Contradiction 2).
//! - An unverified Google or Apple email is `provider_email_unverified` in
//!   every case; the TypeScript says `account not linked` when a local user
//!   already has the address.

use sqlx::PgConnection;
use time::OffsetDateTime;

use crate::error::AuthError;
use crate::ids::new_id;
use crate::oauth::provider::Identity;
use crate::rows::UserRow;
use crate::validate::{DISPLAY_NAME_MAX, display_name};

const USER_COLUMNS: &str = r#"id, name, email, "emailVerified", image, "createdAt", "updatedAt""#;

/// Why a sign-in was refused. Each has its own callback `error` code.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Refusal {
    ProviderEmailUnverified,
    EmailNotFound,
    AccountNotLinked,
}

impl Refusal {
    pub fn code(self) -> &'static str {
        match self {
            Self::ProviderEmailUnverified => "provider_email_unverified",
            Self::EmailNotFound => "email_not_found",
            Self::AccountNotLinked => "account_not_linked",
        }
    }
}

#[derive(Debug)]
pub enum Outcome {
    /// Sign in as this user.
    SignedIn(UserRow),
    /// Commit the transaction (a refusal can still have deleted a stale
    /// verification) and send the browser to the error path.
    Refused(Refusal),
}

/// The name for a new user: the provider's if it passes the display-name rule,
/// else the email's local part cut to 80 characters (risk 3 of the plan; the
/// TypeScript fails the sign-up instead).
fn new_user_name(identity: &Identity, email: &str) -> String {
    if let Some(name) = identity.name.as_deref()
        && let Ok(name) = display_name(name)
    {
        return name;
    }
    let local = email.split('@').next().unwrap_or(email);
    let local = if local.trim().is_empty() {
        email
    } else {
        local
    };
    local.trim().chars().take(DISPLAY_NAME_MAX).collect()
}

async fn lock(tx: &mut PgConnection, key: &str) -> Result<(), AuthError> {
    sqlx::query("select pg_advisory_xact_lock(hashtextextended($1, 0))")
        .bind(key)
        .execute(&mut *tx)
        .await?;
    Ok(())
}

async fn record_verification(
    tx: &mut PgConnection,
    account_id: &str,
    email: &str,
    now: OffsetDateTime,
) -> Result<(), AuthError> {
    sqlx::query(
        "insert into oauth_email_verifications (account_id, email, verified_at)
         values ($1, $2, $3)
         on conflict (account_id) do update
           set email = excluded.email, verified_at = excluded.verified_at",
    )
    .bind(account_id)
    .bind(email)
    .bind(now)
    .execute(&mut *tx)
    .await?;
    Ok(())
}

async fn insert_account(
    tx: &mut PgConnection,
    identity: &Identity,
    user_id: &str,
    now: OffsetDateTime,
) -> Result<String, AuthError> {
    let id = new_id();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "createdAt", "updatedAt")
           values ($1, $2, $3, $4, $5, $5)"#,
    )
    .bind(&id)
    .bind(&identity.subject)
    .bind(identity.provider.as_str())
    .bind(user_id)
    .bind(now)
    .execute(&mut *tx)
    .await?;
    Ok(id)
}

/// Resolves `identity` to a user, creating or linking as the rules allow.
pub async fn resolve(
    tx: &mut PgConnection,
    identity: &Identity,
    now: OffsetDateTime,
) -> Result<Outcome, AuthError> {
    let provider = identity.provider;
    let email = identity
        .email
        .as_deref()
        .map(|email| email.trim().to_lowercase())
        .filter(|email| !email.is_empty());

    // Two sign-ins for one provider account, or one address, take turns. The
    // `account` table has no unique key on (provider, id) to fall back on.
    lock(
        tx,
        &format!("oauth:account:{}:{}", provider.as_str(), identity.subject),
    )
    .await?;
    if let Some(email) = &email {
        lock(tx, &format!("oauth:email:{email}")).await?;
    }

    // 1. Google and Apple must assert a verified address. A refusal also
    //    forgets any earlier verification of this account.
    if provider.asserts_email() && !identity.email_verified {
        sqlx::query(
            r#"delete from oauth_email_verifications v using "account" a
               where v.account_id = a.id and a."providerId" = $1 and a."accountId" = $2"#,
        )
        .bind(provider.as_str())
        .bind(&identity.subject)
        .execute(&mut *tx)
        .await?;
        return Ok(Outcome::Refused(Refusal::ProviderEmailUnverified));
    }
    // 2.
    let Some(email) = email else {
        return Ok(Outcome::Refused(Refusal::EmailNotFound));
    };

    // 3. The account exists: sign in as its user.
    let existing: Option<(String, String)> = sqlx::query_as(
        r#"select id, "userId" from "account"
           where "providerId" = $1 and "accountId" = $2
           order by "createdAt" limit 1"#,
    )
    .bind(provider.as_str())
    .bind(&identity.subject)
    .fetch_optional(&mut *tx)
    .await?;
    if let Some((account_id, user_id)) = existing {
        let user: Option<UserRow> = sqlx::query_as(&format!(
            r#"select {USER_COLUMNS} from "user" where id = $1 for update"#
        ))
        .bind(&user_id)
        .fetch_optional(&mut *tx)
        .await?;
        let Some(mut user) = user else {
            // Cannot happen (the foreign key cascades); never sign in as no one.
            return Ok(Outcome::Refused(Refusal::AccountNotLinked));
        };
        if identity.email_verified && !user.email_verified && user.email == email {
            user = sqlx::query_as(&format!(
                r#"update "user" set "emailVerified" = true, "updatedAt" = $2
                   where id = $1 returning {USER_COLUMNS}"#
            ))
            .bind(&user.id)
            .bind(now)
            .fetch_one(&mut *tx)
            .await?;
        }
        if provider.asserts_email() {
            record_verification(tx, &account_id, &email, now).await?;
        }
        return Ok(Outcome::SignedIn(user));
    }

    // 4. A user with this address exists: link only on a verified assertion
    //    from a provider that makes one, and only if the local address was
    //    verified too (`requireLocalEmailVerified`, Contradiction 3).
    let by_email: Option<UserRow> = sqlx::query_as(&format!(
        r#"select {USER_COLUMNS} from "user" where email = $1 for update"#
    ))
    .bind(&email)
    .fetch_optional(&mut *tx)
    .await?;
    if let Some(user) = by_email {
        if !(provider.asserts_email() && identity.email_verified && user.email_verified) {
            return Ok(Outcome::Refused(Refusal::AccountNotLinked));
        }
        let account_id = insert_account(tx, identity, &user.id, now).await?;
        record_verification(tx, &account_id, &email, now).await?;
        return Ok(Outcome::SignedIn(user));
    }

    // 5. A new user. The unique email decides a race with a password sign-up,
    //    which does not take our lock: the loser sees the address as taken.
    let created: Option<UserRow> = sqlx::query_as(&format!(
        r#"insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
           values ($1, $2, $3, $4, $5, $6, $6)
           on conflict (email) do nothing
           returning {USER_COLUMNS}"#
    ))
    .bind(new_id())
    .bind(new_user_name(identity, &email))
    .bind(&email)
    .bind(identity.email_verified)
    .bind(identity.image.as_deref())
    .bind(now)
    .fetch_optional(&mut *tx)
    .await?;
    let Some(user) = created else {
        return Ok(Outcome::Refused(Refusal::AccountNotLinked));
    };
    let account_id = insert_account(tx, identity, &user.id, now).await?;
    if provider.asserts_email() {
        record_verification(tx, &account_id, &email, now).await?;
    }
    Ok(Outcome::SignedIn(user))
}
