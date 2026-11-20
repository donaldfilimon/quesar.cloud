use std::collections::HashSet;
use std::sync::Arc;

use axum::extract::State;
use axum::response::Response;
use quesar_contract::ServerFunction;
use quesar_contract::profile::{GetProfile, ProfileRecord};

use super::admit;
use crate::api::{ApiError, FnRouter, error::ok};
use crate::auth::extract::AuthUser;
use crate::router::AppState;

async fn get_profile(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = admit(&state, &auth).await?;
    let mut providers: Vec<String> = sqlx::query_scalar(
        r#"select "providerId" from "account" where "userId" = $1 order by "createdAt", id"#,
    )
    .bind(&auth.user.id)
    .fetch_all(&services.pool)
    .await
    .map_err(|_| {
        tracing::error!(function = GetProfile::NAME, "profile store unavailable");
        ApiError::Unavailable
    })?;
    let mut seen = HashSet::new();
    providers.retain(|provider| seen.insert(provider.clone()));
    Ok(ok(ProfileRecord {
        name: Some(auth.user.name),
        email: Some(auth.user.email),
        image: auth.user.image,
        email_verified: auth.user.email_verified,
        providers,
    }))
}

pub(super) fn register(router: FnRouter) -> FnRouter {
    router.function::<GetProfile, _, _>(get_profile)
}
