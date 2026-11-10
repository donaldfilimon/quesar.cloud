//! A server whose Apple endpoints are an in-process mock identity provider,
//! over a throwaway migrated database and a settable clock. The Apple key is
//! the FAKE test key of `server/contract/apple-secret-vectors.json`. Needs
//! `mod common;` beside it in the test crate.
#![allow(dead_code)]

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::http::header::{LOCATION, SET_COOKIE};
use axum::http::{Method, Request};
use http_body_util::BodyExt;
use quesar_auth::FixedClock;
use quesar_auth::mock_idp::{MockIdp, Signing};
use quesar_db::test_support::TestDatabase;
use quesar_server::auth::AuthServices;
use quesar_server::config::Environment;
use quesar_server::{Config, router_with};
use serde_json::{Value, json};
use tower::ServiceExt;

use crate::common::{ORIGIN, Reply, T0, migrated};

pub const APPLE_ORIGIN: &str = "https://appleid.apple.com";
pub const BINDING_COOKIE: &str = "__Host-quesar.oauth_binding";
pub const CODE: &str = "synthetic-apple-code";
pub const SUB: &str = "apple-sub-0001";
pub const EMAIL: &str = "ada@example.com";
pub const FORM: &str = "application/x-www-form-urlencoded";

/// The fake key and ids of the contract vectors.
pub struct Key {
    pub client_id: String,
    pub team_id: String,
    pub key_id: String,
    pub pem: String,
}

pub fn key() -> Key {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../contract/apple-secret-vectors.json"
    );
    let file: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let text = |name: &str| file["key"][name].as_str().unwrap().to_owned();
    Key {
        client_id: text("client_id"),
        team_id: text("team_id"),
        key_id: text("key_id"),
        pem: text("private_key_pem"),
    }
}

pub struct Apple {
    pub app: Router,
    pub db: TestDatabase,
    pub clock: Arc<FixedClock>,
    pub idp: MockIdp,
    pub key: Key,
    ips: AtomicU64,
}

/// What the browser got from `start`.
pub struct Started {
    pub url: url::Url,
    pub state: String,
    pub nonce: String,
    /// `name=value` for a `Cookie` header.
    pub binding: String,
}

pub fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

/// `a=b&c=d` with every value percent-encoded.
pub fn form(fields: &[(&str, &str)]) -> String {
    url::form_urlencoded::Serializer::new(String::new())
        .extend_pairs(fields)
        .finish()
}

impl Apple {
    pub async fn new() -> Self {
        Self::build(None, &[]).await
    }

    /// Apple's private key given as this text instead of the fake PEM.
    pub async fn with_key(pem: &str) -> Self {
        Self::build(Some(pem), &[]).await
    }

    /// Extra environment pairs on top of the defaults.
    pub async fn with(extra: &[(&str, &str)]) -> Self {
        Self::build(None, extra).await
    }

    async fn build(pem: Option<&str>, extra: &[(&str, &str)]) -> Self {
        let db = migrated().await;
        let idp = MockIdp::start().await;
        let key = key();
        let pairs: Vec<(&str, &str)> = [
            ("PUBLIC_ORIGIN", ORIGIN),
            ("TRUSTED_PROXY", "x-real-ip"),
            ("APPLE_CLIENT_ID", key.client_id.as_str()),
            ("APPLE_TEAM_ID", key.team_id.as_str()),
            ("APPLE_KEY_ID", key.key_id.as_str()),
            ("APPLE_PRIVATE_KEY", pem.unwrap_or(key.pem.as_str())),
        ]
        .into_iter()
        .chain(extra.iter().copied())
        .collect();
        let config = Config::from_env(Environment::from_pairs(pairs)).unwrap();
        let clock = Arc::new(FixedClock::new(T0));
        let mut services = AuthServices::build(db.pool.clone(), &config, clock.clone()).unwrap();
        services.http = client();
        services.production = false;
        if let Some(apple) = services.config.providers.apple.as_mut() {
            apple.endpoints.token = idp.token_url();
            apple.endpoints.jwks = Some(idp.jwks_url());
        }
        if let Some(twitter) = services.config.providers.twitter.as_mut() {
            twitter.endpoints.token = idp.token_url();
            twitter.endpoints.userinfo = Some(idp.userinfo_url());
        }
        Self {
            app: router_with(&config, Some(services)),
            db,
            clock,
            idp,
            key,
            ips: AtomicU64::new(1),
        }
    }

    pub fn fresh_ip(&self) -> String {
        let n = self.ips.fetch_add(1, Ordering::SeqCst);
        format!("198.51.{}.{}", (n / 250) % 250, n % 250 + 1)
    }

    pub async fn send(&self, request: Request<Body>) -> Reply {
        let response = self.app.clone().oneshot(request).await.unwrap();
        let (parts, body) = response.into_parts();
        Reply {
            status: parts.status,
            headers: parts.headers,
            body: body.collect().await.unwrap().to_bytes().to_vec(),
        }
    }

    /// A same-origin JSON POST from the site.
    pub async fn post_json(&self, path: &str, body: &Value) -> Reply {
        let request = Request::builder()
            .method(Method::POST)
            .uri(format!("/api/auth{path}"))
            .header("content-type", "application/json")
            .header("origin", ORIGIN)
            .header("x-real-ip", self.fresh_ip())
            .body(Body::from(body.to_string()))
            .unwrap();
        self.send(request).await
    }

    /// `POST /oauth/apple/start`.
    pub async fn start(&self) -> Started {
        self.start_with(&json!({})).await
    }

    pub async fn start_with(&self, body: &Value) -> Started {
        let reply = self.post_json("/oauth/apple/start", body).await;
        assert_eq!(reply.status, 200, "{}", reply.text());
        let url = url::Url::parse(reply.result()["url"].as_str().unwrap()).unwrap();
        let pair = |name: &str| {
            url.query_pairs()
                .find(|(key, _)| key == name)
                .map(|(_, value)| value.into_owned())
                .unwrap_or_default()
        };
        let binding = reply
            .set_cookies()
            .into_iter()
            .find(|cookie| cookie.starts_with(BINDING_COOKIE))
            .expect("binding cookie")
            .split(';')
            .next()
            .unwrap()
            .to_owned();
        Started {
            state: pair("state"),
            nonce: pair("nonce"),
            binding,
            url,
        }
    }

    /// Apple's cross-site form POST: no cookies, Apple's `Origin`.
    pub async fn post_callback(&self, body: String) -> Reply {
        self.post_callback_with(body, &[]).await
    }

    /// As [`Self::post_callback`] with these headers added or replacing the defaults.
    pub async fn post_callback_with(&self, body: String, headers: &[(&str, &str)]) -> Reply {
        let has = |name: &str| headers.iter().any(|(n, _)| n.eq_ignore_ascii_case(name));
        let mut builder = Request::builder()
            .method(Method::POST)
            .uri("/api/auth/callback/apple");
        for (name, value) in [
            ("origin", APPLE_ORIGIN),
            ("sec-fetch-site", "cross-site"),
            ("content-type", FORM),
        ] {
            if !has(name) {
                builder = builder.header(name, value);
            }
        }
        if !has("x-real-ip") {
            builder = builder.header("x-real-ip", self.fresh_ip());
        }
        for (name, value) in headers {
            builder = builder.header(*name, *value);
        }
        self.send(builder.body(Body::from(body)).unwrap()).await
    }

    /// The POST Apple sends after consent.
    pub async fn post_code(&self, started: &Started, user: Option<&str>) -> Reply {
        let mut fields = vec![
            ("code", CODE),
            ("state", started.state.as_str()),
            ("id_token", "front-channel-id-token-is-never-used"),
        ];
        if let Some(user) = user {
            fields.push(("user", user));
        }
        self.post_callback(form(&fields)).await
    }

    /// The same-site GET the POST redirected to; `cookie` is the binding.
    pub async fn get_callback(&self, query: &str, cookie: Option<&str>) -> Reply {
        self.get_callback_on("apple", query, cookie).await
    }

    pub async fn get_callback_on(
        &self,
        provider: &str,
        query: &str,
        cookie: Option<&str>,
    ) -> Reply {
        let mut builder = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/auth/callback/{provider}?{query}"))
            .header("x-real-ip", self.fresh_ip())
            .header("sec-fetch-site", "cross-site")
            .header("sec-fetch-mode", "navigate")
            .header("sec-fetch-dest", "document");
        if let Some(cookie) = cookie {
            builder = builder.header("cookie", cookie);
        }
        self.send(builder.body(Body::empty()).unwrap()).await
    }

    /// Follows the POST's redirect with the binding cookie, as the browser does.
    pub async fn follow(&self, post: &Reply, started: &Started) -> Reply {
        let target = location(post);
        let query = target
            .strip_prefix("/api/auth/callback/apple?")
            .unwrap_or_else(|| panic!("the POST did not redirect to the GET callback: {target}"));
        self.get_callback(query, Some(&started.binding)).await
    }

    /// Claims of a good Apple ID token issued at the fake clock's "now".
    pub fn claims(&self, nonce: &str) -> Value {
        use quesar_auth::Clock;
        let now = self.clock.now().unix_timestamp();
        json!({
            "iss": APPLE_ORIGIN,
            "aud": self.key.client_id,
            "sub": SUB,
            "iat": now,
            "exp": now + 3600,
            "nonce": nonce,
            "email": EMAIL,
            "email_verified": "true",
        })
    }

    /// Makes the mock answer the next token request with a good token for `nonce`.
    pub fn issue(&self, nonce: &str) {
        self.idp
            .respond_with_id_token(&self.claims(nonce), Signing::Primary);
    }

    pub async fn count(&self, table: &str) -> i64 {
        sqlx::query_scalar(&format!("select count(*) from {table}"))
            .fetch_one(&self.db.pool)
            .await
            .unwrap()
    }

    pub async fn cleanup(self) {
        self.db.cleanup().await;
    }
}

pub fn location(reply: &Reply) -> String {
    reply
        .headers
        .get(LOCATION)
        .expect("a Location header")
        .to_str()
        .unwrap()
        .to_owned()
}

pub fn set_cookie_named(reply: &Reply, name: &str) -> Vec<String> {
    reply
        .headers
        .get_all(SET_COOKIE)
        .iter()
        .map(|value| value.to_str().unwrap().to_owned())
        .filter(|cookie| cookie.starts_with(&format!("{name}=")))
        .collect()
}
