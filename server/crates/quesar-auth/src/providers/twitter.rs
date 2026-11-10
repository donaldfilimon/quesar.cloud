//! X (Twitter) sign-in: `@better-auth/core/.../social-providers/twitter.mjs`.
//!
//! OAuth 2.0 with PKCE and state, no nonce and no ID token. The scopes are
//! ported as they are, `users.email` included. The code is exchanged at the
//! token endpoint with HTTP Basic client authentication (RFC 6749 section
//! 2.3.1: id and secret form-urlencoded, then base64). Who signed in is read
//! with two calls to `users/me`, as Better Auth does: one for the profile
//! (`profile_image_url`), one for `confirmed_email`. The second may fail; the
//! sign-in then goes on with a placeholder address and an unverified email.
//!
//! X never links by email and never counts for the admin rule (see
//! `oauth::link`); that is decided by [`ProviderId::Twitter`], not here.

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use serde::Deserialize;
use url::Url;
use zeroize::Zeroizing;

use crate::config::OAuthClient;
use crate::oauth::http::{self, HttpError};
use crate::oauth::provider::{Identity, ProviderError, ProviderId};
use crate::providers::Deps;

/// The default scopes of `twitter.mjs`.
pub const SCOPES: &str = "users.read tweet.read offline.access users.email";

/// The domain of the address a user gets when X reports no confirmed email
/// (`createPlaceholderEmail`, RFC 6761 `.invalid`).
const PLACEHOLDER_DOMAIN: &str = "twitter.placeholder.invalid";

/// The URL to send the browser to.
pub fn authorize_url(
    client: &OAuthClient,
    redirect_uri: &str,
    state: &str,
    challenge: &str,
) -> Result<String, ProviderError> {
    let mut url = Url::parse(&client.endpoints.authorize).map_err(|_| HttpError::InvalidUrl)?;
    url.query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", &client.client_id)
        .append_pair("state", state)
        .append_pair("scope", SCOPES)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("code_challenge_method", "S256")
        .append_pair("code_challenge", challenge);
    Ok(url.into())
}

/// `Basic base64(form(id):form(secret))`.
fn basic_credentials(client: &OAuthClient) -> Zeroizing<String> {
    let form = |value: &str| url::form_urlencoded::byte_serialize(value.as_bytes()).collect();
    let id: String = form(&client.client_id);
    let secret: Zeroizing<String> = Zeroizing::new(form(client.client_secret.expose()));
    let payload = Zeroizing::new(format!("{id}:{}", secret.as_str()));
    Zeroizing::new(format!("Basic {}", STANDARD.encode(payload.as_bytes())))
}

/// The part of the token response sign-in uses. Neither token is stored
/// (Contradiction 8).
#[derive(Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
}

#[derive(Deserialize)]
struct Envelope<T> {
    data: Option<T>,
}

#[derive(Deserialize)]
struct Profile {
    id: Option<String>,
    name: Option<String>,
    profile_image_url: Option<String>,
}

#[derive(Deserialize)]
struct EmailData {
    confirmed_email: Option<String>,
}

/// `users/me` with one `user.fields` set.
fn userinfo_url(base: &str, fields: &str) -> Result<String, HttpError> {
    let mut url = Url::parse(base).map_err(|_| HttpError::InvalidUrl)?;
    url.set_query(None);
    url.query_pairs_mut().append_pair("user.fields", fields);
    Ok(url.into())
}

/// The placeholder address for X user `id`.
pub fn placeholder_email(id: &str) -> String {
    format!("{id}@{PLACEHOLDER_DOMAIN}")
}

/// An X id is a decimal string. Anything that could not sit before the `@` of
/// the placeholder address is not one (Better Auth throws on those too).
fn plausible_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

/// Exchanges `code`, reads the profile and the confirmed email, and returns
/// who signed in.
pub async fn exchange(
    deps: &Deps<'_>,
    client: &OAuthClient,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<Identity, ProviderError> {
    let authorization = basic_credentials(client);
    let response: TokenResponse = http::post_form_authorized(
        deps.http,
        &client.endpoints.token,
        &[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("code_verifier", verifier),
            ("redirect_uri", redirect_uri),
        ],
        Some(&authorization),
        deps.allow_http,
    )
    .await?;
    let token = Zeroizing::new(response.access_token.ok_or(HttpError::Malformed)?);
    let bearer = Zeroizing::new(format!("Bearer {}", token.as_str()));
    let base = client
        .endpoints
        .userinfo
        .as_deref()
        .ok_or(HttpError::InvalidUrl)?;

    let profile: Envelope<Profile> = http::get_json_authorized(
        deps.http,
        &userinfo_url(base, "profile_image_url")?,
        Some(&bearer),
        deps.allow_http,
    )
    .await?;
    let profile = profile.data.ok_or(HttpError::Malformed)?;
    let id = profile
        .id
        .filter(|id| plausible_id(id))
        .ok_or(HttpError::Malformed)?;

    // A failed email call is tolerated: the profile alone signs in.
    let confirmed = http::get_json_authorized::<Envelope<EmailData>>(
        deps.http,
        &userinfo_url(base, "confirmed_email")?,
        Some(&bearer),
        deps.allow_http,
    )
    .await
    .ok()
    .and_then(|envelope| envelope.data)
    .and_then(|data| data.confirmed_email)
    .filter(|email| !email.trim().is_empty());

    let email_verified = confirmed.is_some();
    Ok(Identity {
        provider: ProviderId::Twitter,
        email: Some(confirmed.unwrap_or_else(|| placeholder_email(&id))),
        subject: id,
        email_verified,
        name: profile.name,
        image: profile.profile_image_url,
    })
}
