//! A server over a throwaway migrated database, a settable clock and a fast
//! counting password hasher, for the `/api/auth` endpoint tests.
#![allow(dead_code)]

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};

use axum::Router;
use axum::body::Body;
use axum::http::header::{CONTENT_TYPE, SET_COOKIE};
use axum::http::{HeaderMap, Method, Request, StatusCode};
use http_body_util::BodyExt;
use quesar_auth::FixedClock;
use quesar_auth::password::{HashError, Password, PasswordHasher, PhcString};
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use quesar_server::auth::{AuthServices, Hashing};
use quesar_server::config::Environment;
use quesar_server::{Config, router_with};
use serde_json::Value;
use time::OffsetDateTime;
use time::macros::datetime;
use tower::ServiceExt;

pub const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
pub const ORIGIN: &str = "https://quesar.cloud";
pub const COOKIE_NAME: &str = "__Host-quesar.session_token";
pub const PASSWORD: &str = "synthetic-password-2026";

/// Not a password hash: a quick reversible stand-in that counts its calls, so
/// tests can say how many verifications a request cost without paying for
/// Argon2 in a debug build.
#[derive(Default)]
pub struct Counting {
    pub hashes: AtomicUsize,
    pub verifies: AtomicUsize,
}

impl Counting {
    fn encode(password: &Password) -> String {
        let bytes: Vec<String> = password
            .expose()
            .bytes()
            .rev()
            .map(|b| format!("{b:02x}"))
            .collect();
        format!("fake${}", bytes.join(""))
    }

    pub fn reset(&self) {
        self.hashes.store(0, Ordering::SeqCst);
        self.verifies.store(0, Ordering::SeqCst);
    }

    pub fn verifies(&self) -> usize {
        self.verifies.load(Ordering::SeqCst)
    }

    pub fn hashes(&self) -> usize {
        self.hashes.load(Ordering::SeqCst)
    }
}

impl PasswordHasher for Counting {
    fn hash(&self, password: &Password) -> Result<PhcString, HashError> {
        self.hashes.fetch_add(1, Ordering::SeqCst);
        Ok(PhcString::new(Self::encode(password)))
    }

    fn verify(&self, password: &Password, hash: &PhcString) -> bool {
        self.verifies.fetch_add(1, Ordering::SeqCst);
        hash.as_str() == Self::encode(password)
    }
}

pub struct Reply {
    pub status: StatusCode,
    pub headers: HeaderMap,
    pub body: Vec<u8>,
}

impl Reply {
    pub fn json(&self) -> Value {
        serde_json::from_slice(&self.body).unwrap_or_else(|_| {
            panic!("not JSON: {}", String::from_utf8_lossy(&self.body));
        })
    }

    pub fn text(&self) -> String {
        String::from_utf8_lossy(&self.body).into_owned()
    }

    pub fn result(&self) -> Value {
        self.json()["result"].clone()
    }

    pub fn set_cookies(&self) -> Vec<String> {
        self.headers
            .get_all(SET_COOKIE)
            .iter()
            .map(|v| v.to_str().unwrap().to_owned())
            .collect()
    }

    /// The `name=value` pair of the single session `Set-Cookie`, for a `Cookie` header.
    pub fn session_cookie(&self) -> Option<String> {
        let cookies = self.set_cookies();
        let first = cookies.iter().find(|c| c.starts_with(COOKIE_NAME))?;
        Some(first.split(';').next()?.to_owned())
    }

    /// The token inside the session `Set-Cookie`.
    pub fn token(&self) -> Option<String> {
        let pair = self.session_cookie()?;
        Some(pair.split_once('=')?.1.to_owned())
    }

    pub fn error_code(&self) -> String {
        self.json()["error"]["code"].as_str().unwrap().to_owned()
    }
}

pub struct Harness {
    pub app: Router,
    pub db: TestDatabase,
    pub clock: Arc<FixedClock>,
    pub hasher: Arc<Counting>,
    ips: AtomicU64,
}

pub async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

impl Harness {
    pub async fn new() -> Self {
        Self::with(&[]).await
    }

    /// `extra` environment pairs on top of the test defaults. The test hasher
    /// stands in for Argon2.
    pub async fn with(extra: &[(&str, &str)]) -> Self {
        Self::build(extra, true).await
    }

    /// The production hasher (slow in a debug build: use sparingly).
    pub async fn with_argon2() -> Self {
        Self::build(&[], false).await
    }

    async fn build(extra: &[(&str, &str)], fake_hasher: bool) -> Self {
        let db = migrated().await;
        let mut pairs = vec![
            ("PUBLIC_ORIGIN", ORIGIN),
            // Each request names its own client address (see `fresh_ip`).
            ("TRUSTED_PROXY", "x-real-ip"),
        ];
        pairs.extend_from_slice(extra);
        let config = Config::from_env(Environment::from_pairs(pairs)).unwrap();
        let clock = Arc::new(FixedClock::new(T0));
        let mut services = AuthServices::build(db.pool.clone(), &config, clock.clone()).unwrap();
        let hasher = Arc::new(Counting::default());
        if fake_hasher {
            services.hashing = Hashing::new(hasher.clone(), 4).unwrap();
        }
        hasher.reset();
        Self {
            app: router_with(&config, Some(services)),
            db,
            clock,
            hasher,
            ips: AtomicU64::new(1),
        }
    }

    /// A client address nobody has used yet, so rate limits do not cross tests.
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

    /// A same-origin JSON POST from a fresh client address. `headers` override
    /// or add to the defaults (`origin`, `x-real-ip`, `content-type`).
    pub async fn post(&self, path: &str, body: &Value, headers: &[(&str, &str)]) -> Reply {
        self.post_raw(path, body.to_string(), headers).await
    }

    pub async fn post_raw(&self, path: &str, body: String, headers: &[(&str, &str)]) -> Reply {
        let mut builder = Request::builder()
            .method(Method::POST)
            .uri(format!("/api/auth{path}"));
        let has = |name: &str| headers.iter().any(|(n, _)| n.eq_ignore_ascii_case(name));
        if !has("origin") && !has("sec-fetch-site") {
            builder = builder.header("origin", ORIGIN);
        }
        if !has("x-real-ip") {
            builder = builder.header("x-real-ip", self.fresh_ip());
        }
        builder = builder.header(CONTENT_TYPE, "application/json");
        for (name, value) in headers {
            builder = builder.header(*name, *value);
        }
        self.send(builder.body(Body::from(body)).unwrap()).await
    }

    pub async fn get(&self, path: &str, cookie: Option<&str>) -> Reply {
        match cookie {
            Some(cookie) => self.get_with(path, &[("cookie", cookie)]).await,
            None => self.get_with(path, &[]).await,
        }
    }

    pub async fn get_with(&self, path: &str, headers: &[(&str, &str)]) -> Reply {
        let mut builder = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/auth{path}"));
        if !headers
            .iter()
            .any(|(n, _)| n.eq_ignore_ascii_case("x-real-ip"))
        {
            builder = builder.header("x-real-ip", self.fresh_ip());
        }
        for (name, value) in headers {
            builder = builder.header(*name, *value);
        }
        self.send(builder.body(Body::empty()).unwrap()).await
    }

    /// Signs up and returns the reply; the cookie pair is `reply.session_cookie()`.
    pub async fn sign_up(&self, email: &str) -> Reply {
        let reply = self
            .post(
                "/sign-up",
                &serde_json::json!({ "name": "Synthetic Signup", "email": email, "password": PASSWORD }),
                &[],
            )
            .await;
        assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
        reply
    }

    pub async fn sign_in(&self, email: &str, password: &str) -> Reply {
        self.post(
            "/sign-in",
            &serde_json::json!({ "email": email, "password": password }),
            &[],
        )
        .await
    }

    pub async fn session_count(&self) -> i64 {
        sqlx::query_scalar("select count(*) from auth_sessions")
            .fetch_one(&self.db.pool)
            .await
            .unwrap()
    }

    pub async fn finish(self) {
        self.db.cleanup().await;
    }
}
