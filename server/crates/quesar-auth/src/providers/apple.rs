//! Sign in with Apple: `@better-auth/core/.../social-providers/apple.mjs` and
//! `src/lib/auth/apple-secret.server.ts`.
//!
//! Apple's OAuth client secret is an ES256 JWT minted from the Services ID's
//! private key. [`client_secret`] ports `appleClientSecret` byte for byte
//! (header, payload, key order, `\n` escapes in the PEM, raw `r || s`
//! signature); [`AppleSecrets`] keeps the parsed key and re-mints the secret
//! when it is 30 days old, because a long-lived process can outlive Apple's
//! 180-day ceiling (the TypeScript mints once per process).
//!
//! The browser comes back by a cross-site form POST (`response_mode=form_post`)
//! that the server turns into a same-site GET (`routes/apple.rs`); this module
//! sees only what that POST delivered ([`crate::oauth::flow::Posted`]).

use std::fmt;
use std::sync::{Mutex, PoisonError};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use p256::ecdsa::signature::Signer;
use p256::ecdsa::{Signature, SigningKey};
use p256::pkcs8::DecodePrivateKey;
use serde::{Deserialize, Serialize};
use time::{Duration, OffsetDateTime};
use url::Url;

use crate::config::{AppleConfig, ClientSecret};
use crate::oauth::http::{self, HttpError};
use crate::oauth::id_token::{self, Expect, KeySource};
use crate::oauth::provider::{Identity, ProviderError, ProviderId};
use crate::providers::Deps;

/// The `iss` of Apple's ID tokens and the `aud` of the client secret.
pub const ISSUER: &str = "https://appleid.apple.com";
/// 180 days, just under Apple's 15777000-second ceiling.
pub const SECRET_TTL_SECS: i64 = 180 * 24 * 60 * 60;
/// A minted secret is replaced once it is this old.
pub const REMINT_AFTER: Duration = Duration::days(30);

/// Why no client secret could be minted. Carries no key material.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecretError {
    /// The private key is not a PKCS#8 P-256 key.
    BadKey,
}

impl fmt::Display for SecretError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("the Apple private key cannot be used")
    }
}

impl std::error::Error for SecretError {}

#[derive(Serialize)]
struct Header<'a> {
    alg: &'static str,
    kid: &'a str,
}

/// Field order is the order of `appleClientSecret`'s object literal.
#[derive(Serialize)]
struct Payload<'a> {
    iss: &'a str,
    iat: i64,
    exp: i64,
    aud: &'static str,
    sub: &'a str,
}

fn parse_key(pem: &str) -> Result<SigningKey, SecretError> {
    // Environment variables carry the PEM with literal `\n` escapes.
    let pem = if pem.contains("\\n") {
        pem.replace("\\n", "\n")
    } else {
        pem.to_owned()
    };
    SigningKey::from_pkcs8_pem(pem.trim()).map_err(|_| SecretError::BadKey)
}

fn sign(config: &AppleConfig, key: &SigningKey, now_s: i64) -> ClientSecret {
    let header = Header {
        alg: "ES256",
        kid: &config.key_id,
    };
    let payload = Payload {
        iss: &config.team_id,
        iat: now_s,
        exp: now_s.saturating_add(SECRET_TTL_SECS),
        aud: ISSUER,
        sub: &config.client_id,
    };
    // Structs of strings and integers always serialize.
    let encode = |bytes: Vec<u8>| URL_SAFE_NO_PAD.encode(bytes);
    let signing_input = format!(
        "{}.{}",
        encode(serde_json::to_vec(&header).unwrap_or_default()),
        encode(serde_json::to_vec(&payload).unwrap_or_default()),
    );
    // JOSE wants the raw r || s signature, not DER.
    let signature: Signature = key.sign(signing_input.as_bytes());
    ClientSecret::new(format!(
        "{signing_input}.{}",
        URL_SAFE_NO_PAD.encode(signature.to_bytes())
    ))
}

/// Mints the client secret for `config` as of `now_s` (Unix seconds).
pub fn client_secret(config: &AppleConfig, now_s: i64) -> Result<ClientSecret, SecretError> {
    let key = parse_key(config.private_key.expose())?;
    Ok(sign(config, &key, now_s))
}

struct Minted {
    secret: ClientSecret,
    at: OffsetDateTime,
}

/// The parsed private key and the current client secret. Built once at
/// startup; a malformed key means there is no `AppleSecrets` and Apple is off.
pub struct AppleSecrets {
    key: SigningKey,
    minted: Mutex<Minted>,
}

impl fmt::Debug for AppleSecrets {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("AppleSecrets([redacted])")
    }
}

impl AppleSecrets {
    /// Parses the key and mints the first secret.
    pub fn new(config: &AppleConfig, now: OffsetDateTime) -> Result<Self, SecretError> {
        let key = parse_key(config.private_key.expose())?;
        let secret = sign(config, &key, now.unix_timestamp());
        Ok(Self {
            key,
            minted: Mutex::new(Minted { secret, at: now }),
        })
    }

    /// The secret to send now: the minted one, or a fresh one when it is 30
    /// days old (or the clock went backwards past its `iat`).
    pub fn current(&self, config: &AppleConfig, now: OffsetDateTime) -> ClientSecret {
        let mut minted = self.minted.lock().unwrap_or_else(PoisonError::into_inner);
        let age = now - minted.at;
        if age >= REMINT_AFTER || age.is_negative() {
            minted.secret = sign(config, &self.key, now.unix_timestamp());
            minted.at = now;
        }
        minted.secret.clone()
    }
}

/// The URL to send the browser to. `response_mode=form_post` is what Apple
/// requires when the `name` and `email` scopes are asked for.
pub fn authorize_url(
    config: &AppleConfig,
    redirect_uri: &str,
    state: &str,
    challenge: &str,
    nonce: &str,
) -> Result<String, ProviderError> {
    let mut url = Url::parse(&config.endpoints.authorize).map_err(|_| HttpError::InvalidUrl)?;
    url.query_pairs_mut()
        .append_pair("response_type", "code id_token")
        .append_pair("client_id", &config.client_id)
        .append_pair("state", state)
        .append_pair("scope", "email name")
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("nonce", nonce)
        .append_pair("response_mode", "form_post")
        .append_pair("code_challenge_method", "S256")
        .append_pair("code_challenge", challenge);
    Ok(url.into())
}

/// The first-sign-in `user` field Apple posts: `{"name": {"firstName", "lastName"}}`.
#[derive(Deserialize)]
struct PostedUser {
    name: Option<PostedName>,
}

#[derive(Deserialize)]
struct PostedName {
    #[serde(rename = "firstName")]
    first: Option<String>,
    #[serde(rename = "lastName")]
    last: Option<String>,
}

/// The display name in Apple's `user` field: `firstName` and `lastName`
/// joined by a space and trimmed. `None` for anything else (not JSON, no
/// `name`, nothing left after trimming); the token's own `name` applies then.
pub fn posted_name(user: &str) -> Option<String> {
    let user: PostedUser = serde_json::from_str(user).ok()?;
    let name = user.name?;
    let joined = format!(
        "{} {}",
        name.first.unwrap_or_default(),
        name.last.unwrap_or_default()
    );
    let joined = joined.trim();
    (!joined.is_empty()).then(|| joined.to_owned())
}

#[derive(Deserialize)]
struct TokenResponse {
    id_token: Option<String>,
}

/// Exchanges `code`, verifies the ID token and returns who signed in.
///
/// `posted_name` is the name from the `user` field, which Apple sends only on
/// a person's first authorization; it wins over the token's `name`.
#[allow(clippy::too_many_arguments)]
pub async fn exchange(
    deps: &Deps<'_>,
    config: &AppleConfig,
    secret: &ClientSecret,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
    nonce: &str,
    posted_name: Option<&str>,
    now: OffsetDateTime,
) -> Result<Identity, ProviderError> {
    let response: TokenResponse = http::post_form(
        deps.http,
        &config.endpoints.token,
        &[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("code_verifier", verifier),
            ("redirect_uri", redirect_uri),
            ("client_id", &config.client_id),
            ("client_secret", secret.expose()),
        ],
        deps.allow_http,
    )
    .await?;
    let token = zeroize::Zeroizing::new(response.id_token.ok_or(ProviderError::NoIdToken)?);
    let jwks_url = config
        .endpoints
        .jwks
        .as_deref()
        .ok_or(HttpError::InvalidUrl)?;
    let claims = id_token::verify(
        &token,
        &Expect {
            issuers: &[ISSUER],
            audience: &config.client_id,
            nonce: Some(nonce),
            // `nonceComparison: "exact-or-sha256"` and a string `email_verified`.
            nonce_sha256: true,
            email_verified_text: true,
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
        provider: ProviderId::Apple,
        subject: claims.subject,
        email: claims.email,
        email_verified: claims.email_verified,
        name: posted_name.map(str::to_owned).or(claims.name),
        image: claims.picture,
    })
}
