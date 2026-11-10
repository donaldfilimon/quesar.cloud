//! Request checks, the error envelope, rate limiting and the no-database
//! behaviour of `/api/auth/*`. Tests that touch the database read
//! `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`); the rest use a lazy
//! pool that never connects.

use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::Router;
use axum::body::Body;
use axum::extract::{ConnectInfo, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE, COOKIE, ORIGIN, RETRY_AFTER};
use axum::http::{Method, Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get, post};
use http_body_util::BodyExt;
use quesar_auth::session::{self, COOKIE_NAME};
use quesar_auth::{Clock, FixedClock};
use quesar_db::test_support::TestDatabase;
use quesar_db::{PgPool, migrate};
use quesar_server::auth::error::ok;
use quesar_server::auth::extract::{
    AuthUser, ClientIp, FetchMetadata, MaybeUser, SameOrigin, SameOriginOrApple,
};
use quesar_server::auth::{ApiError, AuthServices, BuildError};
use quesar_server::config::Environment;
use quesar_server::{AppState, Config, router, router_with};
use quesar_services::rate_limit::Bucket;
use serde_json::{Value, json};
use time::OffsetDateTime;
use time::macros::datetime;
use tower::ServiceExt;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
const APPLE: [(&str, &str); 4] = [
    ("APPLE_CLIENT_ID", "svc"),
    ("APPLE_TEAM_ID", "team"),
    ("APPLE_KEY_ID", "key"),
    ("APPLE_PRIVATE_KEY", "pem"),
];

fn config(extra: &[(&str, &str)]) -> Config {
    let mut pairs = vec![("PUBLIC_ORIGIN", "https://quesar.cloud")];
    pairs.extend_from_slice(extra);
    Config::from_env(Environment::from_pairs(pairs)).unwrap()
}

fn lazy_pool() -> PgPool {
    PgPool::connect_lazy("postgres://unused@127.0.0.1:1/unused").unwrap()
}

fn services(pool: PgPool, config: &Config, clock: Arc<dyn Clock>) -> AuthServices {
    AuthServices::build(pool, config, clock).unwrap()
}

fn clock(at: OffsetDateTime) -> Arc<FixedClock> {
    Arc::new(FixedClock::new(at))
}

async fn limited(State(state): State<Arc<AppState>>, ip: ClientIp) -> Result<Response, ApiError> {
    let services = state.auth_services()?;
    services
        .limit(Bucket::AuthCredential, &ip.subject(services))
        .await?;
    Ok(ok("fine"))
}

async fn me(user: AuthUser) -> Response {
    ok(json!({ "id": user.user.id, "session": user.session.id, "reissue": user.reissue_cookie }))
}

async fn maybe(MaybeUser(user): MaybeUser) -> Response {
    ok(json!({ "id": user.map(|u| u.user.id) }))
}

/// A router whose routes use each extractor, over the real `AppState`.
fn probe(config: &Config, services: AuthServices) -> Router {
    let state = Arc::new(AppState::new(config, Some(services)));
    Router::new()
        .route("/same-origin", post(|_: SameOrigin| async { "ok" }))
        .route(
            "/api/auth/callback/apple",
            post(|_: SameOriginOrApple| async { "ok" }),
        )
        .route(
            "/api/auth/callback/google",
            post(|_: SameOriginOrApple| async { "ok" }),
        )
        .route("/fetch", any(|_: FetchMetadata| async { "ok" }))
        .route("/me", get(me))
        .route("/maybe", get(maybe))
        .route("/ip", get(|ip: ClientIp| async move { ip.0 }))
        .route("/limited", post(limited))
        .with_state(state)
}

async fn send(app: &Router, request: Request<Body>) -> Response {
    app.clone().oneshot(request).await.unwrap()
}

fn request(method: Method, path: &str, headers: &[(&str, &str)]) -> Request<Body> {
    let mut builder = Request::builder().method(method).uri(path);
    for (name, value) in headers {
        builder = builder.header(*name, *value);
    }
    builder.body(Body::empty()).unwrap()
}

async fn json_body(response: Response) -> Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

fn assert_error(body: &Value, name: &str, code: &str) {
    assert_eq!(body["ok"], false);
    assert_eq!(body["error"]["name"], name);
    assert_eq!(body["error"]["code"], code);
    assert!(body["error"]["message"].is_string());
}

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

async fn insert_user(pool: &PgPool, id: &str) {
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ($1, 'N', $2, false)"#,
    )
    .bind(id)
    .bind(format!("{id}@example.com"))
    .execute(pool)
    .await
    .unwrap();
}

async fn session_cookie(pool: &PgPool, user: &str, at: OffsetDateTime) -> String {
    let mut conn = pool.acquire().await.unwrap();
    let (_, token) = session::create(&mut conn, user, None, None, at)
        .await
        .unwrap();
    format!("{COOKIE_NAME}={}", token.expose())
}

// ---- the error envelope and the mount ----

#[tokio::test]
async fn an_unknown_auth_path_is_a_json_404() {
    let config = config(&[]);
    let app = router_with(&config, Some(services(lazy_pool(), &config, clock(T0))));
    for path in ["/api/auth/nope", "/api/auth/nope/deeper", "/api/auth"] {
        let response = send(&app, request(Method::GET, path, &[])).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
        assert_eq!(response.headers()[CONTENT_TYPE], "application/json");
        assert_eq!(response.headers()[CACHE_CONTROL], "no-store");
        assert_error(&json_body(response).await, "NotFoundError", "NOT_FOUND");
    }
}

#[tokio::test]
async fn without_a_database_every_auth_route_is_503() {
    let app = router(&config(&[]));
    for (method, path) in [
        (Method::GET, "/api/auth/nope"),
        (Method::POST, "/api/auth/sign-in/email"),
        (Method::GET, "/api/auth/callback/google?code=x&state=y"),
    ] {
        let response = send(&app, request(method, path, &[])).await;
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE, "{path}");
        assert_eq!(response.headers()[CACHE_CONTROL], "no-store");
        assert_error(
            &json_body(response).await,
            "AuthUnavailableError",
            "AUTH_UNAVAILABLE",
        );
    }
    // Other /api paths keep their own 404 envelope, now with a code.
    let response = send(&app, request(Method::GET, "/api/no-such", &[])).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_error(&json_body(response).await, "NotFoundError", "NOT_FOUND");
}

#[tokio::test]
async fn the_envelope_names_statuses_and_rounds_retry_after_up() {
    let cases = [
        (ApiError::Unauthorized, 401, "UnauthorizedError"),
        (ApiError::CrossSite, 403, "CrossSiteRequestError"),
        (ApiError::validation("BAD", "bad"), 400, "ValidationError"),
        (
            ApiError::auth(StatusCode::CONFLICT, "TAKEN", "taken"),
            409,
            "AuthError",
        ),
        (
            ApiError::RateLimited { retry_after_ms: 1 },
            429,
            "RateLimitedError",
        ),
        (ApiError::Unavailable, 503, "AuthUnavailableError"),
        (ApiError::NotFound, 404, "NotFoundError"),
    ];
    for (error, status, name) in cases {
        let response = error.into_response();
        assert_eq!(response.status().as_u16(), status, "{name}");
        assert_eq!(response.headers()[CACHE_CONTROL], "no-store", "{name}");
        assert_eq!(json_body(response).await["error"]["name"], name);
    }
    for (ms, seconds) in [(1, "1"), (1000, "1"), (1001, "2"), (7500, "8"), (0, "1")] {
        let response = ApiError::RateLimited { retry_after_ms: ms }.into_response();
        assert_eq!(response.headers()[RETRY_AFTER], seconds, "{ms} ms");
    }
    let unauthorized = json_body(ApiError::Unauthorized.into_response()).await;
    assert_eq!(unauthorized["error"]["message"], "Unauthorized");
    let cross = json_body(ApiError::CrossSite.into_response()).await;
    assert_eq!(
        cross["error"]["message"],
        "Forbidden: cross-site request blocked"
    );
    let success = ok(json!({ "a": 1 }));
    assert_eq!(success.headers()[CACHE_CONTROL], "no-store");
    assert_eq!(
        json_body(success).await,
        json!({ "ok": true, "result": { "a": 1 } })
    );
}

// ---- the request checks over HTTP ----

#[tokio::test]
async fn same_origin_and_fetch_metadata_refuse_with_the_403_envelope() {
    let config = config(&[]);
    let app = probe(&config, services(lazy_pool(), &config, clock(T0)));

    let good = send(
        &app,
        request(
            Method::POST,
            "/same-origin",
            &[("origin", "https://quesar.cloud")],
        ),
    )
    .await;
    assert_eq!(good.status(), StatusCode::OK);

    let evil = send(
        &app,
        request(
            Method::POST,
            "/same-origin",
            &[("host", "evil.example"), ("origin", "https://evil.example")],
        ),
    )
    .await;
    assert_eq!(evil.status(), StatusCode::FORBIDDEN);
    assert_eq!(evil.headers()[CACHE_CONTROL], "no-store");
    let body = json_body(evil).await;
    assert_error(&body, "CrossSiteRequestError", "CROSS_SITE_REQUEST");
    assert_eq!(
        body["error"]["message"],
        "Forbidden: cross-site request blocked"
    );

    let none = send(&app, request(Method::POST, "/same-origin", &[])).await;
    assert_eq!(none.status(), StatusCode::FORBIDDEN);

    let scripted = send(
        &app,
        request(Method::POST, "/fetch", &[("sec-fetch-site", "cross-site")]),
    )
    .await;
    assert_eq!(scripted.status(), StatusCode::FORBIDDEN);
    let direct = send(
        &app,
        request(Method::POST, "/fetch", &[("sec-fetch-site", "none")]),
    )
    .await;
    assert_eq!(direct.status(), StatusCode::OK);
}

#[tokio::test]
async fn the_apple_origin_is_accepted_on_the_apple_callback_only_and_only_with_apple() {
    let apple_post = |path: &str| {
        request(
            Method::POST,
            path,
            &[
                (ORIGIN.as_str(), "https://appleid.apple.com"),
                ("sec-fetch-site", "cross-site"),
            ],
        )
    };
    let with_apple = config(&APPLE);
    let app = probe(&with_apple, services(lazy_pool(), &with_apple, clock(T0)));
    assert_eq!(
        send(&app, apple_post("/api/auth/callback/apple"))
            .await
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        send(&app, apple_post("/api/auth/callback/google"))
            .await
            .status(),
        StatusCode::FORBIDDEN,
        "the exemption is for one route"
    );
    assert_eq!(
        send(&app, apple_post("/same-origin")).await.status(),
        StatusCode::FORBIDDEN,
        "plain SameOrigin never accepts Apple"
    );

    let without = config(&[]);
    let app = probe(&without, services(lazy_pool(), &without, clock(T0)));
    assert_eq!(
        send(&app, apple_post("/api/auth/callback/apple"))
            .await
            .status(),
        StatusCode::FORBIDDEN,
        "Apple is not configured"
    );
    // The ordinary rule still applies to the Apple route.
    let same = request(
        Method::POST,
        "/api/auth/callback/apple",
        &[("sec-fetch-site", "same-origin")],
    );
    assert_eq!(send(&app, same).await.status(), StatusCode::OK);
}

#[tokio::test]
async fn the_client_ip_follows_trusted_proxy_and_falls_back_to_the_peer() {
    let peer: SocketAddr = "198.51.100.7:4000".parse().unwrap();
    let ip = |app: Router, headers: &[(&str, &str)]| {
        let mut request = request(Method::GET, "/ip", headers);
        request.extensions_mut().insert(ConnectInfo(peer));
        async move {
            let response = app.oneshot(request).await.unwrap();
            let bytes = response.into_body().collect().await.unwrap().to_bytes();
            String::from_utf8(bytes.to_vec()).unwrap()
        }
    };
    let untrusting = config(&[]);
    let app = probe(&untrusting, services(lazy_pool(), &untrusting, clock(T0)));
    assert_eq!(
        ip(app, &[("cf-connecting-ip", "203.0.113.9")]).await,
        "198.51.100.7",
        "no header is trusted by default"
    );

    let cloudflare = config(&[("TRUSTED_PROXY", "cloudflare")]);
    let app = probe(&cloudflare, services(lazy_pool(), &cloudflare, clock(T0)));
    assert_eq!(
        ip(app.clone(), &[("cf-connecting-ip", "203.0.113.9")]).await,
        "203.0.113.9"
    );
    assert_eq!(
        ip(app.clone(), &[("cf-connecting-ip", "")]).await,
        "198.51.100.7",
        "an empty trusted header falls back to the peer"
    );
    assert_eq!(ip(app, &[]).await, "198.51.100.7");
}

// ---- the session extractors ----

#[tokio::test]
async fn auth_user_needs_a_live_session_and_a_same_site_request() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let clock = clock(T0);
    let config = config(&[]);
    let app = probe(&config, services(db.pool.clone(), &config, clock.clone()));
    let cookie = session_cookie(&db.pool, "u1", T0).await;

    let anonymous = send(&app, request(Method::GET, "/me", &[])).await;
    assert_eq!(anonymous.status(), StatusCode::UNAUTHORIZED);
    let body = json_body(anonymous).await;
    assert_error(&body, "UnauthorizedError", "UNAUTHORIZED");
    assert_eq!(body["error"]["message"], "Unauthorized");

    let bogus = format!("{COOKIE_NAME}=not-a-token");
    let response = send(
        &app,
        request(Method::GET, "/me", &[(COOKIE.as_str(), &bogus)]),
    )
    .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = send(
        &app,
        request(Method::GET, "/me", &[(COOKIE.as_str(), &cookie)]),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let result = json_body(response).await["result"].clone();
    assert_eq!(result["id"], "u1");
    assert_eq!(result["reissue"], Value::Null);

    // The fetch-metadata check runs before the lookup.
    let cross = send(
        &app,
        request(
            Method::GET,
            "/me",
            &[(COOKIE.as_str(), &cookie), ("sec-fetch-site", "cross-site")],
        ),
    )
    .await;
    assert_eq!(cross.status(), StatusCode::FORBIDDEN);

    // A day later the lookup extends the session and offers a fresh cookie.
    clock.advance(std::time::Duration::from_secs(25 * 3600));
    let response = send(
        &app,
        request(Method::GET, "/me", &[(COOKIE.as_str(), &cookie)]),
    )
    .await;
    let result = json_body(response).await["result"].clone();
    assert!(
        result["reissue"]
            .as_str()
            .is_some_and(|c| c.starts_with(COOKIE_NAME)),
        "{result}"
    );

    // Past the lifetime it is gone.
    clock.advance(std::time::Duration::from_secs(8 * 24 * 3600));
    let response = send(
        &app,
        request(Method::GET, "/me", &[(COOKIE.as_str(), &cookie)]),
    )
    .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    db.cleanup().await;
}

#[tokio::test]
async fn maybe_user_is_none_without_a_session() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let config = config(&[]);
    let app = probe(&config, services(db.pool.clone(), &config, clock(T0)));
    let cookie = session_cookie(&db.pool, "u1", T0).await;

    let response = send(&app, request(Method::GET, "/maybe", &[])).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(json_body(response).await["result"]["id"], Value::Null);
    let response = send(
        &app,
        request(Method::GET, "/maybe", &[(COOKIE.as_str(), &cookie)]),
    )
    .await;
    assert_eq!(json_body(response).await["result"]["id"], "u1");
    db.cleanup().await;
}

// ---- rate limits ----

#[tokio::test]
async fn limit_answers_429_with_retry_after_and_buckets_are_independent() {
    let db = migrated().await;
    // 2.5 s into a 10 s window: 7.5 s remain, rounded up to 8.
    let at = T0 + time::Duration::milliseconds(2500);
    let config = config(&[]);
    let services = services(db.pool.clone(), &config, clock(at));
    for _ in 0..3 {
        services
            .limit(Bucket::AuthCredential, "subject")
            .await
            .unwrap();
    }
    let refused = services
        .limit(Bucket::AuthCredential, "subject")
        .await
        .unwrap_err();
    assert_eq!(
        refused,
        ApiError::RateLimited {
            retry_after_ms: 7500
        }
    );
    // The `auth` bucket is spent; `auth-general` has not been touched.
    services
        .limit(Bucket::AuthGeneral, "subject")
        .await
        .unwrap();
    let counts: Vec<(String, i32)> =
        sqlx::query_as("select bucket, count from rate_limits order by bucket")
            .fetch_all(&db.pool)
            .await
            .unwrap();
    assert_eq!(
        counts,
        vec![("auth".to_owned(), 4), ("auth-general".to_owned(), 1)]
    );
    // Another subject is unaffected.
    services
        .limit(Bucket::AuthCredential, "other")
        .await
        .unwrap();
    db.cleanup().await;
}

#[tokio::test]
async fn a_limited_route_refuses_the_fourth_request_from_one_client() {
    let db = migrated().await;
    let at = T0 + time::Duration::milliseconds(2500);
    let config = config(&[]);
    let app = probe(&config, services(db.pool.clone(), &config, clock(at)));
    let peer: SocketAddr = "198.51.100.7:4000".parse().unwrap();
    let mut statuses = Vec::new();
    let mut last = None;
    for _ in 0..4 {
        let mut request = request(Method::POST, "/limited", &[]);
        request.extensions_mut().insert(ConnectInfo(peer));
        let response = send(&app, request).await;
        statuses.push(response.status().as_u16());
        last = Some(response);
    }
    assert_eq!(statuses, vec![200, 200, 200, 429]);
    let last = last.unwrap();
    assert_eq!(last.headers()[RETRY_AFTER], "8");
    assert_error(&json_body(last).await, "RateLimitedError", "RATE_LIMITED");
    // The stored subject is the keyed hash, not the address.
    let subjects: Vec<String> = sqlx::query_scalar("select subject from rate_limits")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(subjects.len(), 1);
    assert!(!subjects[0].contains("198.51.100.7"));
    db.cleanup().await;
}

#[tokio::test]
async fn production_refuses_to_build_without_a_rate_limit_secret() {
    let production = |extra: &[(&str, &str)]| {
        let mut pairs = vec![("QUESAR_ENV", "production")];
        pairs.extend_from_slice(extra);
        config(&pairs)
    };
    let without = production(&[]);
    let built = AuthServices::build(lazy_pool(), &without, clock(T0));
    assert!(matches!(built, Err(BuildError::RateLimitSecret(_))));
    let with = production(&[("APP_ENCRYPTION_KEY", "k".repeat(43).as_str())]);
    assert!(AuthServices::build(lazy_pool(), &with, clock(T0)).is_ok());
    // Outside production the public fallback is allowed.
    let development = config(&[]);
    assert!(AuthServices::build(lazy_pool(), &development, clock(T0)).is_ok());
}
