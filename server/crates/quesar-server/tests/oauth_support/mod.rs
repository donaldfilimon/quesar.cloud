//! A server whose Google endpoints are an in-process mock identity provider,
//! over a throwaway migrated database and a settable clock. Needs
//! `mod common;` beside it in the test crate.
#![allow(dead_code)]

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::http::header::{LOCATION, SET_COOKIE};
use axum::http::{Method, Request, StatusCode};
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

pub const CLIENT_ID: &str = "synthetic-client.apps.example";
pub const CLIENT_SECRET: &str = "synthetic-google-client-secret";
pub const BINDING_COOKIE: &str = "__Host-quesar.oauth_binding";
pub const CODE: &str = "synthetic-authorization-code";
pub const SUB: &str = "google-sub-0001";
pub const EMAIL: &str = "ada@example.com";

pub struct OAuth {
    pub app: Router,
    pub db: TestDatabase,
    pub clock: Arc<FixedClock>,
    pub idp: MockIdp,
    ips: AtomicU64,
}

/// What the browser got from `start`.
pub struct Started {
    pub reply: Reply,
    pub url: url::Url,
    pub state: String,
    pub nonce: String,
    pub challenge: String,
    /// `name=value` for a `Cookie` header.
    pub binding: String,
}

impl Started {
    pub fn param(&self, name: &str) -> Option<String> {
        self.url
            .query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    }
}

pub fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

impl OAuth {
    pub async fn new() -> Self {
        Self::build(true, true).await
    }

    /// `production`: plain-http provider endpoints must be refused.
    pub async fn production() -> Self {
        Self::build(true, false).await
    }

    /// No Google credentials in the environment.
    pub async fn without_google() -> Self {
        Self::build(false, true).await
    }

    async fn build(google: bool, allow_http: bool) -> Self {
        let db = migrated().await;
        let idp = MockIdp::start().await;
        let mut pairs = vec![("PUBLIC_ORIGIN", ORIGIN), ("TRUSTED_PROXY", "x-real-ip")];
        if google {
            pairs.push(("GOOGLE_SIGNIN_CLIENT_ID", CLIENT_ID));
            pairs.push(("GOOGLE_SIGNIN_CLIENT_SECRET", CLIENT_SECRET));
        }
        let config = Config::from_env(Environment::from_pairs(pairs)).unwrap();
        let clock = Arc::new(FixedClock::new(T0));
        let mut services = AuthServices::build(db.pool.clone(), &config, clock.clone()).unwrap();
        services.http = client();
        services.production = !allow_http;
        if let Some(google) = services.config.providers.google.as_mut() {
            google.endpoints.token = idp.token_url();
            google.endpoints.jwks = Some(idp.jwks_url());
        }
        Self {
            app: router_with(&config, Some(services)),
            db,
            clock,
            idp,
            ips: AtomicU64::new(1),
        }
    }

    pub fn fresh_ip(&self) -> String {
        let n = self.ips.fetch_add(1, Ordering::SeqCst);
        format!("198.51.{}.{}", (n / 250) % 250, n % 250 + 1)
    }

    async fn send(&self, request: Request<Body>) -> Reply {
        let response = self.app.clone().oneshot(request).await.unwrap();
        let (parts, body) = response.into_parts();
        Reply {
            status: parts.status,
            headers: parts.headers,
            body: body.collect().await.unwrap().to_bytes().to_vec(),
        }
    }

    pub async fn post(&self, path: &str, body: &Value, headers: &[(&str, &str)]) -> Reply {
        let mut builder = Request::builder()
            .method(Method::POST)
            .uri(format!("/api/auth{path}"))
            .header("content-type", "application/json");
        let has = |name: &str| headers.iter().any(|(n, _)| n.eq_ignore_ascii_case(name));
        if !has("origin") && !has("sec-fetch-site") {
            builder = builder.header("origin", ORIGIN);
        }
        if !has("x-real-ip") {
            builder = builder.header("x-real-ip", self.fresh_ip());
        }
        for (name, value) in headers {
            builder = builder.header(*name, *value);
        }
        self.send(builder.body(Body::from(body.to_string())).unwrap())
            .await
    }

    /// `POST /oauth/google/start`.
    pub async fn start(&self, body: &Value) -> Started {
        let reply = self.post("/oauth/google/start", body, &[]).await;
        assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
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
            challenge: pair("code_challenge"),
            binding,
            url,
            reply,
        }
    }

    /// The browser comes back from the provider: a cross-site top-level GET.
    pub async fn callback(&self, query: &str, cookie: Option<&str>) -> Reply {
        self.callback_on("google", query, cookie).await
    }

    pub async fn callback_on(&self, provider: &str, query: &str, cookie: Option<&str>) -> Reply {
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

    /// The callback a normal sign-in ends with.
    pub async fn finish(&self, started: &Started) -> Reply {
        self.callback(
            &format!("code={CODE}&state={}", started.state),
            Some(&started.binding),
        )
        .await
    }

    pub async fn get_session(&self, cookie: &str) -> Reply {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/auth/session")
            .header("x-real-ip", self.fresh_ip())
            .header("cookie", cookie)
            .body(Body::empty())
            .unwrap();
        self.send(request).await
    }

    /// Claims of a good Google ID token issued at the fake clock's "now".
    pub fn claims(&self, nonce: &str) -> Value {
        use quesar_auth::Clock;
        let now = self.clock.now().unix_timestamp();
        json!({
            "iss": "https://accounts.google.com",
            "aud": CLIENT_ID,
            "sub": SUB,
            "iat": now,
            "exp": now + 3600,
            "nonce": nonce,
            "email": EMAIL,
            "email_verified": true,
            "name": "Ada Lovelace",
            "picture": "https://example.com/ada.png",
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

/// The session `Set-Cookie` pair of a reply, if any.
pub fn session_pair(reply: &Reply) -> Option<String> {
    reply.session_cookie()
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
