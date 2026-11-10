//! The `/api/auth` endpoints, one module per concern. Paths are relative to
//! [`super::MOUNT`]; the API reference in the plan is the contract.

use std::sync::Arc;

use axum::Router;
use axum::routing::{get, post};

use crate::router::AppState;

pub mod delete;
pub mod email;
pub mod methods;
pub mod oauth;
pub mod profile;
pub mod session;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/methods", get(methods::methods))
        .route("/sign-up", post(email::sign_up))
        .route("/sign-in", post(email::sign_in))
        .route("/sign-out", post(email::sign_out))
        .route("/session", get(session::current))
        .route("/sessions", get(session::list))
        .route("/sessions/revoke", post(session::revoke))
        .route("/sessions/revoke-others", post(session::revoke_others))
        .route("/profile", post(profile::update))
        .route("/delete-account", post(delete::delete_account))
        .route("/oauth/{provider}/start", post(oauth::start))
        .route("/callback/{provider}", get(oauth::callback))
}
