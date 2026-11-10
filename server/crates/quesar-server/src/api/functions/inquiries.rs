//! `inquiries.sendInquiry` (`src/lib/server/inquiries.server.ts`).
//!
//! The order is the TypeScript's, and it matters: rate limit first (the
//! cheapest refusal, and it caps siteverify calls), then validation, then
//! Turnstile, then the insert. Every refusal that is the sender's to fix is
//! HTTP 200 inside the `ok` envelope with a `code` the form reads; the limiter
//! never answers 429 here. Nothing a sender typed and no driver text is ever
//! logged.

use std::sync::Arc;

use axum::extract::{Request, State};
use axum::response::Response;
use quesar_contract::inquiries::{InquiryCode, InquiryField, InquiryResult, SendInquiry};
use quesar_services::inquiries::rules::{self, Field, InquiryInput};
use quesar_services::inquiries::{self, ValidInquiry};
use quesar_services::rate_limit::Bucket;
use quesar_services::text::js_trim;
use quesar_services::turnstile::{TurnstileState, Verifier};

use crate::api::body::read_value;
use crate::api::{ApiError, FnRouter, error::ok, remote_ip};
use crate::auth::AuthServices;
use crate::auth::extract::{ClientIp, maybe_user};
use crate::router::AppState;

/// The cap on the request body.
pub const INQUIRY_BODY_MAX: usize = 32 * 1024;

const UNAVAILABLE: &str = "We couldn't save that. Try again in a moment.";
const RATE_LIMITED: &str = "Too many inquiries from here. Try again in a few minutes.";
const VERIFICATION: &str =
    "We couldn't confirm you're not a bot. Complete the check and try again.";
const MISCONFIGURED: &str =
    "Bot verification is misconfigured on this site, so inquiries cannot be accepted right now.";

fn refused(code: InquiryCode, error: &str, field: Option<InquiryField>) -> Response {
    ok(InquiryResult::Refused {
        code,
        error: error.to_owned(),
        field,
    })
}

fn wire_field(field: Field) -> InquiryField {
    match field {
        Field::Name => InquiryField::Name,
        Field::Email => InquiryField::Email,
        Field::Company => InquiryField::Company,
        Field::Topic => InquiryField::Topic,
        Field::Message => InquiryField::Message,
    }
}

/// Stores the inquiry in one transaction, so the share lock on the sender's
/// user row lasts until the commit. Any failure is `Err` with its text dropped.
async fn store(
    services: &AuthServices,
    user_id: Option<&str>,
    inquiry: &ValidInquiry,
) -> Result<(), ()> {
    let mut tx = services.pool.begin().await.map_err(drop)?;
    inquiries::insert(&mut tx, user_id, inquiry)
        .await
        .map_err(drop)?;
    tx.commit().await.map_err(drop)
}

async fn send_inquiry(
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    request: Request,
) -> Result<Response, ApiError> {
    // Without a database there is no limiter and nowhere to store.
    let Some(services) = state.database() else {
        return Ok(refused(InquiryCode::Unavailable, UNAVAILABLE, None));
    };
    // The limiter is called directly, not through `AuthServices::limit`: its
    // error conversion logs the driver's text, which this handler must not.
    let now_ms =
        i64::try_from(services.clock.now().unix_timestamp_nanos() / 1_000_000).unwrap_or(i64::MAX);
    match services
        .limiter
        .hit(Bucket::Inquiry, &ip.subject(services), now_ms)
        .await
    {
        Ok(hit) if hit.allowed => {}
        Ok(_) => return Ok(refused(InquiryCode::RateLimited, RATE_LIMITED, None)),
        Err(_) => {
            tracing::error!("inquiry rate limit unavailable");
            return Ok(refused(InquiryCode::Unavailable, UNAVAILABLE, None));
        }
    }

    let (parts, body) = request.into_parts();
    let value = read_value(&parts.headers, body, INQUIRY_BODY_MAX).await?;
    let input: InquiryInput = rules::coerce(&value);
    let valid = match rules::validate(&input) {
        Ok(valid) => valid,
        Err(refusal) => {
            return Ok(refused(
                InquiryCode::Invalid,
                &refusal.message,
                Some(wire_field(refusal.field)),
            ));
        }
    };

    match state.public.turnstile.state() {
        TurnstileState::Off => {}
        TurnstileState::Misconfigured => {
            tracing::error!(
                "Turnstile is misconfigured: TURNSTILE_HOSTNAMES is empty while the key and secret are set"
            );
            return Ok(refused(InquiryCode::Misconfigured, MISCONFIGURED, None));
        }
        TurnstileState::Ready => {
            let verified = Verifier::new(&state.public.http, &state.public.turnstile)
                .verify(
                    js_trim(&input.turnstile_token),
                    "inquiry",
                    remote_ip(&ip).as_deref(),
                )
                .await;
            if !verified {
                return Ok(refused(InquiryCode::Verification, VERIFICATION, None));
            }
        }
    }

    // A lookup error counts as signed out, as in the TypeScript.
    let user = maybe_user(&parts, services).await.ok().flatten();
    let user_id = user.as_ref().map(|auth| auth.user.id.as_str());
    match store(services, user_id, &valid).await {
        Ok(()) => Ok(ok(InquiryResult::Sent)),
        Err(()) => {
            tracing::error!("database error saving inquiry");
            Ok(refused(InquiryCode::Unavailable, UNAVAILABLE, None))
        }
    }
}

pub fn register(router: FnRouter) -> FnRouter {
    router.function::<SendInquiry, _, _>(send_inquiry)
}
