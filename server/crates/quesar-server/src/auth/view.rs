//! The JSON shapes of the API reference: `User` and `Session`. Times are
//! ISO 8601 with milliseconds and a `Z`, as `Date#toISOString` writes them.
//! Nothing here can carry a session token.

use quesar_auth::{SessionRow, UserRow};
use serde::Serialize;
use time::format_description::FormatItem;
use time::macros::format_description;
use time::{OffsetDateTime, UtcOffset};

const ISO: &[FormatItem<'static>] =
    format_description!("[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3]Z");

pub fn iso(at: OffsetDateTime) -> String {
    at.to_offset(UtcOffset::UTC).format(ISO).unwrap_or_default()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserView {
    pub id: String,
    pub name: String,
    pub email: String,
    pub email_verified: bool,
    pub image: Option<String>,
    pub created_at: String,
}

impl From<&UserRow> for UserView {
    fn from(user: &UserRow) -> Self {
        Self {
            id: user.id.clone(),
            name: user.name.clone(),
            email: user.email.clone(),
            email_verified: user.email_verified,
            image: user.image.clone(),
            created_at: iso(user.created_at),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionView {
    pub id: String,
    pub created_at: String,
    pub expires_at: String,
}

impl From<&SessionRow> for SessionView {
    fn from(session: &SessionRow) -> Self {
        Self {
            id: session.id.clone(),
            created_at: iso(session.created_at),
            expires_at: iso(session.expires_at),
        }
    }
}

/// One row of `GET /sessions`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionListItem {
    pub id: String,
    pub created_at: String,
    pub expires_at: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub current: bool,
}

impl SessionListItem {
    pub fn new(session: &SessionRow, current_id: &str) -> Self {
        Self {
            id: session.id.clone(),
            created_at: iso(session.created_at),
            expires_at: iso(session.expires_at),
            ip_address: session.ip_address.clone(),
            user_agent: session.user_agent.clone(),
            current: session.id == current_id,
        }
    }
}

/// `{user, session}`, the result of sign-up, sign-in and `GET /session`.
#[derive(Debug, Serialize)]
pub struct UserAndSession {
    pub user: UserView,
    pub session: SessionView,
}

impl UserAndSession {
    pub fn new(user: &UserRow, session: &SessionRow) -> Self {
        Self {
            user: user.into(),
            session: session.into(),
        }
    }
}
