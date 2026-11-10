//! ID-token verification.
//!
//! The signature is checked with `jsonwebtoken` (RS256 only, the key chosen by
//! `kid` from the provider's JWKS); everything time-related is checked here
//! against the injected clock, with the 30 s tolerance of
//! `oauth2/verify-id-token.mjs`. Claims checked: `iss`, `aud`, `sub`, `exp`,
//! `iat` (not older than one hour: `maxTokenAge` of `google.mjs`) and `nonce`.

use std::fmt;

use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use time::OffsetDateTime;

use crate::oauth::jwks::{JwksCache, JwksError};

/// Clock skew allowed on `exp`, `nbf` and `iat` (seconds).
pub const CLOCK_TOLERANCE_SECS: f64 = 30.0;
/// How old an ID token may be (seconds).
pub const MAX_TOKEN_AGE_SECS: f64 = 3600.0;
/// A real ID token is a few KiB; refuse anything absurd before parsing.
const TOKEN_MAX_LEN: usize = 16 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdTokenError {
    /// Not a JWT, or a header or payload that does not parse (`alg: none`
    /// included).
    Malformed,
    /// A header `alg` other than RS256.
    Algorithm,
    /// No `kid` in the header.
    MissingKeyId,
    Jwks(JwksError),
    Signature,
    MissingClaim,
    Issuer,
    Audience,
    Expired,
    TooOld,
    /// `nbf` or `iat` in the future.
    NotYetValid,
    Nonce,
}

impl fmt::Display for IdTokenError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let text = match self {
            Self::Jwks(error) => return write!(f, "{error}"),
            Self::Malformed => "ID token is malformed",
            Self::Algorithm => "ID token algorithm is not RS256",
            Self::MissingKeyId => "ID token names no signing key",
            Self::Signature => "ID token signature is invalid",
            Self::MissingClaim => "ID token lacks a required claim",
            Self::Issuer => "ID token issuer is wrong",
            Self::Audience => "ID token audience is wrong",
            Self::Expired => "ID token has expired",
            Self::TooOld => "ID token is too old",
            Self::NotYetValid => "ID token is not valid yet",
            Self::Nonce => "ID token nonce does not match",
        };
        f.write_str(text)
    }
}

impl std::error::Error for IdTokenError {}

impl From<JwksError> for IdTokenError {
    fn from(error: JwksError) -> Self {
        Self::Jwks(error)
    }
}

/// `aud` is a string or a list of strings.
#[derive(Deserialize)]
#[serde(untagged)]
enum Audience {
    One(String),
    Many(Vec<String>),
}

impl Audience {
    fn contains(&self, wanted: &str) -> bool {
        match self {
            Self::One(one) => one == wanted,
            Self::Many(many) => many.iter().any(|aud| aud == wanted),
        }
    }
}

#[derive(Deserialize)]
struct RawClaims {
    iss: Option<String>,
    sub: Option<String>,
    aud: Option<Audience>,
    exp: Option<f64>,
    iat: Option<f64>,
    nbf: Option<f64>,
    nonce: Option<String>,
    email: Option<String>,
    email_verified: Option<Value>,
    name: Option<String>,
    picture: Option<String>,
}

/// The claims of a verified token that sign-in uses.
#[derive(Clone, PartialEq, Eq)]
pub struct Claims {
    pub subject: String,
    pub email: Option<String>,
    /// Only a JSON `true` is verified; the string `"true"` counts only when
    /// [`Expect::email_verified_text`] is set.
    pub email_verified: bool,
    pub name: Option<String>,
    pub picture: Option<String>,
}

impl fmt::Debug for Claims {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Claims").finish_non_exhaustive()
    }
}

/// What the token must say.
pub struct Expect<'a> {
    pub issuers: &'a [&'a str],
    pub audience: &'a str,
    /// The nonce sent on the authorization URL.
    pub nonce: Option<&'a str>,
    /// Also accept the lowercase hex SHA-256 of the nonce in the token
    /// (`nonceComparison: "exact-or-sha256"`, Apple).
    pub nonce_sha256: bool,
    /// Also accept the string `"true"` for `email_verified` (Apple).
    pub email_verified_text: bool,
}

/// Where the keys are and how to fetch them.
pub struct KeySource<'a> {
    pub cache: &'a JwksCache,
    pub http: &'a reqwest::Client,
    pub url: &'a str,
    pub allow_http: bool,
}

fn sha256_hex(value: &str) -> String {
    use std::fmt::Write;
    Sha256::digest(value.as_bytes())
        .iter()
        .fold(String::with_capacity(64), |mut hex, byte| {
            let _ = write!(hex, "{byte:02x}");
            hex
        })
}

fn unix_seconds(at: OffsetDateTime) -> f64 {
    at.unix_timestamp_nanos() as f64 / 1e9
}

/// Verifies `token`.
pub async fn verify(
    token: &str,
    expect: &Expect<'_>,
    keys: &KeySource<'_>,
    now: OffsetDateTime,
) -> Result<Claims, IdTokenError> {
    if token.len() > TOKEN_MAX_LEN {
        return Err(IdTokenError::Malformed);
    }
    let header = jsonwebtoken::decode_header(token).map_err(|_| IdTokenError::Malformed)?;
    if header.alg != Algorithm::RS256 {
        return Err(IdTokenError::Algorithm);
    }
    let kid = header.kid.ok_or(IdTokenError::MissingKeyId)?;
    let jwk = keys
        .cache
        .key(keys.http, keys.url, &kid, now, keys.allow_http)
        .await?;
    let key =
        DecodingKey::from_rsa_components(&jwk.n, &jwk.e).map_err(|_| IdTokenError::Signature)?;

    // The library checks the signature and the algorithm only: it reads the
    // system clock, and time here comes from the injected one.
    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_exp = false;
    validation.validate_nbf = false;
    validation.validate_aud = false;
    validation.required_spec_claims.clear();
    let claims = jsonwebtoken::decode::<RawClaims>(token, &key, &validation)
        .map_err(|error| match error.kind() {
            jsonwebtoken::errors::ErrorKind::InvalidSignature => IdTokenError::Signature,
            _ => IdTokenError::Malformed,
        })?
        .claims;

    let (Some(iss), Some(sub), Some(aud), Some(exp), Some(iat)) =
        (claims.iss, claims.sub, claims.aud, claims.exp, claims.iat)
    else {
        return Err(IdTokenError::MissingClaim);
    };
    if sub.is_empty() {
        return Err(IdTokenError::MissingClaim);
    }
    if !expect.issuers.contains(&iss.as_str()) {
        return Err(IdTokenError::Issuer);
    }
    if !aud.contains(expect.audience) {
        return Err(IdTokenError::Audience);
    }
    let now = unix_seconds(now);
    if let Some(nbf) = claims.nbf
        && nbf > now + CLOCK_TOLERANCE_SECS
    {
        return Err(IdTokenError::NotYetValid);
    }
    if exp <= now - CLOCK_TOLERANCE_SECS {
        return Err(IdTokenError::Expired);
    }
    let age = now - iat;
    if age - CLOCK_TOLERANCE_SECS > MAX_TOKEN_AGE_SECS {
        return Err(IdTokenError::TooOld);
    }
    if age < -CLOCK_TOLERANCE_SECS {
        return Err(IdTokenError::NotYetValid);
    }
    if let Some(expected) = expect.nonce {
        let equals =
            |claim: &str, wanted: &str| bool::from(claim.as_bytes().ct_eq(wanted.as_bytes()));
        let matches = claims.nonce.as_deref().is_some_and(|claim| {
            // Both comparisons always run, so which one matched is not a timing signal.
            let exact = equals(claim, expected);
            let hashed = expect.nonce_sha256 && equals(claim, &sha256_hex(expected));
            exact || hashed
        });
        if !matches {
            return Err(IdTokenError::Nonce);
        }
    }
    Ok(Claims {
        subject: sub,
        email: claims.email,
        email_verified: match &claims.email_verified {
            Some(Value::Bool(verified)) => *verified,
            Some(Value::String(text)) => expect.email_verified_text && text == "true",
            _ => false,
        },
        name: claims.name,
        picture: claims.picture,
    })
}
