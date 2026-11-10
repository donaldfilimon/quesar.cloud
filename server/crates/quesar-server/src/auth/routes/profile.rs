//! `POST /profile`: change the display name (the `user.update.before` hook in
//! `server.ts`, through `validateDisplayName`).

use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::Response;
use quesar_auth::email_password;
use quesar_auth::validate;
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::json;

use crate::auth::ApiError;
use crate::auth::error::ok;
use crate::auth::extract::{AuthUser, SameOrigin};
use crate::auth::json;
use crate::auth::view::UserView;
use crate::router::AppState;

#[derive(Deserialize)]
struct ProfileBody {
    #[serde(default)]
    name: String,
}

pub async fn update(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    let input: ProfileBody = json::read(&headers, body).await?;
    let name = validate::display_name(&input.name)
        .map_err(|error| ApiError::validation(error.code(), error.to_string()))?;
    let user = email_password::rename(&services.pool, &auth.user.id, &name, services.clock.now())
        .await?
        .ok_or(ApiError::Unauthorized)?;
    Ok(ok(json!({ "user": UserView::from(&user) })))
}
