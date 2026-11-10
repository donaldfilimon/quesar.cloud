//! The configuration reads: `inquiries.getTurnstileConfig`,
//! `quasar.getQuasarDefaultOrigin` and `commerce.getCommerceReadiness`.
//!
//! Each answers a value computed once at startup ([`PublicServices`]). They are
//! limited per client address (`Bucket::AuthGeneral`) when a database exists;
//! the limiter is the only thing here that can fail, and it fails open: these
//! reads return startup configuration, and a 503 would hide the Turnstile
//! widget while the server still demands a token.

use std::sync::Arc;

use axum::extract::State;
use axum::response::Response;
use quesar_contract::commerce::{
    CommerceReadiness, CommerceStorage, GetCommerceReadiness, PaymentMode,
};
use quesar_contract::inquiries::{GetTurnstileConfig, TurnstileConfig as TurnstileWire};
use quesar_contract::quasar::GetQuasarDefaultOrigin;
use quesar_services::commerce::{CommerceInputs, readiness};
use quesar_services::crypto::SealingKeys;
use quesar_services::quasar::normalize_origin;
use quesar_services::rate_limit::Bucket;
use quesar_services::turnstile::{TurnstileConfig, TurnstileState};

use crate::api::{ApiError, FnRouter, error::ok};
use crate::auth::extract::ClientIp;
use crate::config::Environment;
use crate::readiness::public_origin;
use crate::router::AppState;

/// Whether the invoice functions exist. `getCommerceReadiness` answers
/// `configured: false` while this is false, so the server never says
/// invoicing is ready while it cannot create an invoice. M6 flips it.
pub const COMMERCE_FUNCTIONS_AVAILABLE: bool = false;

pub(crate) fn turnstile(environment: &Environment) -> TurnstileConfig {
    TurnstileConfig::from_lookup(|name| environment.read(name).map(str::to_owned))
}

pub(crate) fn quasar_default_origin(environment: &Environment) -> Option<String> {
    environment
        .read("QUASAR_SERVICE_ORIGIN")
        .and_then(normalize_origin)
}

pub(crate) fn commerce(environment: &Environment) -> CommerceReadiness {
    // The WDBX values are judged exactly as set, not trimmed.
    let raw = |name: &str| {
        environment
            .raw_pairs()
            .find(|(key, _)| *key == name)
            .map(|(_, value)| value.to_owned())
    };
    let sealing = SealingKeys::new(
        environment.read("APP_ENCRYPTION_KEY"),
        environment.read("APP_ENCRYPTION_KEY_PREVIOUS"),
    );
    let inputs = CommerceInputs {
        wdbx_binary: raw("WDBX_BINARY"),
        wdbx_directory: raw("WDBX_COMMERCE_DIRECTORY"),
        wdbx_config: raw("WDBX_COMMERCE_CONFIG"),
        wdbx_host_key: raw("WDBX_COMMERCE_HOST_KEY"),
        database_url: raw("DATABASE_URL"),
        public_origin: public_origin(environment).map(str::to_owned),
        encryption_configured: sealing.configured(),
    };
    CommerceReadiness {
        configured: readiness(&inputs, COMMERCE_FUNCTIONS_AVAILABLE),
        payment_mode: PaymentMode::ManualInvoice,
        storage: CommerceStorage::Wdbx,
    }
}

/// Counts one hit for the caller's address. Over the limit is the 429;
/// anything else wrong with the limiter is logged (a fixed line, no driver
/// text) and the read still answers. Without a database there is no limiter
/// to ask.
async fn limit(state: &AppState, ip: &ClientIp) -> Result<(), ApiError> {
    let Some(services) = state.database() else {
        return Ok(());
    };
    let now_ms =
        i64::try_from(services.clock.now().unix_timestamp_nanos() / 1_000_000).unwrap_or(i64::MAX);
    match services
        .limiter
        .hit(Bucket::AuthGeneral, &ip.subject(services), now_ms)
        .await
    {
        Ok(hit) if !hit.allowed => Err(ApiError::RateLimited {
            retry_after_ms: hit.retry_after_ms,
        }),
        Ok(_) => Ok(()),
        Err(_) => {
            tracing::warn!("rate limit store unavailable; configuration read answered anyway");
            Ok(())
        }
    }
}

async fn get_turnstile_config(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
) -> Result<Response, ApiError> {
    limit(&state, &ip).await?;
    let config = &state.public.turnstile;
    let wire = match (config.state(), config.site_key()) {
        (TurnstileState::Ready, Some(site_key)) => TurnstileWire::Ready {
            site_key: site_key.to_owned(),
        },
        (TurnstileState::Misconfigured, _) => TurnstileWire::Misconfigured,
        _ => TurnstileWire::Off,
    };
    Ok(ok(wire))
}

async fn get_quasar_default_origin(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
) -> Result<Response, ApiError> {
    limit(&state, &ip).await?;
    Ok(ok(&state.public.quasar_default_origin))
}

async fn get_commerce_readiness(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
) -> Result<Response, ApiError> {
    limit(&state, &ip).await?;
    Ok(ok(state.public.commerce))
}

pub fn register(router: FnRouter) -> FnRouter {
    router
        .function::<GetTurnstileConfig, _, _>(get_turnstile_config)
        .function::<GetQuasarDefaultOrigin, _, _>(get_quasar_default_origin)
        .function::<GetCommerceReadiness, _, _>(get_commerce_readiness)
}
