//! OAuth sign-in: `POST /oauth/{provider}/start` and `GET /callback/{provider}`.
//!
//! Ports `server.ts:107-124,155-170` and Better Auth's `callback.mjs` with the
//! binding cookie of Contradiction 7. Google and Apple are wired so far; X
//! answers as not configured until its task lands. Apple's browser comes back
//! by a cross-site form POST (`routes/apple.rs`), which parks its code on the
//! flow; the GET here then completes the flow like any other provider's.
//!
//! The callback is a browser navigation, so every outcome is a redirect: to
//! the return path on success, or to the flow's error path with
//! `?error=<code>`, a code from a fixed list. Nothing the provider says
//! (`error_description`, an unknown `error`) is ever forwarded, and neither
//! the code nor the state is echoed or logged.

use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, LOCATION, SET_COOKIE};
use axum::http::{HeaderMap, HeaderValue, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use quesar_auth::oauth::flow::{self, Flow};
use quesar_auth::oauth::link::{self, Outcome};
use quesar_auth::oauth::paths;
use quesar_auth::oauth::provider::{self, Identity, ProviderError, ProviderId};
use quesar_auth::providers::apple::AppleSecrets;
use quesar_auth::providers::{Deps, apple, google};
use quesar_auth::{AppleConfig, AuthError, OAuthClient};
use quesar_services::rate_limit::Bucket;
use serde::Deserialize;
use serde_json::json;

use crate::auth::error::ok;
use crate::auth::extract::{ClientIp, FetchMetadata, SameOrigin};
use crate::auth::issue::{issue_session, with_cookie};
use crate::auth::{ApiError, AuthServices, json};
use crate::router::AppState;

/// Our own states are 43 characters; anything much longer is not one.
const STATE_MAX_LEN: usize = 256;
/// Google's codes are about a hundred characters.
const CODE_MAX_LEN: usize = 2048;
/// Where a callback with no usable flow goes.
const LOGIN: &str = "/login";

#[derive(Deserialize)]
struct StartBody {
    #[serde(default, rename = "callbackURL")]
    callback_url: Option<String>,
    #[serde(default, rename = "errorCallbackURL")]
    error_callback_url: Option<String>,
}

pub(super) fn not_configured() -> ApiError {
    ApiError::auth(
        StatusCode::NOT_FOUND,
        "PROVIDER_NOT_CONFIGURED",
        "Provider is not configured",
    )
}

/// A provider this server has credentials for.
pub(super) enum Configured<'a> {
    Google(&'a OAuthClient),
    Apple(&'a AppleConfig, &'a AppleSecrets),
}

impl Configured<'_> {
    pub(super) fn id(&self) -> ProviderId {
        match self {
            Self::Google(_) => ProviderId::Google,
            Self::Apple(..) => ProviderId::Apple,
        }
    }
}

/// The provider named in the path, if it is one this server can sign in with
/// and has usable credentials for (Apple's key must mint a client secret).
pub(super) fn configured<'a>(services: &'a AuthServices, name: &str) -> Option<Configured<'a>> {
    match ProviderId::parse(name)? {
        ProviderId::Google => services
            .config
            .providers
            .google
            .as_ref()
            .map(Configured::Google),
        ProviderId::Apple => services
            .apple()
            .map(|(config, secrets)| Configured::Apple(config, secrets)),
        // X arrives with its own task.
        ProviderId::Twitter => None,
    }
}

pub async fn start(
    _: SameOrigin,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    Path(name): Path<String>,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthCredential, &ip.subject(services))
        .await?;
    let configured = configured(services, &name).ok_or_else(not_configured)?;
    let provider = configured.id();
    let input: StartBody = json::read(&headers, body).await?;
    let callback = paths::safe_callback(input.callback_url.as_deref());
    let error_callback = paths::safe_error_callback(input.error_callback_url.as_deref());

    let started = flow::start(
        &services.pool,
        provider,
        &callback,
        &error_callback,
        services.clock.now(),
    )
    .await?;
    let nonce = started.nonce.as_ref().map(|nonce| nonce.expose());
    let redirect_uri = provider::redirect_uri(&services.config, provider);
    let (state, challenge, nonce) = (
        started.state.expose(),
        started.challenge.as_str(),
        nonce.unwrap_or_default(),
    );
    let url = match configured {
        Configured::Google(client) => {
            google::authorize_url(client, &redirect_uri, state, challenge, nonce)
        }
        Configured::Apple(config, _) => {
            apple::authorize_url(config, &redirect_uri, state, challenge, nonce)
        }
    }
    .map_err(|error| {
        tracing::error!(%error, "cannot build the authorization URL");
        ApiError::Unavailable
    })?;
    with_cookie(
        ok(json!({ "url": url })),
        &flow::binding_cookie(&started.binding),
    )
}

/// `code`, `state` and `error` from the query: the first of each.
#[derive(Default)]
struct Query {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

fn parse_query(uri: &Uri) -> Query {
    let mut query = Query::default();
    for (key, value) in url::form_urlencoded::parse(uri.query().unwrap_or_default().as_bytes()) {
        let slot = match key.as_ref() {
            "code" => &mut query.code,
            "state" => &mut query.state,
            "error" => &mut query.error,
            _ => continue,
        };
        slot.get_or_insert_with(|| value.into_owned());
    }
    query
}

/// How a callback ends.
enum Finish {
    /// Go to the return path with the session cookie.
    SignedIn { location: String, cookie: String },
    /// Go to an error path.
    Failed { location: String },
}

fn failed(path: &str, code: &str) -> Finish {
    Finish::Failed {
        location: paths::with_error(path, code),
    }
}

fn no_flow(code: &str) -> Finish {
    failed(LOGIN, code)
}

fn into_response(finish: Finish, clear_binding: bool) -> Response {
    let (location, session_cookie) = match finish {
        Finish::SignedIn { location, cookie } => (location, Some(cookie)),
        Finish::Failed { location } => (location, None),
    };
    let mut response = StatusCode::SEE_OTHER.into_response();
    let headers = response.headers_mut();
    headers.insert(
        LOCATION,
        HeaderValue::from_str(&location)
            .unwrap_or_else(|_| HeaderValue::from_static("/login?error=failed")),
    );
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    // The values are ASCII built by `session` and `flow`.
    let cookies = session_cookie
        .into_iter()
        .chain(clear_binding.then(flow::clear_binding_cookie));
    for cookie in cookies {
        if let Ok(value) = HeaderValue::from_str(&cookie) {
            headers.append(SET_COOKIE, value);
        }
    }
    response
}

pub async fn callback(
    _: FetchMetadata,
    State(state): State<Arc<AppState>>,
    ip: ClientIp,
    Path(name): Path<String>,
    headers: HeaderMap,
    uri: Uri,
) -> Response {
    let Ok(services) = state.auth_services() else {
        return ApiError::Unavailable.into_response();
    };
    // Before any database or provider work. A refusal leaves the flow in
    // place, so the binding cookie stays.
    if let Err(error) = services
        .limit(Bucket::AuthGeneral, &ip.subject(services))
        .await
    {
        tracing::warn!(%error, "oauth callback limited");
        return into_response(no_flow("failed"), false);
    }
    let finish = run(services, &name, parse_query(&uri), &headers, &ip.0).await;
    into_response(finish, true)
}

async fn run(
    services: &AuthServices,
    name: &str,
    query: Query,
    headers: &HeaderMap,
    ip: &str,
) -> Finish {
    let now = services.clock.now();
    let Some(state) = query
        .state
        .as_deref()
        .filter(|state| !state.is_empty() && state.len() <= STATE_MAX_LEN)
    else {
        return no_flow("state_not_found");
    };
    // One statement takes the row out: a replay finds nothing.
    let flow = match flow::consume(&services.pool, state, now).await {
        Ok(Some(flow)) => flow,
        Ok(None) => return no_flow("state_not_found"),
        Err(error) => {
            tracing::error!(%error, "oauth flow lookup failed");
            return no_flow("failed");
        }
    };
    let error_path = paths::safe_error_callback(Some(&flow.error_callback));
    let refuse = |code: &str| failed(&error_path, code);

    if flow.provider != name {
        return refuse("state_mismatch");
    }
    if flow.expired {
        return refuse("expired");
    }
    // The state only names the flow; the binding proves this is the browser
    // that started it.
    let bound = flow::read_binding_cookie(headers)
        .is_some_and(|presented| flow.binding_matches(&presented));
    if !bound {
        return refuse("state_mismatch");
    }
    // Apple's answer came by form POST and is parked on the flow; for the
    // others it is in this request's query. An Apple GET carrying its own
    // `code` or `error` is not an answer.
    let (error, code, name) = if flow.provider == ProviderId::Apple.as_str() {
        match flow.posted.as_ref() {
            Some(posted) => (
                posted.error.as_deref(),
                posted.code.as_deref(),
                posted.name.as_deref(),
            ),
            None => (None, None, None),
        }
    } else {
        (query.error.as_deref(), query.code.as_deref(), None)
    };
    if let Some(error) = error {
        // The provider's own text is never forwarded.
        return refuse(if error == "access_denied" {
            "access_denied"
        } else {
            "failed"
        });
    }
    let Some(code) = code.filter(|code| !code.is_empty()) else {
        return refuse("no_code");
    };
    if code.len() > CODE_MAX_LEN {
        return refuse("failed");
    }

    let identity = match exchange(services, &flow, code, name, now).await {
        Ok(identity) => identity,
        Err(error) => {
            tracing::warn!(%error, "oauth code exchange failed");
            return refuse("failed");
        }
    };
    match sign_in(services, &identity, ip, headers).await {
        Ok(Ok(cookie)) => Finish::SignedIn {
            location: paths::safe_callback(Some(&flow.callback)),
            cookie,
        },
        Ok(Err(code)) => refuse(code),
        Err(error) => {
            tracing::error!(%error, "oauth sign-in failed");
            refuse("failed")
        }
    }
}

/// Exchanges the code with the provider the flow was started for.
async fn exchange(
    services: &AuthServices,
    flow: &Flow,
    code: &str,
    posted_name: Option<&str>,
    now: time::OffsetDateTime,
) -> Result<Identity, ExchangeError> {
    let provider = ProviderId::parse(&flow.provider).ok_or(ExchangeError::Provider)?;
    let configured = configured(services, provider.as_str()).ok_or(ExchangeError::Provider)?;
    let deps = Deps {
        http: &services.http,
        jwks: &services.jwks,
        allow_http: !services.production,
    };
    let nonce = flow.nonce.as_ref().ok_or(ExchangeError::Provider)?;
    let redirect_uri = provider::redirect_uri(&services.config, provider);
    match configured {
        Configured::Google(client) => Ok(google::exchange(
            &deps,
            client,
            code,
            flow.verifier.expose(),
            &redirect_uri,
            nonce.expose(),
            now,
        )
        .await?),
        Configured::Apple(config, secrets) => Ok(apple::exchange(
            &deps,
            config,
            &secrets.current(config, now),
            code,
            flow.verifier.expose(),
            &redirect_uri,
            nonce.expose(),
            posted_name,
            now,
        )
        .await?),
    }
}

#[derive(Debug)]
enum ExchangeError {
    /// The flow names a provider this server cannot exchange with now.
    Provider,
    Exchange(ProviderError),
}

impl std::fmt::Display for ExchangeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Provider => f.write_str("provider is not available"),
            Self::Exchange(error) => write!(f, "{error}"),
        }
    }
}

impl From<ProviderError> for ExchangeError {
    fn from(error: ProviderError) -> Self {
        Self::Exchange(error)
    }
}

#[derive(Debug)]
enum SignInError {
    Auth(AuthError),
    Api(ApiError),
}

impl std::fmt::Display for SignInError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Auth(error) => write!(f, "{error}"),
            Self::Api(error) => write!(f, "{error}"),
        }
    }
}

/// Links or creates the user and issues the session in one transaction.
/// `Ok(Err(code))` is a refusal with its callback error code.
async fn sign_in(
    services: &AuthServices,
    identity: &Identity,
    ip: &str,
    headers: &HeaderMap,
) -> Result<Result<String, &'static str>, SignInError> {
    let mut tx = services
        .pool
        .begin()
        .await
        .map_err(|error| SignInError::Auth(error.into()))?;
    match link::resolve(&mut tx, identity, services.clock.now())
        .await
        .map_err(SignInError::Auth)?
    {
        Outcome::SignedIn(user) => {
            let issued = issue_session(services, tx, &user.id, ip, headers)
                .await
                .map_err(SignInError::Api)?;
            Ok(Ok(issued.cookie))
        }
        Outcome::Refused(refusal) => {
            // A refusal may have forgotten a stale verification: keep that.
            tx.commit()
                .await
                .map_err(|error| SignInError::Auth(error.into()))?;
            Ok(Err(refusal.code()))
        }
    }
}
