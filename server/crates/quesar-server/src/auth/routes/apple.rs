//! `POST /callback/apple`: Apple's cross-site form POST, the one `/api/auth`
//! route without a same-origin check.
//!
//! Apple requires `response_mode=form_post` for the `name` and `email`
//! scopes, so the browser arrives by a cross-site POST, which carries none of
//! our `SameSite=Lax` cookies. Better Auth answers it with a redirect to the
//! same callback as a GET (`callback.mjs:35-45`); the binding cookie then
//! arrives with that top-level GET. This handler does the same, but keeps the
//! code off the URL: it parks what Apple delivered on the flow row, once, and
//! redirects to `GET /callback/apple?state=<state>`, which completes the flow
//! as for Google. It signs nobody in and does not consume the flow, and what
//! it reads from the form is validated and capped before it is stored.
//!
//! Every outcome is a redirect, to the return path or to an error path with a
//! fixed code, except a body over 16 KiB (413).

use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE, LOCATION};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use quesar_auth::oauth::flow::{self, Attach, Posted};
use quesar_auth::oauth::paths;
use quesar_auth::oauth::provider::ProviderId;
use quesar_auth::providers::apple;
use quesar_services::rate_limit::Bucket;

use crate::auth::extract::{ClientIp, SameOriginOrApple};
use crate::auth::routes::oauth::{configured, not_configured};
use crate::auth::{ApiError, AuthServices};
use crate::body_limit::read_body_limited;
use crate::router::AppState;

/// Apple's form is a few hundred bytes plus an ID token it also sends.
pub const FORM_MAX: usize = 16 * 1024;
/// Our states are 43 characters; anything much longer is not one.
const STATE_MAX_LEN: usize = 256;
/// Apple's codes are about a hundred characters.
const CODE_MAX_LEN: usize = 2048;
/// The first-sign-in `user` JSON is a name and an email.
const USER_MAX_LEN: usize = 4096;
/// Where a POST with no usable flow goes.
const LOGIN: &str = "/login";
const FORM: &str = "application/x-www-form-urlencoded";

fn redirect(location: &str) -> Response {
    let mut response = StatusCode::SEE_OTHER.into_response();
    let headers = response.headers_mut();
    headers.insert(
        LOCATION,
        HeaderValue::from_str(location)
            .unwrap_or_else(|_| HeaderValue::from_static("/login?error=failed")),
    );
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

fn is_form(headers: &HeaderMap) -> bool {
    headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|media| media.trim().eq_ignore_ascii_case(FORM))
}

/// Our states are base64url; nothing else can be one, and nothing else is
/// ever put in the `Location`.
fn is_state(state: &str) -> bool {
    !state.is_empty()
        && state.len() <= STATE_MAX_LEN
        && state
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// The first value of each field the flow uses; the rest (Apple also posts an
/// `id_token`, which is never used) is dropped.
#[derive(Default)]
struct Form {
    code: Option<String>,
    state: Option<String>,
    user: Option<String>,
    error: Option<String>,
}

fn parse_form(body: &[u8]) -> Form {
    let mut form = Form::default();
    for (key, value) in url::form_urlencoded::parse(body) {
        let slot = match key.as_ref() {
            "code" => &mut form.code,
            "state" => &mut form.state,
            "user" => &mut form.user,
            "error" => &mut form.error,
            _ => continue,
        };
        slot.get_or_insert_with(|| value.into_owned());
    }
    form
}

/// What goes on the flow. The provider's `error` text is mapped to a fixed
/// code here and never stored.
fn posted(form: Form) -> Posted {
    let error = match form.error.as_deref().filter(|error| !error.is_empty()) {
        Some("access_denied" | "user_cancelled_authorize") => Some("access_denied"),
        Some(_) => Some("failed"),
        None if form.code.as_deref().is_some_and(|c| c.len() > CODE_MAX_LEN) => Some("failed"),
        None => None,
    };
    Posted {
        code: form
            .code
            .filter(|c| !c.is_empty() && c.len() <= CODE_MAX_LEN),
        error: error.map(str::to_owned),
        name: form
            .user
            .filter(|user| user.len() <= USER_MAX_LEN)
            .and_then(|user| apple::posted_name(&user)),
    }
}

pub async fn form_post(
    _: SameOriginOrApple,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    Path(name): Path<String>,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    // Only Apple answers by POST; for any other name, a same-origin POST has
    // nothing to do here.
    if ProviderId::parse(&name) != Some(ProviderId::Apple) {
        return Err(ApiError::NotFound);
    }
    if configured(services, &name).is_none() {
        return Err(not_configured());
    }
    // Before the body is read or the database touched.
    if let Err(error) = services
        .limit(Bucket::AuthGeneral, &ip.subject(services))
        .await
    {
        tracing::warn!(%error, "apple callback limited");
        return Ok(redirect(&paths::with_error(LOGIN, "failed")));
    }
    if !is_form(&headers) {
        return Ok(redirect(&paths::with_error(LOGIN, "failed")));
    }
    let bytes = match read_body_limited(&headers, body, FORM_MAX).await {
        Ok(bytes) => bytes,
        Err(error) => return Ok(error.into_response()),
    };
    let mut form = parse_form(&bytes);
    let Some(state_value) = form.state.take().filter(|state| is_state(state)) else {
        return Ok(redirect(&paths::with_error(LOGIN, "state_not_found")));
    };
    Ok(attach(services, &state_value, posted(form)).await)
}

async fn attach(services: &AuthServices, state: &str, posted: Posted) -> Response {
    let failed = |stored: &str, code: &str| {
        redirect(&paths::with_error(
            &paths::safe_error_callback(Some(stored)),
            code,
        ))
    };
    match flow::attach_post(&services.pool, state, &posted, services.clock.now()).await {
        // `state` is base64url, so it needs no encoding here.
        Ok(Attach::Stored) => redirect(&format!("/api/auth/callback/apple?state={state}")),
        Ok(Attach::Unknown) => redirect(&paths::with_error(LOGIN, "state_not_found")),
        Ok(Attach::Expired { error_callback }) => failed(&error_callback, "expired"),
        Ok(Attach::AlreadyPosted { error_callback }) => failed(&error_callback, "state_mismatch"),
        Err(error) => {
            tracing::error!(%error, "apple callback could not be stored");
            redirect(&paths::with_error(LOGIN, "failed"))
        }
    }
}
