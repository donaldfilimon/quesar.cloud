//! The admin decision, ported from `src/lib/server/admin.server.ts`.
//!
//! An administrator is a signed-in user whose email is on the `ADMIN_EMAILS`
//! allowlist AND who has linked an identity provider that verifies email
//! addresses. Email/password sign-up is open and sends no verification mail,
//! so an allowlisted address on its own proves nothing: anyone could register
//! it. Google and Apple return a provider-verified email. X and passkeys do
//! not count: X may return no email or an unverified one, and a passkey proves
//! possession of a device, not of the address.

use std::collections::HashSet;

use serde::Serialize;
use sqlx::PgPool;

use crate::config::AdminEmails;
use crate::error::AuthError;

/// Providers whose sign-in proves control of the email address.
const VERIFIED_PROVIDERS: [&str; 2] = ["google", "apple"];

/// A provider link together with the email the provider verified for it
/// (a row of `oauth_email_verifications` joined to its account).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifiedLink {
    pub provider: String,
    pub email: String,
}

/// Everything the decision looks at.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCandidate {
    pub email: String,
    /// Carried for parity with the TypeScript; deliberately not used.
    pub email_verified: bool,
    /// `account.providerId` values linked to this user.
    pub providers: Vec<String>,
    pub verified_links: Vec<VerifiedLink>,
}

/// The outcome. Serialised as `admin`, `no_allowlist`, `not_allowlisted` or
/// `unverified_identity`; the last three are the TypeScript `reason` values.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AdminDecision {
    Admin,
    NoAllowlist,
    NotAllowlisted,
    UnverifiedIdentity,
}

impl AdminDecision {
    pub fn is_admin(self) -> bool {
        self == Self::Admin
    }

    /// The refusal reason, `None` for an admin.
    pub fn reason(self) -> Option<&'static str> {
        match self {
            Self::Admin => None,
            Self::NoAllowlist => Some("no_allowlist"),
            Self::NotAllowlisted => Some("not_allowlisted"),
            Self::UnverifiedIdentity => Some("unverified_identity"),
        }
    }
}

fn normalise(email: &str) -> String {
    email.trim().to_lowercase()
}

/// Pure decision. `allowlist` holds lowercased addresses (see
/// [`AdminEmails`]).
pub fn decide_admin(user: &AdminCandidate, allowlist: &HashSet<String>) -> AdminDecision {
    if allowlist.is_empty() {
        return AdminDecision::NoAllowlist;
    }
    let email = normalise(&user.email);
    if !allowlist.contains(&email) {
        return AdminDecision::NotAllowlisted;
    }
    // Require a linked verifying provider. `email_verified` is deliberately
    // not sufficient on its own: it is a mutable column and nothing in this
    // app verifies email/password addresses, so it is not proof of control.
    let verified_linked = user.verified_links.iter().any(|link| {
        VERIFIED_PROVIDERS.contains(&link.provider.as_str())
            && user.providers.contains(&link.provider)
            && normalise(&link.email) == email
    });
    if !verified_linked {
        return AdminDecision::UnverifiedIdentity;
    }
    AdminDecision::Admin
}

/// Loads the candidate for a user id. `None` when the user row is missing.
async fn load_candidate(pool: &PgPool, user_id: &str) -> Result<Option<AdminCandidate>, AuthError> {
    let user: Option<(String, bool)> =
        sqlx::query_as(r#"select "email", "emailVerified" from "user" where "id" = $1 limit 1"#)
            .bind(user_id)
            .fetch_optional(pool)
            .await?;
    let Some((email, email_verified)) = user else {
        return Ok(None);
    };
    let providers: Vec<(String,)> =
        sqlx::query_as(r#"select "providerId" from "account" where "userId" = $1"#)
            .bind(user_id)
            .fetch_all(pool)
            .await?;
    let links: Vec<(String, String)> = sqlx::query_as(
        r#"select a."providerId", v.email from "account" a
           join oauth_email_verifications v on v.account_id = a.id
           where a."userId" = $1"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(Some(AdminCandidate {
        email,
        email_verified,
        providers: providers.into_iter().map(|(provider,)| provider).collect(),
        verified_links: links
            .into_iter()
            .map(|(provider, email)| VerifiedLink { provider, email })
            .collect(),
    }))
}

/// Whether the user is an administrator. A missing user is `NotAllowlisted`.
pub async fn admin_decision_for(
    pool: &PgPool,
    user_id: &str,
    allowlist: &AdminEmails,
) -> Result<AdminDecision, AuthError> {
    Ok(match load_candidate(pool, user_id).await? {
        Some(candidate) => decide_admin(&candidate, allowlist.as_set()),
        None => AdminDecision::NotAllowlisted,
    })
}
