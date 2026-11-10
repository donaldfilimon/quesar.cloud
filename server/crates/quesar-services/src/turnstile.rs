//! Cloudflare Turnstile configuration (`src/lib/server/turnstile.server.ts`:
//! `expectedHostnames`, `turnstileState`, `turnstileSiteKey`). Verification
//! itself is a separate module.

use std::collections::BTreeSet;
use std::fmt;

use zeroize::Zeroizing;

pub use crate::turnstile_verify::Verifier;

/// Cloudflare's siteverify endpoint. A field of [`TurnstileConfig`] with this
/// default and no environment override, so a test can point it at a mock.
pub const SITEVERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/// `TURNSTILE_SECRET`. Wiped on drop, never printed.
#[derive(Clone)]
pub struct Secret(Zeroizing<String>);

impl Secret {
    pub fn new(value: impl Into<String>) -> Self {
        Self(Zeroizing::new(value.into()))
    }

    /// The secret itself, for the one request that sends it to Cloudflare.
    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for Secret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Secret(<redacted>)")
    }
}

/// - `Off`: no site key or secret, so no challenge is shown or checked.
/// - `Ready`: key, secret and hostname allowlist all set.
/// - `Misconfigured`: key and secret set but no hostname allowlist; every
///   submission is refused rather than silently skipping the check.
///
/// The widget and the server both key off this one predicate, so the page
/// never hides the widget while the server demands a token.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TurnstileState {
    Off,
    Ready,
    Misconfigured,
}

#[derive(Clone)]
pub struct TurnstileConfig {
    site_key: Option<String>,
    secret: Option<Secret>,
    hostnames: BTreeSet<String>,
    /// Where tokens are verified.
    pub siteverify_url: String,
}

impl fmt::Debug for TurnstileConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TurnstileConfig")
            .field("state", &self.state())
            .field("hostnames", &self.hostnames)
            .field("siteverify_url", &self.siteverify_url)
            .finish_non_exhaustive()
    }
}

impl TurnstileConfig {
    /// Reads `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` and `TURNSTILE_HOSTNAMES`
    /// through `lookup`. As `env()` in `env.server.ts`, values are trimmed and a
    /// blank value is unset. `TURNSTILE_HOSTNAMES` is a comma-separated list,
    /// each entry trimmed and lowercased, blanks dropped.
    pub fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Self {
        let read = |name: &str| {
            lookup(name)
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        };
        let hostnames = read("TURNSTILE_HOSTNAMES")
            .unwrap_or_default()
            .split(',')
            .map(|hostname| hostname.trim().to_lowercase())
            .filter(|hostname| !hostname.is_empty())
            .collect();
        Self {
            site_key: read("TURNSTILE_SITE_KEY"),
            secret: read("TURNSTILE_SECRET").map(Secret::new),
            hostnames,
            siteverify_url: SITEVERIFY_URL.to_owned(),
        }
    }

    pub fn state(&self) -> TurnstileState {
        if self.site_key.is_none() || self.secret.is_none() {
            TurnstileState::Off
        } else if self.hostnames.is_empty() {
            TurnstileState::Misconfigured
        } else {
            TurnstileState::Ready
        }
    }

    /// The public site key, only when verification is fully configured.
    pub fn site_key(&self) -> Option<&str> {
        match self.state() {
            TurnstileState::Ready => self.site_key.as_deref(),
            _ => None,
        }
    }

    /// The secret, when one is configured (any state).
    pub fn secret(&self) -> Option<&Secret> {
        self.secret.as_ref()
    }

    /// The lowercased hostnames a token may have been issued for.
    pub fn hostnames(&self) -> &BTreeSet<String> {
        &self.hostnames
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(pairs: &[(&str, &str)]) -> TurnstileConfig {
        let pairs: Vec<(String, String)> = pairs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
            .collect();
        TurnstileConfig::from_lookup(move |name| {
            pairs
                .iter()
                .find(|(k, _)| k == name)
                .map(|(_, v)| v.clone())
        })
    }

    #[test]
    fn state_follows_the_three_way_predicate() {
        assert_eq!(config(&[]).state(), TurnstileState::Off);
        assert_eq!(
            config(&[
                ("TURNSTILE_SECRET", "s"),
                ("TURNSTILE_HOSTNAMES", "a.example")
            ])
            .state(),
            TurnstileState::Off,
            "no site key"
        );
        assert_eq!(
            config(&[
                ("TURNSTILE_SITE_KEY", "k"),
                ("TURNSTILE_HOSTNAMES", "a.example")
            ])
            .state(),
            TurnstileState::Off,
            "no secret"
        );
        let missing = config(&[("TURNSTILE_SITE_KEY", "k"), ("TURNSTILE_SECRET", "s")]);
        assert_eq!(missing.state(), TurnstileState::Misconfigured);
        assert_eq!(
            missing.site_key(),
            None,
            "no key exposed while misconfigured"
        );
        let ready = config(&[
            ("TURNSTILE_SITE_KEY", "k"),
            ("TURNSTILE_SECRET", "s"),
            ("TURNSTILE_HOSTNAMES", "a.example"),
        ]);
        assert_eq!(ready.state(), TurnstileState::Ready);
        assert_eq!(ready.site_key(), Some("k"));
        assert_eq!(ready.siteverify_url, SITEVERIFY_URL);
    }

    #[test]
    fn blank_values_are_unset_and_values_are_trimmed() {
        let blank = config(&[
            ("TURNSTILE_SITE_KEY", "  "),
            ("TURNSTILE_SECRET", "s"),
            ("TURNSTILE_HOSTNAMES", "a.example"),
        ]);
        assert_eq!(blank.state(), TurnstileState::Off);
        let padded = config(&[
            ("TURNSTILE_SITE_KEY", " k "),
            ("TURNSTILE_SECRET", " s "),
            ("TURNSTILE_HOSTNAMES", "a.example"),
        ]);
        assert_eq!(padded.site_key(), Some("k"));
        assert_eq!(padded.secret().map(Secret::expose), Some("s"));
    }

    #[test]
    fn hostnames_are_trimmed_lowercased_and_deduplicated() {
        let parsed = config(&[("TURNSTILE_HOSTNAMES", " Quesar.Cloud , ,")]);
        assert_eq!(
            parsed
                .hostnames()
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            ["quesar.cloud"]
        );
        let two = config(&[("TURNSTILE_HOSTNAMES", "B.example,a.example,A.EXAMPLE")]);
        assert_eq!(two.hostnames().len(), 2);
        assert!(
            config(&[("TURNSTILE_HOSTNAMES", " , ,")])
                .hostnames()
                .is_empty()
        );
    }

    #[test]
    fn debug_output_hides_the_secret() {
        let ready = config(&[
            ("TURNSTILE_SITE_KEY", "site-key-visible"),
            ("TURNSTILE_SECRET", "super-secret-value"),
            ("TURNSTILE_HOSTNAMES", "a.example"),
        ]);
        let text = format!("{ready:?} {:?}", ready.secret());
        assert!(!text.contains("super-secret-value"), "{text}");
        assert!(text.contains("redacted"));
    }
}
