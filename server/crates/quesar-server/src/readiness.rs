//! Configuration readiness, ported from `src/lib/server/readiness.server.ts`.
//!
//! This reports the shape of the configuration only. It does not claim that
//! the database answers or that its schema is current.

use quesar_services::crypto::{self, KeyState};
use quesar_services::rate_limit::resolve_secret;
use serde::Serialize;
use url::Url;

use crate::config::Environment;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OptionalState {
    Configured,
    NotConfigured,
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionalReadiness {
    pub encryption: OptionalState,
    pub previous_encryption_key: OptionalState,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Readiness {
    pub ready: bool,
    pub reasons: Vec<&'static str>,
    pub optional: OptionalReadiness,
}

fn valid_database(raw: Option<&str>) -> bool {
    let Some(Ok(url)) = raw.map(Url::parse) else {
        return false;
    };
    matches!(url.scheme(), "postgres" | "postgresql")
        && url.host_str().is_some_and(|host| !host.is_empty())
        && url.path().len() > 1
        && url.fragment().is_none()
}

/// A public HTTPS origin, without credentials, paths, query or fragments.
pub fn valid_public_origin(raw: Option<&str>) -> bool {
    let Some(Ok(url)) = raw.map(Url::parse) else {
        return false;
    };
    url.scheme() == "https"
        && url.host_str().is_some_and(|host| !host.is_empty())
        && url.username().is_empty()
        && url.password().is_none()
        && url.path() == "/"
        && url.query().is_none()
        && url.fragment().is_none()
}

impl From<KeyState> for OptionalState {
    fn from(state: KeyState) -> Self {
        match state {
            KeyState::Configured => Self::Configured,
            KeyState::NotConfigured => Self::NotConfigured,
            KeyState::Invalid => Self::Invalid,
        }
    }
}

/// The state of a sealing key, judged by the parser sealing itself uses.
fn key_state(raw: Option<&str>) -> OptionalState {
    crypto::key_state(raw).into()
}

/// `PUBLIC_ORIGIN`, or the Node server's `BETTER_AUTH_URL` until that name is retired.
pub fn public_origin(environment: &Environment) -> Option<&str> {
    environment
        .read("PUBLIC_ORIGIN")
        .or_else(|| environment.read("BETTER_AUTH_URL"))
}

pub fn runtime_readiness(environment: &Environment, production: bool) -> Readiness {
    let mut reasons = Vec::new();
    if production {
        if !valid_database(environment.read("DATABASE_URL")) {
            reasons.push("database_unavailable");
        }
        if !valid_public_origin(public_origin(environment)) {
            reasons.push("auth_origin_invalid");
        }
        // Client subjects are HMACed with this key; the public fallback would
        // leave them as unkeyed, brute-forceable hashes.
        let secret = resolve_secret(
            environment.read("APP_ENCRYPTION_KEY"),
            environment.read("BETTER_AUTH_SECRET"),
        );
        if secret.is_fallback() {
            reasons.push("rate_limit_secret_missing");
        }
    }
    Readiness {
        ready: reasons.is_empty(),
        reasons,
        optional: OptionalReadiness {
            encryption: key_state(environment.read("APP_ENCRYPTION_KEY")),
            previous_encryption_key: key_state(environment.read("APP_ENCRYPTION_KEY_PREVIOUS")),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> Environment {
        Environment::from_pairs(pairs.iter().copied())
    }

    #[test]
    fn development_is_ready_without_configuration() {
        let state = runtime_readiness(&Environment::default(), false);
        assert!(state.ready);
        assert!(state.reasons.is_empty());
        assert_eq!(state.optional.encryption, OptionalState::NotConfigured);
    }

    #[test]
    fn production_names_each_missing_requirement() {
        let state = runtime_readiness(&Environment::default(), true);
        assert!(!state.ready);
        assert_eq!(
            state.reasons,
            vec![
                "database_unavailable",
                "auth_origin_invalid",
                "rate_limit_secret_missing"
            ]
        );
    }

    #[test]
    fn production_is_ready_with_a_database_and_an_https_origin() {
        let state = runtime_readiness(
            &env(&[
                ("DATABASE_URL", "postgres://u:p@db.internal/quesar"),
                ("PUBLIC_ORIGIN", "https://quesar.cloud"),
                ("BETTER_AUTH_SECRET", "a-long-enough-test-secret"),
            ]),
            true,
        );
        assert!(state.ready, "{:?}", state.reasons);
    }

    #[test]
    fn production_needs_a_rate_limit_secret_but_either_name_will_do() {
        let base = [
            ("DATABASE_URL", "postgres://u:p@db.internal/quesar"),
            ("PUBLIC_ORIGIN", "https://quesar.cloud"),
        ];
        let reasons = |extra: &[(&str, &str)]| {
            let pairs: Vec<_> = base.iter().chain(extra).copied().collect();
            runtime_readiness(&env(&pairs), true).reasons
        };
        assert_eq!(reasons(&[]), vec!["rate_limit_secret_missing"]);
        assert_eq!(
            reasons(&[("APP_ENCRYPTION_KEY", "   ")]),
            vec!["rate_limit_secret_missing"]
        );
        assert!(reasons(&[("APP_ENCRYPTION_KEY", &"ab".repeat(32))]).is_empty());
        assert!(reasons(&[("BETTER_AUTH_SECRET", "s")]).is_empty());
        // Outside production the public fallback is still allowed.
        assert!(runtime_readiness(&Environment::default(), false).ready);
    }

    #[test]
    fn the_retired_origin_name_is_still_read() {
        let environment = env(&[("BETTER_AUTH_URL", "https://quesar.cloud")]);
        assert_eq!(public_origin(&environment), Some("https://quesar.cloud"));
    }

    #[test]
    fn database_urls_need_a_postgres_scheme_a_host_and_a_database() {
        assert!(valid_database(Some("postgresql://host/db")));
        assert!(!valid_database(Some("mysql://host/db")));
        assert!(!valid_database(Some("postgres://host/")));
        assert!(!valid_database(Some("postgres://host/db#frag")));
        assert!(!valid_database(Some("not a url")));
        assert!(!valid_database(None));
    }

    #[test]
    fn public_origins_are_bare_https_origins() {
        assert!(valid_public_origin(Some("https://quesar.cloud")));
        assert!(valid_public_origin(Some("https://quesar.cloud/")));
        assert!(!valid_public_origin(Some("http://quesar.cloud")));
        assert!(!valid_public_origin(Some("https://user@quesar.cloud")));
        assert!(!valid_public_origin(Some("https://quesar.cloud/app")));
        assert!(!valid_public_origin(Some("https://quesar.cloud/?q=1")));
        assert!(!valid_public_origin(None));
    }

    #[test]
    fn keys_are_32_bytes_in_hex_or_base64() {
        use base64::Engine;
        let hex = "ab".repeat(32);
        assert_eq!(key_state(Some(&hex)), OptionalState::Configured);
        // openssl rand -base64 32 style: 43 characters and one pad.
        let b64 = base64::engine::general_purpose::STANDARD.encode([7u8; 32]);
        assert_eq!(key_state(Some(&b64)), OptionalState::Configured);
        let url_safe = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode([255u8; 32]);
        assert_eq!(key_state(Some(&url_safe)), OptionalState::Configured);
        assert_eq!(key_state(Some("too-short")), OptionalState::Invalid);
        assert_eq!(key_state(Some("")), OptionalState::NotConfigured);
        assert_eq!(key_state(None), OptionalState::NotConfigured);
    }

    #[test]
    fn a_non_canonical_key_is_configured_as_sealing_accepts_it() {
        // The contract's key whose last character carries non-zero trailing
        // bits: Node and `crypto::parse_key` accept it, so readiness must too.
        let text = format!("{}AwN", "AwMD".repeat(10));
        assert_eq!(key_state(Some(&text)), OptionalState::Configured);
        let state = runtime_readiness(&env(&[("APP_ENCRYPTION_KEY", &text)]), false);
        assert_eq!(state.optional.encryption, OptionalState::Configured);
    }

    #[test]
    fn serialises_with_the_node_servers_field_names() {
        let json = serde_json::to_value(runtime_readiness(&Environment::default(), true)).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "ready": false,
                "reasons": [
                    "database_unavailable",
                    "auth_origin_invalid",
                    "rate_limit_secret_missing"
                ],
                "optional": {
                    "encryption": "not_configured",
                    "previousEncryptionKey": "not_configured"
                }
            })
        );
    }
}
