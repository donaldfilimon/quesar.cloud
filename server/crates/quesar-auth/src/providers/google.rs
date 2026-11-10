//! Google sign-in: `@better-auth/core/.../social-providers/google.mjs`.
//!
//! The authorization URL asks for `email profile openid` with PKCE and a
//! nonce, `prompt=select_account` (`server.ts`) and
//! `include_granted_scopes=true`. The code is exchanged at the token endpoint
//! with the client secret in the body (`client_secret_post`) and the PKCE
//! verifier. The returned ID token is verified against Google's keys (the
//! TypeScript only decodes it; verifying is stricter) and the identity is read
//! from its claims.

use serde::Deserialize;
use time::OffsetDateTime;
use url::Url;
use zeroize::Zeroizing;

use crate::config::OAuthClient;
use crate::oauth::http::{self, HttpError};
use crate::oauth::id_token::{self, Expect, KeySource};
use crate::oauth::provider::{Identity, ProviderError, ProviderId};
use crate::providers::Deps;

/// The `iss` values Google uses (`google.mjs`).
pub const ISSUERS: [&str; 2] = ["https://accounts.google.com", "accounts.google.com"];

/// The URL to send the browser to.
pub fn authorize_url(
    client: &OAuthClient,
    redirect_uri: &str,
    state: &str,
    challenge: &str,
    nonce: &str,
) -> Result<String, ProviderError> {
    let mut url = Url::parse(&client.endpoints.authorize).map_err(|_| HttpError::InvalidUrl)?;
    url.query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", &client.client_id)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("scope", "email profile openid")
        .append_pair("state", state)
        .append_pair("code_challenge", challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("nonce", nonce)
        .append_pair("prompt", "select_account")
        .append_pair("include_granted_scopes", "true");
    Ok(url.into())
}

/// The part of the token response sign-in uses. Access and refresh tokens are
/// ignored and never stored (Contradiction 8).
#[derive(Deserialize)]
struct TokenResponse {
    id_token: Option<String>,
}

/// Exchanges `code`, verifies the ID token and returns who signed in.
pub async fn exchange(
    deps: &Deps<'_>,
    client: &OAuthClient,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
    nonce: &str,
    now: OffsetDateTime,
) -> Result<Identity, ProviderError> {
    let response: TokenResponse = http::post_form(
        deps.http,
        &client.endpoints.token,
        &[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("code_verifier", verifier),
            ("redirect_uri", redirect_uri),
            ("client_id", &client.client_id),
            ("client_secret", client.client_secret.expose()),
        ],
        deps.allow_http,
    )
    .await?;
    let token = Zeroizing::new(response.id_token.ok_or(ProviderError::NoIdToken)?);
    let jwks_url = client
        .endpoints
        .jwks
        .as_deref()
        .ok_or(HttpError::InvalidUrl)?;
    let claims = id_token::verify(
        &token,
        &Expect {
            issuers: &ISSUERS,
            audience: &client.client_id,
            nonce: Some(nonce),
            nonce_sha256: false,
            email_verified_text: false,
        },
        &KeySource {
            cache: deps.jwks,
            http: deps.http,
            url: jwks_url,
            allow_http: deps.allow_http,
        },
        now,
    )
    .await?;
    Ok(Identity {
        provider: ProviderId::Google,
        subject: claims.subject,
        email: claims.email,
        email_verified: claims.email_verified,
        name: claims.name,
        image: claims.picture,
    })
}
