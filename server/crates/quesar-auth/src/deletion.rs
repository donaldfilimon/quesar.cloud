//! Account deletion: purge a user's data and then the user, in one
//! transaction, with hooks for the cleanups that live outside the database.
//!
//! Ports `src/lib/server/account-deletion.server.ts` (`purgeUserData`) and the
//! `user.deleteUser.beforeDelete` wiring in `server.ts`. Order matters:
//!
//! 1. Commerce cleanup ([`CommerceUnlinker`]). A refusal aborts with nothing
//!    changed: the user is never deleted while commerce data still points at
//!    them.
//! 2. Workspace grants are revoked at the provider ([`WorkspaceRevoker`]),
//!    best effort. These are external calls, so they run before and outside
//!    the transaction and cannot be rolled back.
//! 3. One transaction deletes the per-user rows, unlinks inquiries and, last,
//!    deletes the `"user"` row, whose cascades remove the credentials, linked
//!    accounts, sessions, passkeys and sign-in flows. Any failure rolls back
//!    all of it, the user row included.
//!
//! Inquiries are business records: kept, with `user_id` set to null.

use std::collections::HashMap;
use std::fmt;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use sqlx::PgPool;

use crate::error::AuthError;

/// What the hook traits return, so they can be used as `dyn` objects without
/// an extra dependency.
pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// Why the commerce store refused to be cleaned up. Either way the account is
/// not deleted.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommerceUnlinkError {
    /// The store is fully configured but cannot be reached from this server
    /// yet (nothing implements it before M6), so deletion must not proceed.
    Unavailable,
    /// Some `WDBX_COMMERCE_*` setting is present but the configuration is not
    /// complete: cleanup cannot be trusted, so deletion fails closed.
    PartialConfiguration,
}

impl fmt::Display for CommerceUnlinkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Unavailable => "commerce account cleanup is not available",
            Self::PartialConfiguration => {
                "commerce account cleanup requires complete configuration"
            }
        })
    }
}

impl std::error::Error for CommerceUnlinkError {}

/// Removes a user's associations from the commerce store
/// (`unlinkCommerceAccount`). M6 implements it for real.
pub trait CommerceUnlinker: Send + Sync {
    /// The number of associations removed. An error aborts the deletion.
    fn unlink_account<'a>(
        &'a self,
        user_id: &'a str,
    ) -> BoxFuture<'a, Result<u64, CommerceUnlinkError>>;
}

/// Revokes a user's workspace grant at the provider
/// (`revokeAndDeleteWorkspaceConnection`, the revoke half). M5 implements it.
pub trait WorkspaceRevoker: Send + Sync {
    /// Whether the provider confirmed the revocation. Best effort: it never
    /// fails the deletion, and the stored connection is deleted either way.
    fn revoke<'a>(&'a self, user_id: &'a str, provider: &'a str) -> BoxFuture<'a, bool>;
}

/// The M2 workspace hook: nothing is revoked at a provider.
#[derive(Debug, Default, Clone, Copy)]
pub struct NoWorkspaceRevoker;

impl WorkspaceRevoker for NoWorkspaceRevoker {
    fn revoke<'a>(&'a self, _user_id: &'a str, _provider: &'a str) -> BoxFuture<'a, bool> {
        Box::pin(async { false })
    }
}

const WDBX_BINARY: &str = "WDBX_BINARY";
const WDBX_COMMERCE_PREFIX: &str = "WDBX_COMMERCE_";
const WDBX_COMMERCE_REQUIRED: [&str; 3] = [
    "WDBX_COMMERCE_DIRECTORY",
    "WDBX_COMMERCE_CONFIG",
    "WDBX_COMMERCE_HOST_KEY",
];

/// The M2 commerce hook: the configuration check of `unlinkCommerceAccount`
/// and `wdbxOptions`, over an injected environment.
///
/// - All four of `WDBX_BINARY`, `WDBX_COMMERCE_DIRECTORY`,
///   `WDBX_COMMERCE_CONFIG` and `WDBX_COMMERCE_HOST_KEY` set to absolute paths:
///   the store would be used, and it cannot be reached before M6, so
///   [`CommerceUnlinkError::Unavailable`].
/// - Otherwise any `WDBX_COMMERCE_*` variable with a non-empty value:
///   [`CommerceUnlinkError::PartialConfiguration`].
/// - Otherwise nothing is configured and there is nothing to unlink.
///
/// Values are read exactly as the process has them: not trimmed, so a
/// whitespace-only value counts as set, as `process.env[k]` does in the
/// TypeScript. That can only make the guard refuse more, never less.
#[derive(Debug, Clone, Default)]
pub struct WdbxConfigGuard {
    variables: HashMap<String, String>,
}

impl WdbxConfigGuard {
    /// Keeps only the variables that matter here.
    pub fn new<K: Into<String>, V: Into<String>>(
        variables: impl IntoIterator<Item = (K, V)>,
    ) -> Self {
        Self {
            variables: variables
                .into_iter()
                .map(|(name, value)| (name.into(), value.into()))
                .filter(|(name, _)| name == WDBX_BINARY || name.starts_with(WDBX_COMMERCE_PREFIX))
                .collect(),
        }
    }

    fn absolute(&self, name: &str) -> bool {
        self.variables
            .get(name)
            .is_some_and(|value| !value.is_empty() && std::path::Path::new(value).is_absolute())
    }

    fn check(&self) -> Result<u64, CommerceUnlinkError> {
        if self.absolute(WDBX_BINARY) && WDBX_COMMERCE_REQUIRED.iter().all(|n| self.absolute(n)) {
            return Err(CommerceUnlinkError::Unavailable);
        }
        if self
            .variables
            .iter()
            .any(|(name, value)| name.starts_with(WDBX_COMMERCE_PREFIX) && !value.is_empty())
        {
            return Err(CommerceUnlinkError::PartialConfiguration);
        }
        Ok(0)
    }
}

impl CommerceUnlinker for WdbxConfigGuard {
    fn unlink_account<'a>(
        &'a self,
        _user_id: &'a str,
    ) -> BoxFuture<'a, Result<u64, CommerceUnlinkError>> {
        Box::pin(async { self.check() })
    }
}

/// The external cleanups a deletion calls.
#[derive(Clone)]
pub struct DeletionHooks {
    pub commerce: Arc<dyn CommerceUnlinker>,
    pub workspace: Arc<dyn WorkspaceRevoker>,
}

impl DeletionHooks {
    /// The M2 defaults: [`WdbxConfigGuard`] over `variables` and
    /// [`NoWorkspaceRevoker`].
    pub fn defaults<K: Into<String>, V: Into<String>>(
        variables: impl IntoIterator<Item = (K, V)>,
    ) -> Self {
        Self {
            commerce: Arc::new(WdbxConfigGuard::new(variables)),
            workspace: Arc::new(NoWorkspaceRevoker),
        }
    }
}

impl fmt::Debug for DeletionHooks {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("DeletionHooks").finish_non_exhaustive()
    }
}

#[derive(Debug)]
pub enum DeletionError {
    /// The commerce hook refused; nothing was changed.
    Commerce(CommerceUnlinkError),
    /// The database failed; if it failed inside the transaction, nothing in it
    /// was changed.
    Database(AuthError),
}

impl fmt::Display for DeletionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Commerce(error) => write!(f, "{error}"),
            Self::Database(error) => write!(f, "account deletion failed: {error}"),
        }
    }
}

impl std::error::Error for DeletionError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Commerce(error) => Some(error),
            Self::Database(error) => Some(error),
        }
    }
}

impl From<sqlx::Error> for DeletionError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error.into())
    }
}

/// What the revoker said about one workspace connection.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceOutcome {
    pub provider: String,
    pub revoked: bool,
}

/// Rows deleted, per table.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DeletedCounts {
    pub workspace_connections: u64,
    pub audit_access_events: u64,
    pub conversation_audits: u64,
    pub chat_consents: u64,
    pub field_notes: u64,
    pub rate_limits: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PurgeReport {
    pub workspace: Vec<WorkspaceOutcome>,
    pub deleted: DeletedCounts,
    /// Inquiries kept, with their `user_id` cleared.
    pub inquiries_unlinked: u64,
}

/// Purges everything of `user_id`'s and then deletes the user. See the module
/// documentation for the order and what is atomic.
pub async fn purge_and_delete(
    pool: &PgPool,
    user_id: &str,
    hooks: &DeletionHooks,
) -> Result<PurgeReport, DeletionError> {
    hooks
        .commerce
        .unlink_account(user_id)
        .await
        .map_err(DeletionError::Commerce)?;

    let providers: Vec<String> = sqlx::query_scalar(
        "select provider from workspace_connections where user_id = $1 order by provider",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    let mut workspace = Vec::with_capacity(providers.len());
    for provider in providers {
        let revoked = hooks.workspace.revoke(user_id, &provider).await;
        workspace.push(WorkspaceOutcome { provider, revoked });
    }

    let mut tx = pool.begin().await?;
    let workspace_connections = sqlx::query("delete from workspace_connections where user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    // Before the audits themselves: the second condition reads them.
    let audit_access_events = sqlx::query(
        "delete from audit_access_events where actor_user_id = $1
           or audit_id in (select id from conversation_audits where user_id = $1)",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    let conversation_audits = sqlx::query("delete from conversation_audits where user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let chat_consents = sqlx::query("delete from chat_consents where user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let field_notes = sqlx::query("delete from field_notes where user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let rate_limits = sqlx::query("delete from rate_limits where subject = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let inquiries_unlinked = sqlx::query("update inquiries set user_id = null where user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    // Last: the cascades take the credentials, linked accounts, email
    // verifications, sessions, passkeys and flows with it.
    sqlx::query(r#"delete from "user" where id = $1"#)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(PurgeReport {
        workspace,
        deleted: DeletedCounts {
            workspace_connections,
            audit_access_events,
            conversation_audits,
            chat_consents,
            field_notes,
            rate_limits,
        },
        inquiries_unlinked,
    })
}
