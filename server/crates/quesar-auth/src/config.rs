//! Auth configuration read from the environment, as `src/lib/auth/server.ts`
//! (origin, trusted origins, RP ID), `methods.server.ts` (provider
//! credentials) and `config.server.ts` (`adminEmails`) read it.
//!
//! [`AuthConfig::from_lookup`] takes a lookup function so tests supply a map.
//! Blank values read as unset, like `env()` in `src/lib/env.server.ts`.

use std::collections::HashSet;
use std::fmt;

use url::Url;
use zeroize::Zeroizing;

/// `LOCAL_DEV_ORIGINS` of `server.ts`.
pub const LOCAL_DEV_ORIGINS: [&str; 3] = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
];
/// The WebAuthn relying-party name (`server.ts:200`).
pub const RP_NAME: &str = "Quesar";
const DEV_RP_ID: &str = "localhost";

/// A client secret or private key: `Debug` is redacted and the text is wiped
/// on drop.
#[derive(Clone)]
pub struct ClientSecret(Zeroizing<String>);

impl ClientSecret {
    pub fn new(value: impl Into<String>) -> Self {
        Self(Zeroizing::new(value.into()))
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for ClientSecret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("[redacted]")
    }
}

/// Where a provider is called. Production URLs by default; tests replace the
/// fields with an in-process mock (there is no environment override).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderEndpoints {
    pub authorize: String,
    pub token: String,
    /// Signing keys for ID tokens; X issues none.
    pub jwks: Option<String>,
    /// Profile endpoint for providers without an ID token (X).
    pub userinfo: Option<String>,
}

impl ProviderEndpoints {
    pub fn google() -> Self {
        Self {
            authorize: "https://accounts.google.com/o/oauth2/v2/auth".into(),
            token: "https://oauth2.googleapis.com/token".into(),
            jwks: Some("https://www.googleapis.com/oauth2/v3/certs".into()),
            userinfo: None,
        }
    }

    pub fn apple() -> Self {
        Self {
            authorize: "https://appleid.apple.com/auth/authorize".into(),
            token: "https://appleid.apple.com/auth/token".into(),
            jwks: Some("https://appleid.apple.com/auth/keys".into()),
            userinfo: None,
        }
    }

    pub fn twitter() -> Self {
        Self {
            authorize: "https://x.com/i/oauth2/authorize".into(),
            token: "https://api.x.com/2/oauth2/token".into(),
            jwks: None,
            userinfo: Some(
                "https://api.x.com/2/users/me?user.fields=confirmed_email,profile_image_url".into(),
            ),
        }
    }
}

/// Google or X: a client id and secret.
#[derive(Debug, Clone)]
pub struct OAuthClient {
    pub client_id: String,
    pub client_secret: ClientSecret,
    pub endpoints: ProviderEndpoints,
}

/// Apple: the client secret is a JWT minted from these four values.
#[derive(Debug, Clone)]
pub struct AppleConfig {
    /// The Services ID.
    pub client_id: String,
    pub team_id: String,
    pub key_id: String,
    /// The `.p8` PEM.
    pub private_key: ClientSecret,
    pub endpoints: ProviderEndpoints,
}

/// A provider is `None` unless its credentials are complete.
#[derive(Debug, Clone, Default)]
pub struct Providers {
    pub google: Option<OAuthClient>,
    pub apple: Option<AppleConfig>,
    pub twitter: Option<OAuthClient>,
}

/// Lowercased `ADMIN_EMAILS` allowlist.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AdminEmails(HashSet<String>);

impl AdminEmails {
    pub fn parse(raw: &str) -> Self {
        Self(
            raw.split(|c: char| c.is_whitespace() || c == ',')
                .map(|email| email.trim().to_lowercase())
                .filter(|email| !email.is_empty())
                .collect(),
        )
    }

    /// Whether `email` is on the list, ignoring case.
    pub fn contains(&self, email: &str) -> bool {
        self.0.contains(&email.trim().to_lowercase())
    }

    /// The lowercased addresses, for [`crate::admin::decide_admin`].
    pub fn as_set(&self) -> &HashSet<String> {
        &self.0
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct AuthConfig {
    /// The configured public origin, if any and valid.
    pub public_origin: Option<String>,
    /// Origins accepted on credentialed requests.
    pub trusted_origins: Vec<String>,
    pub rp_id: String,
    pub rp_origins: Vec<String>,
    pub rp_name: String,
    pub providers: Providers,
    pub admin_emails: AdminEmails,
}

/// Reduces a configured URL to its origin; anything unparsable, non-http(s) or
/// without a host counts as unset (`server.ts:59-68`).
fn origin_of(raw: &str) -> Option<String> {
    let url = Url::parse(raw.trim_end_matches('/')).ok()?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return None;
    }
    Some(url.origin().ascii_serialization())
}

impl AuthConfig {
    pub fn from_lookup(lookup: impl Fn(&str) -> Option<String>, production: bool) -> Self {
        let get = |name: &str| {
            lookup(name)
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        };

        // `PUBLIC_ORIGIN`, else `BETTER_AUTH_URL`. A set but invalid value
        // counts as unset; it does not fall through to the other variable.
        let public_origin = get("PUBLIC_ORIGIN")
            .or_else(|| get("BETTER_AUTH_URL"))
            .and_then(|raw| origin_of(&raw));

        let dev_origins = || LOCAL_DEV_ORIGINS.iter().map(|origin| (*origin).to_owned());
        let mut trusted_origins: Vec<String> = public_origin.iter().cloned().collect();
        if !production {
            trusted_origins.extend(dev_origins());
        }

        let rp_id = public_origin
            .as_deref()
            .and_then(|origin| Url::parse(origin).ok())
            .and_then(|url| url.host_str().map(str::to_owned))
            .unwrap_or_else(|| DEV_RP_ID.to_owned());
        let rp_origins = match &public_origin {
            Some(origin) => vec![origin.clone()],
            None => dev_origins().collect(),
        };

        // Google's two variables fall back to the Drive connector's
        // independently (`methods.server.ts:25-27`).
        let google_id = get("GOOGLE_SIGNIN_CLIENT_ID").or_else(|| get("GOOGLE_OAUTH_CLIENT_ID"));
        let google_secret =
            get("GOOGLE_SIGNIN_CLIENT_SECRET").or_else(|| get("GOOGLE_OAUTH_CLIENT_SECRET"));
        let google = match (google_id, google_secret) {
            (Some(client_id), Some(secret)) => Some(OAuthClient {
                client_id,
                client_secret: ClientSecret::new(secret),
                endpoints: ProviderEndpoints::google(),
            }),
            _ => None,
        };

        let apple = match (
            get("APPLE_CLIENT_ID"),
            get("APPLE_TEAM_ID"),
            get("APPLE_KEY_ID"),
            get("APPLE_PRIVATE_KEY"),
        ) {
            (Some(client_id), Some(team_id), Some(key_id), Some(private_key)) => {
                Some(AppleConfig {
                    client_id,
                    team_id,
                    key_id,
                    private_key: ClientSecret::new(private_key),
                    endpoints: ProviderEndpoints::apple(),
                })
            }
            _ => None,
        };

        let twitter = match (get("TWITTER_CLIENT_ID"), get("TWITTER_CLIENT_SECRET")) {
            (Some(client_id), Some(secret)) => Some(OAuthClient {
                client_id,
                client_secret: ClientSecret::new(secret),
                endpoints: ProviderEndpoints::twitter(),
            }),
            _ => None,
        };

        Self {
            public_origin,
            trusted_origins,
            rp_id,
            rp_origins,
            rp_name: RP_NAME.to_owned(),
            providers: Providers {
                google,
                apple,
                twitter,
            },
            admin_emails: AdminEmails::parse(&get("ADMIN_EMAILS").unwrap_or_default()),
        }
    }
}
