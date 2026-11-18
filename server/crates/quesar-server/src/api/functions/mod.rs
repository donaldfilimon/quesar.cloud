//! The public and signed-in server functions.

pub mod config;
pub mod inquiries;
mod workspace;

use quesar_services::rate_limit::Bucket;

use super::{ApiError, FnRouter};
use crate::auth::AuthServices;
use crate::auth::extract::AuthUser;
use crate::router::AppState;

/// Count the request after session authentication and before parsing its input.
pub async fn admit<'a>(state: &'a AppState, auth: &AuthUser) -> Result<&'a AuthServices, ApiError> {
    let services = state.auth_services()?;
    services.limit(Bucket::AuthGeneral, &auth.user.id).await?;
    Ok(services)
}

/// Mounts every function of this module.
pub fn register(router: FnRouter) -> FnRouter {
    workspace::register(inquiries::register(config::register(router)))
}
