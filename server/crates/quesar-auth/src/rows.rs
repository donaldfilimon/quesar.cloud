//! Row types over `"user"`, `"account"` (Better Auth's shared tables, quoted
//! camelCase columns) and `auth_sessions`, `auth_passkeys`, `auth_flows`
//! (`migrations/0010_rust_auth.sql`). Provider tokens are never stored, so
//! `AccountRow` has no token columns.

use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct UserRow {
    pub id: String,
    pub name: String,
    pub email: String,
    #[sqlx(rename = "emailVerified")]
    pub email_verified: bool,
    pub image: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: OffsetDateTime,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: OffsetDateTime,
}

/// `provider_id` is `credential` (password), `google`, `apple` or `twitter`.
/// `password` is an argon2 hash; its `Debug` output is redacted by hand.
#[derive(Clone, FromRow)]
pub struct AccountRow {
    pub id: String,
    #[sqlx(rename = "accountId")]
    pub account_id: String,
    #[sqlx(rename = "providerId")]
    pub provider_id: String,
    #[sqlx(rename = "userId")]
    pub user_id: String,
    pub password: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: OffsetDateTime,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: OffsetDateTime,
}

impl std::fmt::Debug for AccountRow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AccountRow")
            .field("id", &self.id)
            .field("account_id", &self.account_id)
            .field("provider_id", &self.provider_id)
            .field("user_id", &self.user_id)
            .field("password", &self.password.as_ref().map(|_| "[redacted]"))
            .field("created_at", &self.created_at)
            .field("updated_at", &self.updated_at)
            .finish()
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct SessionRow {
    pub id: String,
    pub user_id: String,
    pub token_hash: Vec<u8>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    pub expires_at: OffsetDateTime,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct PasskeyRow {
    pub id: String,
    pub user_id: String,
    pub user_handle: Uuid,
    pub credential_id: Vec<u8>,
    pub credential: serde_json::Value,
    pub name: Option<String>,
    /// `singleDevice` or `multiDevice`.
    pub device_type: String,
    pub backed_up: bool,
    pub created_at: OffsetDateTime,
    pub last_used_at: Option<OffsetDateTime>,
}

/// `payload` holds PKCE verifiers, nonces and WebAuthn state, so `Debug`
/// redacts it by hand.
#[derive(Clone, FromRow)]
pub struct FlowRow {
    pub id: String,
    /// `oauth`, `passkey_register` or `passkey_authenticate`.
    pub kind: String,
    pub provider: Option<String>,
    pub state_hash: Option<Vec<u8>>,
    pub binding_hash: Option<Vec<u8>>,
    pub user_id: Option<String>,
    pub payload: serde_json::Value,
    pub created_at: OffsetDateTime,
    pub expires_at: OffsetDateTime,
}

impl std::fmt::Debug for FlowRow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("FlowRow")
            .field("id", &self.id)
            .field("kind", &self.kind)
            .field("provider", &self.provider)
            .field("user_id", &self.user_id)
            .field("payload", &"[redacted]")
            .field("created_at", &self.created_at)
            .field("expires_at", &self.expires_at)
            .finish_non_exhaustive()
    }
}
