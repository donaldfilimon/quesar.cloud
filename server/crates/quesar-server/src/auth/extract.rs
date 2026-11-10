//! Request checks and the request-scoped extractors.
//!
//! * [`SameOrigin`] ports `isSameOriginRequest` (`src/framework/csrf.ts`),
//!   comparing against the configured origins instead of `Host`. Use it on
//!   state-changing endpoints that carry no session.
//! * [`FetchMetadata`] ports `assertSameSiteRequest` (`isolation.server.ts`).
//! * [`AuthUser`] / [`MaybeUser`] run [`FetchMetadata`] and then look up the
//!   session cookie.
//! * [`ClientIp`] is the address rate limits key on.
//! * [`SameOriginOrApple`] is the one route-level exemption: Apple posts its
//!   callback cross-site.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::{ConnectInfo, FromRequestParts, OriginalUri};
use axum::http::header::{ORIGIN, REFERER};
use axum::http::request::Parts;
use axum::http::{HeaderMap, HeaderName, Method};
use quesar_auth::session;
use quesar_auth::{SessionRow, UserRow};
use quesar_services::rate_limit::client_ip_from_headers;

use super::AuthServices;
use super::error::ApiError;
use super::reissue::ReissueSlot;
use crate::router::AppState;

const SEC_FETCH_SITE: HeaderName = HeaderName::from_static("sec-fetch-site");
const SEC_FETCH_MODE: HeaderName = HeaderName::from_static("sec-fetch-mode");
const SEC_FETCH_DEST: HeaderName = HeaderName::from_static("sec-fetch-dest");

/// Where Apple's form-POST callback comes from.
pub const APPLE_ORIGIN: &str = "https://appleid.apple.com";
/// The only path that may take [`APPLE_ORIGIN`] (full path, mount included).
pub const APPLE_CALLBACK_PATH: &str = "/api/auth/callback/apple";

/// A header as a browser's `Headers.get` would give it, for a strict check.
#[derive(Debug, PartialEq, Eq)]
enum Header<'a> {
    Absent,
    Value(&'a str),
    /// Repeated or not UTF-8: it can match nothing, so every comparison fails.
    Invalid,
}

fn header<'a>(headers: &'a HeaderMap, name: &HeaderName) -> Header<'a> {
    let mut values = headers.get_all(name).iter();
    match (values.next(), values.next()) {
        (None, _) => Header::Absent,
        (Some(value), None) => value.to_str().map_or(Header::Invalid, Header::Value),
        (Some(_), Some(_)) => Header::Invalid,
    }
}

fn referer_in_origin(referer: &str, origin: &str) -> bool {
    match referer.strip_prefix(origin) {
        Some("") => true,
        Some(rest) => rest.starts_with(['/', '?', '#']),
        None => false,
    }
}

/// `isSameOriginRequest`: `Sec-Fetch-Site` decides when present, else `Origin`,
/// else `Referer`, else refuse. `Host` is never read. `Sec-Fetch-Site: none`
/// (a typed URL) is refused here: a state-changing request is never that.
pub fn is_same_origin(headers: &HeaderMap, trusted: &[String]) -> bool {
    match header(headers, &SEC_FETCH_SITE) {
        Header::Value(site) => return site == "same-origin",
        Header::Invalid => return false,
        Header::Absent => {}
    }
    match header(headers, &ORIGIN) {
        Header::Value(origin) => return trusted.iter().any(|t| t == origin),
        Header::Invalid => return false,
        Header::Absent => {}
    }
    match header(headers, &REFERER) {
        Header::Value(referer) => trusted.iter().any(|t| referer_in_origin(referer, t)),
        Header::Invalid | Header::Absent => false,
    }
}

/// `assertSameSiteRequest`: allows a missing or empty `Sec-Fetch-Site`,
/// `same-origin`, `none`, and a top-level GET navigation (not into an object
/// or embed).
pub fn is_same_site(headers: &HeaderMap, method: &Method) -> bool {
    match header(headers, &SEC_FETCH_SITE) {
        Header::Absent | Header::Value("" | "same-origin" | "none") => return true,
        Header::Value(_) | Header::Invalid => {}
    }
    let value = |name: &HeaderName| match header(headers, name) {
        Header::Value(v) => Some(v),
        _ => None,
    };
    let dest = value(&SEC_FETCH_DEST);
    value(&SEC_FETCH_MODE) == Some("navigate")
        && method == Method::GET
        && dest != Some("object")
        && dest != Some("embed")
}

/// Apple's callback: a POST to [`APPLE_CALLBACK_PATH`] whose `Origin` is
/// Apple's, with Apple configured. A browser marks that request `cross-site`
/// (or sends no fetch metadata), never `same-site`/`same-origin`, so anything
/// else falls to the ordinary [`is_same_origin`] rule. The `state` row and the
/// binding cookie, not this header, are what authenticate the callback.
pub fn is_apple_callback(
    headers: &HeaderMap,
    method: &Method,
    path: &str,
    apple_configured: bool,
) -> bool {
    apple_configured
        && method == Method::POST
        && path == APPLE_CALLBACK_PATH
        && header(headers, &ORIGIN) == Header::Value(APPLE_ORIGIN)
        && matches!(
            header(headers, &SEC_FETCH_SITE),
            Header::Absent | Header::Value("cross-site")
        )
}

/// The request came from a trusted origin (see [`is_same_origin`]).
#[derive(Debug, Clone, Copy)]
pub struct SameOrigin;

impl FromRequestParts<Arc<AppState>> for SameOrigin {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, ApiError> {
        let services = state.auth_services()?;
        if is_same_origin(&parts.headers, &services.config.trusted_origins) {
            Ok(Self)
        } else {
            Err(ApiError::CrossSite)
        }
    }
}

/// [`SameOrigin`], plus Apple's cross-site callback POST. Apply it to the
/// Apple callback route only; the path and `AuthConfig.providers.apple` are
/// checked again here, so mounting it elsewhere grants nothing.
#[derive(Debug, Clone, Copy)]
pub struct SameOriginOrApple;

impl FromRequestParts<Arc<AppState>> for SameOriginOrApple {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, ApiError> {
        let services = state.auth_services()?;
        let apple = services.config.providers.apple.is_some();
        // A nested router sees the path without its mount prefix; the
        // exemption is defined on the full path, so read the original.
        let path = parts
            .extensions
            .get::<OriginalUri>()
            .map_or_else(|| parts.uri.path(), |original| original.0.path());
        if is_apple_callback(&parts.headers, &parts.method, path, apple)
            || is_same_origin(&parts.headers, &services.config.trusted_origins)
        {
            Ok(Self)
        } else {
            Err(ApiError::CrossSite)
        }
    }
}

/// The request is not a scripted cross-site one (see [`is_same_site`]).
#[derive(Debug, Clone, Copy)]
pub struct FetchMetadata;

impl<S: Send + Sync> FromRequestParts<S> for FetchMetadata {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, ApiError> {
        if is_same_site(&parts.headers, &parts.method) {
            Ok(Self)
        } else {
            Err(ApiError::CrossSite)
        }
    }
}

/// A signed-in user: their row and the session it came from.
#[derive(Debug)]
pub struct AuthUser {
    pub user: UserRow,
    pub session: SessionRow,
    /// A `Set-Cookie` value to send back when this request extended the
    /// session, so the browser cookie keeps pace with the stored expiry. The
    /// `auth` router's response layer already sends it (see `reissue`); this
    /// is for inspection.
    pub reissue_cookie: Option<String>,
}

/// Cookie lookup shared by [`AuthUser`] and [`MaybeUser`].
async fn lookup(parts: &Parts, services: &AuthServices) -> Result<Option<AuthUser>, ApiError> {
    let Some(token) = session::read_cookie(&parts.headers) else {
        return Ok(None);
    };
    let found = session::resolve(&services.pool, &token, services.clock.now()).await?;
    Ok(found.map(|(session, user, refreshed)| {
        let reissue_cookie = if refreshed {
            session::set_cookie_for_presented(&token)
        } else {
            None
        };
        // Hand the cookie to the response layer too, so no handler has to
        // remember it (see `reissue`).
        if let (Some(cookie), Some(slot)) = (&reissue_cookie, parts.extensions.get::<ReissueSlot>())
        {
            slot.set(cookie.clone());
        }
        AuthUser {
            user,
            session,
            reissue_cookie,
        }
    }))
}

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, ApiError> {
        FetchMetadata::from_request_parts(parts, state).await?;
        let services = state.auth_services()?;
        lookup(parts, services).await?.ok_or(ApiError::Unauthorized)
    }
}

/// The same lookup as [`AuthUser`] without the 401. [`FetchMetadata`] still
/// runs.
#[derive(Debug)]
pub struct MaybeUser(pub Option<AuthUser>);

impl FromRequestParts<Arc<AppState>> for MaybeUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, ApiError> {
        FetchMetadata::from_request_parts(parts, state).await?;
        let services = state.auth_services()?;
        Ok(Self(lookup(parts, services).await?))
    }
}

/// The client address rate limits key on: the header `TRUSTED_PROXY` names,
/// else the peer socket address (an empty header counts as absent).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClientIp(pub String);

impl ClientIp {
    /// The keyed hash stored in `rate_limits`, never the raw address.
    pub fn subject(&self, services: &AuthServices) -> String {
        services.limiter.client_subject(&self.0)
    }
}

impl FromRequestParts<Arc<AppState>> for ClientIp {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let peer = parts
            .extensions
            .get::<ConnectInfo<SocketAddr>>()
            .map(|info| info.0);
        Ok(Self(client_ip_from_headers(
            &parts.headers,
            state.proxy_trust,
            peer,
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    type Pairs<'a> = &'a [(&'a str, &'a str)];

    fn headers(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for (name, value) in pairs {
            map.append(
                HeaderName::from_bytes(name.as_bytes()).unwrap(),
                HeaderValue::from_str(value).unwrap(),
            );
        }
        map
    }

    fn trusted() -> Vec<String> {
        vec!["https://quesar.cloud".to_owned()]
    }

    #[test]
    fn same_origin_table() {
        let cases: &[(&str, Pairs, bool)] = &[
            (
                "site same-origin",
                &[("sec-fetch-site", "same-origin")],
                true,
            ),
            ("site same-site", &[("sec-fetch-site", "same-site")], false),
            (
                "site cross-site",
                &[("sec-fetch-site", "cross-site")],
                false,
            ),
            (
                "site none is refused here",
                &[("sec-fetch-site", "none")],
                false,
            ),
            ("site empty", &[("sec-fetch-site", "")], false),
            (
                "site wrong case",
                &[("sec-fetch-site", "Same-Origin")],
                false,
            ),
            (
                "site same-origin beats a foreign origin",
                &[
                    ("sec-fetch-site", "same-origin"),
                    ("origin", "https://evil.example"),
                ],
                true,
            ),
            (
                "site cross-site beats a matching origin",
                &[
                    ("sec-fetch-site", "cross-site"),
                    ("origin", "https://quesar.cloud"),
                ],
                false,
            ),
            ("origin equal", &[("origin", "https://quesar.cloud")], true),
            (
                "origin other port",
                &[("origin", "https://quesar.cloud:8443")],
                false,
            ),
            (
                "origin other scheme",
                &[("origin", "http://quesar.cloud")],
                false,
            ),
            (
                "origin trailing slash",
                &[("origin", "https://quesar.cloud/")],
                false,
            ),
            ("origin null", &[("origin", "null")], false),
            (
                "origin foreign",
                &[("origin", "https://evil.example")],
                false,
            ),
            (
                "host never trusted",
                &[("host", "evil.example"), ("origin", "https://evil.example")],
                false,
            ),
            (
                "origin refused even with a good referer",
                &[
                    ("origin", "https://evil.example"),
                    ("referer", "https://quesar.cloud/x"),
                ],
                false,
            ),
            (
                "referer exact",
                &[("referer", "https://quesar.cloud")],
                true,
            ),
            (
                "referer path",
                &[("referer", "https://quesar.cloud/x")],
                true,
            ),
            (
                "referer query",
                &[("referer", "https://quesar.cloud?x")],
                true,
            ),
            (
                "referer fragment",
                &[("referer", "https://quesar.cloud#x")],
                true,
            ),
            (
                "referer suffix host",
                &[("referer", "https://quesar.cloud.evil/")],
                false,
            ),
            (
                "referer other port",
                &[("referer", "https://quesar.cloud:8443/")],
                false,
            ),
            ("no headers", &[], false),
            ("host only", &[("host", "quesar.cloud")], false),
        ];
        for (name, pairs, expected) in cases {
            assert_eq!(
                is_same_origin(&headers(pairs), &trusted()),
                *expected,
                "{name}"
            );
        }
    }

    #[test]
    fn repeated_deciding_headers_are_refused() {
        let doubled = headers(&[
            ("origin", "https://quesar.cloud"),
            ("origin", "https://quesar.cloud"),
        ]);
        assert!(!is_same_origin(&doubled, &trusted()));
        let doubled = headers(&[
            ("sec-fetch-site", "same-origin"),
            ("sec-fetch-site", "same-origin"),
        ]);
        assert!(!is_same_origin(&doubled, &trusted()));
        let mut binary = HeaderMap::new();
        binary.insert(
            ORIGIN,
            HeaderValue::from_bytes(b"https://quesar.cl\xffud").unwrap(),
        );
        assert!(!is_same_origin(&binary, &trusted()));
    }

    #[test]
    fn dev_origins_are_trusted_only_when_configured() {
        use quesar_auth::AuthConfig;
        let lookup =
            |name: &str| (name == "PUBLIC_ORIGIN").then(|| "https://quesar.cloud".to_owned());
        let development = AuthConfig::from_lookup(lookup, false);
        let production = AuthConfig::from_lookup(lookup, true);
        let local = headers(&[("origin", "http://localhost:8080")]);
        assert!(is_same_origin(&local, &development.trusted_origins));
        assert!(!is_same_origin(&local, &production.trusted_origins));
        let own = headers(&[("origin", "https://quesar.cloud")]);
        assert!(is_same_origin(&own, &production.trusted_origins));
    }

    #[test]
    fn fetch_metadata_table() {
        let get = Method::GET;
        let post = Method::POST;
        let cases: &[(&str, Pairs, &Method, bool)] = &[
            ("no header", &[], &post, true),
            ("empty header", &[("sec-fetch-site", "")], &post, true),
            (
                "same-origin",
                &[("sec-fetch-site", "same-origin")],
                &post,
                true,
            ),
            ("none", &[("sec-fetch-site", "none")], &post, true),
            (
                "cross-site post",
                &[("sec-fetch-site", "cross-site")],
                &post,
                false,
            ),
            (
                "same-site post",
                &[("sec-fetch-site", "same-site")],
                &post,
                false,
            ),
            (
                "cross-site get, cors",
                &[("sec-fetch-site", "cross-site"), ("sec-fetch-mode", "cors")],
                &get,
                false,
            ),
            (
                "cross-site get, no mode",
                &[("sec-fetch-site", "cross-site")],
                &get,
                false,
            ),
            (
                "cross-site navigation get",
                &[
                    ("sec-fetch-site", "cross-site"),
                    ("sec-fetch-mode", "navigate"),
                    ("sec-fetch-dest", "document"),
                ],
                &get,
                true,
            ),
            (
                "same-site navigation get without dest",
                &[
                    ("sec-fetch-site", "same-site"),
                    ("sec-fetch-mode", "navigate"),
                ],
                &get,
                true,
            ),
            (
                "navigation post",
                &[
                    ("sec-fetch-site", "cross-site"),
                    ("sec-fetch-mode", "navigate"),
                ],
                &post,
                false,
            ),
            (
                "navigation into object",
                &[
                    ("sec-fetch-site", "cross-site"),
                    ("sec-fetch-mode", "navigate"),
                    ("sec-fetch-dest", "object"),
                ],
                &get,
                false,
            ),
            (
                "navigation into embed",
                &[
                    ("sec-fetch-site", "cross-site"),
                    ("sec-fetch-mode", "navigate"),
                    ("sec-fetch-dest", "embed"),
                ],
                &get,
                false,
            ),
            (
                "wrong case",
                &[("sec-fetch-site", "Cross-Site")],
                &post,
                false,
            ),
        ];
        for (name, pairs, method, expected) in cases {
            assert_eq!(is_same_site(&headers(pairs), method), *expected, "{name}");
        }
    }

    #[test]
    fn the_apple_exemption_is_one_route_one_origin_and_needs_apple() {
        let apple = [("origin", APPLE_ORIGIN), ("sec-fetch-site", "cross-site")];
        let ok = |h: &[(&str, &str)], method: &Method, path: &str, configured: bool| {
            is_apple_callback(&headers(h), method, path, configured)
        };
        assert!(ok(&apple, &Method::POST, APPLE_CALLBACK_PATH, true));
        assert!(ok(
            &[("origin", APPLE_ORIGIN)],
            &Method::POST,
            APPLE_CALLBACK_PATH,
            true
        ));
        assert!(
            !ok(&apple, &Method::POST, APPLE_CALLBACK_PATH, false),
            "apple not configured"
        );
        assert!(
            !ok(&apple, &Method::POST, "/api/auth/callback/google", true),
            "other path"
        );
        assert!(
            !ok(&apple, &Method::POST, "/api/auth/callback/apple/x", true),
            "longer path"
        );
        assert!(
            !ok(&apple, &Method::GET, APPLE_CALLBACK_PATH, true),
            "not a POST"
        );
        assert!(!ok(
            &[("origin", "https://appleid.apple.com.evil")],
            &Method::POST,
            APPLE_CALLBACK_PATH,
            true
        ));
        assert!(!ok(
            &[
                ("origin", "https://evil.example"),
                ("sec-fetch-site", "cross-site")
            ],
            &Method::POST,
            APPLE_CALLBACK_PATH,
            true
        ));
        assert!(!ok(
            &[("origin", APPLE_ORIGIN), ("sec-fetch-site", "same-site")],
            &Method::POST,
            APPLE_CALLBACK_PATH,
            true
        ));
        assert!(
            !ok(&[], &Method::POST, APPLE_CALLBACK_PATH, true),
            "no origin"
        );
    }
}
