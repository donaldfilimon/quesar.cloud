//! Turnstile token verification (`src/lib/server/turnstile.server.ts`:
//! `verifyTurnstile`). Every failure is `false`, and a log line names only the
//! class of failure: never the token, the secret, the response body or the
//! transport error's text (it can carry the URL).

use std::time::Duration;

use serde_json::Value;

use crate::text::utf16_len;
use crate::turnstile::TurnstileConfig;

/// The longest siteverify answer read. Cloudflare's are a few hundred bytes.
const MAX_RESPONSE_BYTES: usize = 64 * 1024;
const TIMEOUT: Duration = Duration::from_secs(10);
const MIN_TOKEN_UNITS: usize = 10;
const MAX_TOKEN_UNITS: usize = 4096;

/// Why a verification failed. Logged by name, nothing else.
#[derive(Debug, Clone, Copy)]
enum Failure {
    Status,
    TooLarge,
    Unparsable,
    Timeout,
    Transport,
}

impl Failure {
    fn class(self) -> &'static str {
        match self {
            Self::Status => "non-success status",
            Self::TooLarge => "response too large",
            Self::Unparsable => "unparsable response",
            Self::Timeout => "timeout",
            Self::Transport => "connection failure",
        }
    }
}

/// Checks Turnstile tokens against `config.siteverify_url` over `http`. The
/// client must follow no redirects; a redirect answer is not a 2xx, so it is
/// refused either way.
#[derive(Debug, Clone, Copy)]
pub struct Verifier<'a> {
    http: &'a reqwest::Client,
    config: &'a TurnstileConfig,
}

impl<'a> Verifier<'a> {
    pub fn new(http: &'a reqwest::Client, config: &'a TurnstileConfig) -> Self {
        Self { http, config }
    }

    /// True only when Cloudflare says `success: true` for `expected_action` on
    /// one of the allowed hostnames. Without a secret, without hostnames, or
    /// with a token outside 10..=4096 UTF-16 units it is false without a call.
    pub async fn verify(
        &self,
        token: &str,
        expected_action: &str,
        remote_ip: Option<&str>,
    ) -> bool {
        let Some(secret) = self.config.secret() else {
            return false;
        };
        let units = utf16_len(token);
        if secret.expose().is_empty()
            || self.config.hostnames().is_empty()
            || !(MIN_TOKEN_UNITS..=MAX_TOKEN_UNITS).contains(&units)
        {
            return false;
        }

        let mut form = vec![("secret", secret.expose()), ("response", token)];
        if let Some(ip) = remote_ip {
            form.push(("remoteip", ip));
        }
        match self.fetch(&form).await {
            Ok(result) => {
                result.get("success") == Some(&Value::Bool(true))
                    && result.get("action").and_then(Value::as_str) == Some(expected_action)
                    && result
                        .get("hostname")
                        .and_then(Value::as_str)
                        .is_some_and(|hostname| {
                            self.config.hostnames().contains(&hostname.to_lowercase())
                        })
            }
            Err(failure) => {
                tracing::error!(
                    class = failure.class(),
                    "turnstile verification failed closed"
                );
                false
            }
        }
    }

    async fn fetch(&self, form: &[(&str, &str)]) -> Result<Value, Failure> {
        let mut response = self
            .http
            .post(&self.config.siteverify_url)
            .timeout(TIMEOUT)
            .form(form)
            .send()
            .await
            .map_err(classify)?;
        if !response.status().is_success() {
            return Err(Failure::Status);
        }
        // Count what actually arrives; Content-Length is not trusted.
        let mut body = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(classify)? {
            if body.len() + chunk.len() > MAX_RESPONSE_BYTES {
                return Err(Failure::TooLarge);
            }
            body.extend_from_slice(&chunk);
        }
        serde_json::from_slice(&body).map_err(|_| Failure::Unparsable)
    }
}

fn classify(error: reqwest::Error) -> Failure {
    if error.is_timeout() {
        Failure::Timeout
    } else {
        Failure::Transport
    }
}
