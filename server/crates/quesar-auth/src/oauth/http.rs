//! Outbound calls to an identity provider.
//!
//! The caller passes the shared client (no redirects, 10 s timeout, so a 3xx
//! arrives here as a status and is refused). A response is read under a size
//! cap before it is parsed. In production the URL must be https; plain http is
//! for the in-process mock identity provider in tests and for development.
//! Errors carry no URL, body or credential.

use std::fmt;

use serde::de::DeserializeOwned;
use url::Url;
use zeroize::Zeroizing;

/// The most a provider response may hold (ruling 2).
pub const RESPONSE_CAP: usize = 64 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpError {
    /// The URL is not https and plain http is not allowed here.
    Insecure,
    /// Not a URL at all.
    InvalidUrl,
    /// The request failed or timed out.
    Network,
    /// The provider answered with this non-2xx status (a redirect included).
    Status(u16),
    /// More than [`RESPONSE_CAP`] bytes.
    TooLarge,
    /// A body that is not the expected JSON.
    Malformed,
}

impl fmt::Display for HttpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Insecure => f.write_str("provider endpoint is not https"),
            Self::InvalidUrl => f.write_str("provider endpoint is not a URL"),
            Self::Network => f.write_str("provider request failed"),
            Self::Status(status) => write!(f, "provider answered {status}"),
            Self::TooLarge => f.write_str("provider response is too large"),
            Self::Malformed => f.write_str("provider response is malformed"),
        }
    }
}

impl std::error::Error for HttpError {}

/// https always; http only when `allow_http`.
pub fn check_url(url: &str, allow_http: bool) -> Result<Url, HttpError> {
    let parsed = Url::parse(url).map_err(|_| HttpError::InvalidUrl)?;
    match parsed.scheme() {
        "https" => Ok(parsed),
        "http" if allow_http => Ok(parsed),
        _ => Err(HttpError::Insecure),
    }
}

/// The whole body, or `TooLarge` the moment it passes the cap.
async fn read_capped(mut response: reqwest::Response) -> Result<Vec<u8>, HttpError> {
    if response
        .content_length()
        .is_some_and(|length| length > RESPONSE_CAP as u64)
    {
        return Err(HttpError::TooLarge);
    }
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| HttpError::Network)? {
        if body.len() + chunk.len() > RESPONSE_CAP {
            return Err(HttpError::TooLarge);
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

async fn parse<T: DeserializeOwned>(response: reqwest::Response) -> Result<T, HttpError> {
    let status = response.status();
    if !status.is_success() {
        return Err(HttpError::Status(status.as_u16()));
    }
    let body = Zeroizing::new(read_capped(response).await?);
    serde_json::from_slice(&body).map_err(|_| HttpError::Malformed)
}

/// `GET url` and parse the JSON body.
pub async fn get_json<T: DeserializeOwned>(
    http: &reqwest::Client,
    url: &str,
    allow_http: bool,
) -> Result<T, HttpError> {
    get_json_authorized(http, url, None, allow_http).await
}

/// A secret `Authorization` header value: marked sensitive so the HTTP stack
/// never prints it.
fn sensitive(value: &str) -> Result<reqwest::header::HeaderValue, HttpError> {
    let mut value =
        reqwest::header::HeaderValue::from_str(value).map_err(|_| HttpError::InvalidUrl)?;
    value.set_sensitive(true);
    Ok(value)
}

/// `GET url` with an `Authorization` header value (a bearer token) and parse
/// the JSON body.
pub async fn get_json_authorized<T: DeserializeOwned>(
    http: &reqwest::Client,
    url: &str,
    authorization: Option<&str>,
    allow_http: bool,
) -> Result<T, HttpError> {
    let url = check_url(url, allow_http)?;
    let mut request = http.get(url).header("accept", "application/json");
    if let Some(authorization) = authorization {
        request = request.header(reqwest::header::AUTHORIZATION, sensitive(authorization)?);
    }
    let response = request.send().await.map_err(|_| HttpError::Network)?;
    parse(response).await
}

/// `POST url` with a form body and parse the JSON answer. The encoded body can
/// hold a client secret and a code, so our copy is wiped (the client's own
/// buffer is out of reach).
pub async fn post_form<T: DeserializeOwned>(
    http: &reqwest::Client,
    url: &str,
    fields: &[(&str, &str)],
    allow_http: bool,
) -> Result<T, HttpError> {
    post_form_authorized(http, url, fields, None, allow_http).await
}

/// As [`post_form`] with an `Authorization` header value (HTTP Basic client
/// authentication).
pub async fn post_form_authorized<T: DeserializeOwned>(
    http: &reqwest::Client,
    url: &str,
    fields: &[(&str, &str)],
    authorization: Option<&str>,
    allow_http: bool,
) -> Result<T, HttpError> {
    let url = check_url(url, allow_http)?;
    let body = Zeroizing::new(
        url::form_urlencoded::Serializer::new(String::new())
            .extend_pairs(fields)
            .finish(),
    );
    let mut request = http
        .post(url)
        .header("accept", "application/json")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(body.as_str().to_owned());
    if let Some(authorization) = authorization {
        request = request.header(reqwest::header::AUTHORIZATION, sensitive(authorization)?);
    }
    let response = request.send().await.map_err(|_| HttpError::Network)?;
    parse(response).await
}
