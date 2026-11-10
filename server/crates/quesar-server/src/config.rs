//! Runtime configuration, read once from the environment.
//!
//! The variable table lives in `AGENTS.md`. A blank value means unset, as in
//! the TypeScript server this replaces.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;

/// Where the server listens unless `QUESAR_LISTEN` says otherwise: loopback,
/// because a reverse proxy terminates TLS in front of it.
const DEFAULT_LISTEN: &str = "127.0.0.1:8787";
/// The export `bun run build:static` publishes, relative to the repo root.
const DEFAULT_SITE_DIR: &str = "docs";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigError {
    InvalidListen(String),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidListen(raw) => {
                write!(f, "QUESAR_LISTEN is not a socket address: {raw}")
            }
        }
    }
}

impl std::error::Error for ConfigError {}

/// The raw environment, trimmed: a blank or whitespace-only value reads as unset.
#[derive(Debug, Clone, Default)]
pub struct Environment(HashMap<String, String>);

impl Environment {
    pub fn from_process() -> Self {
        Self(std::env::vars().collect())
    }

    pub fn from_pairs<K: Into<String>, V: Into<String>>(
        pairs: impl IntoIterator<Item = (K, V)>,
    ) -> Self {
        Self(
            pairs
                .into_iter()
                .map(|(k, v)| (k.into(), v.into()))
                .collect(),
        )
    }

    pub fn read(&self, name: &str) -> Option<&str> {
        self.0
            .get(name)
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub listen: SocketAddr,
    /// The static export to serve.
    pub site_dir: PathBuf,
    /// `QUESAR_ENV=production`: readiness is enforced and traffic is refused
    /// until the configuration is sound.
    pub production: bool,
    pub environment: Environment,
}

impl Config {
    pub fn from_env(environment: Environment) -> Result<Self, ConfigError> {
        let raw_listen = environment.read("QUESAR_LISTEN").unwrap_or(DEFAULT_LISTEN);
        let listen = raw_listen
            .parse()
            .map_err(|_| ConfigError::InvalidListen(raw_listen.to_owned()))?;
        let site_dir = PathBuf::from(
            environment
                .read("QUESAR_SITE_DIR")
                .unwrap_or(DEFAULT_SITE_DIR),
        );
        let production = environment.read("QUESAR_ENV") == Some("production");
        Ok(Self {
            listen,
            site_dir,
            production,
            environment,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blank_values_read_as_unset() {
        let environment = Environment::from_pairs([("A", "  "), ("B", " value ")]);
        assert_eq!(environment.read("A"), None);
        assert_eq!(environment.read("B"), Some("value"));
        assert_eq!(environment.read("C"), None);
    }

    #[test]
    fn defaults_to_loopback_and_the_published_export() {
        let config = Config::from_env(Environment::default()).unwrap();
        assert_eq!(config.listen, "127.0.0.1:8787".parse().unwrap());
        assert_eq!(config.site_dir, PathBuf::from("docs"));
        assert!(!config.production);
    }

    #[test]
    fn rejects_a_listen_value_that_is_not_an_address() {
        let environment = Environment::from_pairs([("QUESAR_LISTEN", "localhost")]);
        assert_eq!(
            Config::from_env(environment).unwrap_err(),
            ConfigError::InvalidListen("localhost".into())
        );
    }
}
