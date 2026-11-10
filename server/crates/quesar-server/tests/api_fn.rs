//! The `/api/fn` mount: the function router, the same-origin guard in front of
//! it, the JSON fallbacks, bounded bodies and the shared error envelope.

mod common;

use std::io::Write;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::header::{ALLOW, CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderMap, Method, Request, StatusCode};
use common::{Harness, NoDatabase, ORIGIN, Reply};
use quesar_contract::{ErrorBody, NoInput, ServerFunction};
use quesar_server::api::body::{self, FN_BODY_MAX};
use quesar_server::api::error::ok;
use quesar_server::api::{ApiError, FnRouter};
use quesar_server::auth::extract::AuthUser;
use serde_json::json;
use tracing_subscriber::fmt::MakeWriter;

/// Echoes its input.
struct Echo;

impl ServerFunction for Echo {
    const NAME: &'static str = "test.echo";
    type Input = ErrorBody;
    type Output = ErrorBody;
}

/// Answers the signed-in user's email.
struct WhoAmI;

impl ServerFunction for WhoAmI {
    const NAME: &'static str = "test.whoAmI";
    type Input = NoInput;
    type Output = String;
}

async fn echo(
    headers: HeaderMap,
    request_body: Body,
) -> Result<axum::response::Response, ApiError> {
    let input: ErrorBody = body::read(&headers, request_body, FN_BODY_MAX).await?;
    if input.name == "boom" {
        return Err(ApiError::internal(Echo::NAME, "store said SECRET-CAUSE"));
    }
    Ok(ok(input))
}

async fn who_am_i(user: AuthUser) -> axum::response::Response {
    ok(user.user.email)
}

fn functions() -> FnRouter {
    FnRouter::new()
        .function::<Echo, _, _>(echo)
        .function::<WhoAmI, _, _>(who_am_i)
}

fn no_database() -> NoDatabase {
    NoDatabase::new(&[], functions(), |_| {})
}

fn assert_error(reply: &Reply, status: StatusCode, name: &str, code: &str, context: &str) {
    assert_eq!(reply.status, status, "{context}: {}", reply.text());
    assert_eq!(reply.headers[CONTENT_TYPE], "application/json", "{context}");
    let error = &reply.json()["error"];
    assert_eq!(reply.json()["ok"], false, "{context}");
    assert_eq!(error["name"], name, "{context}");
    assert_eq!(error["code"], code, "{context}");
    assert!(error["message"].as_str().is_some_and(|m| !m.is_empty()));
}

fn echo_body() -> String {
    json!({ "name": "n", "code": "c", "message": "m" }).to_string()
}

#[tokio::test]
async fn a_path_that_names_no_function_is_a_json_404() {
    let app = no_database();
    for path in [
        "/api/fn/nope",
        "/api/fn",
        "/api/fn/",
        "/api/fn/a/b",
        "/api/fn/%E0%A4%A",
        "/api/fn/test.echo/",
        "/api/fn/test.echo/x",
    ] {
        let reply = app.request(Method::POST, path, "{}", &[]).await;
        assert_error(
            &reply,
            StatusCode::NOT_FOUND,
            "NotFoundError",
            "UNKNOWN_FUNCTION",
            path,
        );
        assert_eq!(reply.json()["error"]["message"], "Unknown server function.");
    }
}

#[tokio::test]
async fn another_method_is_a_405_that_names_post() {
    let app = no_database();
    for method in [Method::GET, Method::PUT, Method::DELETE, Method::PATCH] {
        let context = format!("{method} test.echo");
        let reply = app.request(method, "/api/fn/test.echo", "", &[]).await;
        assert_error(
            &reply,
            StatusCode::METHOD_NOT_ALLOWED,
            "MethodNotAllowedError",
            "METHOD_NOT_ALLOWED",
            &context,
        );
        assert_eq!(reply.headers[ALLOW], "POST", "{context}");
    }
}

#[tokio::test]
async fn the_auth_router_answers_a_wrong_method_with_the_envelope_too() {
    let h = Harness::new().await;
    let reply = h.request(Method::GET, "/api/auth/sign-in", "", &[]).await;
    assert_error(
        &reply,
        StatusCode::METHOD_NOT_ALLOWED,
        "MethodNotAllowedError",
        "METHOD_NOT_ALLOWED",
        "GET /api/auth/sign-in",
    );
    assert_eq!(reply.headers[ALLOW], "POST");
    h.finish().await;
}

fn bare(method: Method, path: &str, headers: &[(&str, &str)]) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header("x-real-ip", "203.0.113.200");
    for (name, value) in headers {
        builder = builder.header(*name, *value);
    }
    builder.body(Body::from(echo_body())).unwrap()
}

#[tokio::test]
async fn a_request_with_no_origin_headers_is_403_on_every_path_and_method() {
    let app = no_database();
    for method in [Method::POST, Method::GET, Method::PUT, Method::DELETE] {
        for path in [
            "/api/fn/test.echo",
            "/api/fn/test.whoAmI",
            "/api/fn/nope",
            "/api/fn",
            "/api/fn/",
            "/api/fn/a/b",
            "/api/fn/%E0%A4%A",
        ] {
            let reply = app.send(bare(method.clone(), path, &[])).await;
            assert_error(
                &reply,
                StatusCode::FORBIDDEN,
                "CrossSiteRequestError",
                "CROSS_SITE_REQUEST",
                &format!("{method} {path}"),
            );
        }
    }
}

#[tokio::test]
async fn the_same_origin_table_holds_before_the_name_is_looked_up() {
    let app = no_database();
    type Pairs<'a> = &'a [(&'a str, &'a str)];
    let cases: &[(&str, Pairs, bool)] = &[
        (
            "site same-origin",
            &[("sec-fetch-site", "same-origin")],
            true,
        ),
        ("site same-site", &[("sec-fetch-site", "same-site")], false),
        (
            "site cross-site",
            &[("sec-fetch-site", "cross-site")],
            false,
        ),
        ("site none", &[("sec-fetch-site", "none")], false),
        ("site empty", &[("sec-fetch-site", "")], false),
        (
            "site same-origin beats a foreign origin",
            &[
                ("sec-fetch-site", "same-origin"),
                ("origin", "https://evil.example"),
            ],
            true,
        ),
        (
            "site cross-site beats a matching origin",
            &[("sec-fetch-site", "cross-site"), ("origin", ORIGIN)],
            false,
        ),
        ("origin equal", &[("origin", ORIGIN)], true),
        (
            "origin other port",
            &[("origin", "https://quesar.cloud:8443")],
            false,
        ),
        (
            "origin other scheme",
            &[("origin", "http://quesar.cloud")],
            false,
        ),
        (
            "origin trailing slash",
            &[("origin", "https://quesar.cloud/")],
            false,
        ),
        ("origin null", &[("origin", "null")], false),
        (
            "origin foreign",
            &[("origin", "https://evil.example")],
            false,
        ),
        (
            "origin foreign even when host agrees",
            &[("host", "evil.example"), ("origin", "https://evil.example")],
            false,
        ),
        (
            "origin foreign beats a good referer",
            &[
                ("origin", "https://evil.example"),
                ("referer", "https://quesar.cloud/x"),
            ],
            false,
        ),
        (
            "referer path",
            &[("referer", "https://quesar.cloud/x")],
            true,
        ),
        (
            "referer suffix host",
            &[("referer", "https://quesar.cloud.evil/")],
            false,
        ),
        ("host only", &[("host", "quesar.cloud")], false),
    ];
    for (name, headers, allowed) in cases {
        let known = app
            .send(bare(Method::POST, "/api/fn/test.echo", headers))
            .await;
        let unknown = app.send(bare(Method::POST, "/api/fn/nope", headers)).await;
        if *allowed {
            assert_eq!(known.status, StatusCode::OK, "{name}: {}", known.text());
            assert_eq!(unknown.status, StatusCode::NOT_FOUND, "{name}");
        } else {
            for reply in [&known, &unknown] {
                assert_error(
                    reply,
                    StatusCode::FORBIDDEN,
                    "CrossSiteRequestError",
                    "CROSS_SITE_REQUEST",
                    name,
                );
            }
        }
    }
}

#[tokio::test]
async fn without_a_database_public_functions_answer_and_per_user_ones_are_503() {
    let app = no_database();
    let echoed = app
        .request(Method::POST, "/api/fn/test.echo", &echo_body(), &[])
        .await;
    assert_eq!(echoed.status, StatusCode::OK);
    assert_eq!(
        echoed.json(),
        json!({ "ok": true, "result": { "name": "n", "code": "c", "message": "m" } })
    );
    let user = app
        .request(Method::POST, "/api/fn/test.whoAmI", "null", &[])
        .await;
    assert_error(
        &user,
        StatusCode::SERVICE_UNAVAILABLE,
        "AuthUnavailableError",
        "AUTH_UNAVAILABLE",
        "whoAmI",
    );
}

#[tokio::test]
async fn with_sign_in_switched_off_a_valid_cookie_is_401() {
    let h = Harness::with_functions(&[], functions()).await;
    let cookie = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    let signed_in = h
        .request(
            Method::POST,
            "/api/fn/test.whoAmI",
            "null",
            &[("cookie", &cookie)],
        )
        .await;
    assert_eq!(signed_in.status, StatusCode::OK, "{}", signed_in.text());
    assert_eq!(signed_in.result(), "ada@example.com");

    // The same database and cookie behind a server with sign-in switched off.
    let config = common::test_config(&[("VITE_AUTH_ENABLED", "false")]);
    let services =
        quesar_server::auth::AuthServices::build(h.db.pool.clone(), &config, h.clock.clone())
            .unwrap();
    let public = quesar_server::api::PublicServices::build(&config).unwrap();
    let off = quesar_server::router_with_functions(&config, Some(services), public, functions());
    let reply = common::full_request(
        Method::POST,
        "/api/fn/test.whoAmI",
        "null".to_owned(),
        h.fresh_ip(),
        &[("cookie", &cookie)],
    );
    let reply = {
        use tower::ServiceExt;
        off.oneshot(reply).await.unwrap()
    };
    assert_eq!(reply.status(), StatusCode::UNAUTHORIZED);
    h.finish().await;
}

#[tokio::test]
async fn a_bad_body_is_400_or_413_with_the_documented_codes() {
    let app = no_database();
    let malformed = app
        .request(Method::POST, "/api/fn/test.echo", "{not json", &[])
        .await;
    assert_error(
        &malformed,
        StatusCode::BAD_REQUEST,
        "ValidationError",
        "INVALID_BODY",
        "malformed",
    );
    let big = app
        .request(
            Method::POST,
            "/api/fn/test.echo",
            &" ".repeat(17 * 1024),
            &[],
        )
        .await;
    assert_error(
        &big,
        StatusCode::PAYLOAD_TOO_LARGE,
        "PayloadTooLargeError",
        "PAYLOAD_TOO_LARGE",
        "17 KiB",
    );
    let wrong_type = app
        .request(
            Method::POST,
            "/api/fn/test.echo",
            &json!({ "name": 5, "code": "c", "message": "m" }).to_string(),
            &[],
        )
        .await;
    assert_error(
        &wrong_type,
        StatusCode::BAD_REQUEST,
        "ValidationError",
        "INVALID_BODY",
        "wrong type",
    );
    // Exactly at the cap is accepted.
    let padded = json!({ "name": "n", "code": "c", "message": "m".repeat(FN_BODY_MAX - 40) });
    let at_cap = padded.to_string();
    assert!(at_cap.len() <= FN_BODY_MAX);
    let accepted = app
        .request(Method::POST, "/api/fn/test.echo", &at_cap, &[])
        .await;
    assert_eq!(accepted.status, StatusCode::OK);
}

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl Write for Captured {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl<'a> MakeWriter<'a> for Captured {
    type Writer = Captured;

    fn make_writer(&'a self) -> Self::Writer {
        self.clone()
    }
}

#[tokio::test]
async fn an_internal_error_logs_its_cause_and_never_sends_it() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::ERROR)
        .with_writer(captured.clone())
        .finish();
    let guard = tracing::subscriber::set_default(subscriber);

    let app = no_database();
    let body = json!({ "name": "boom", "code": "c", "message": "m" }).to_string();
    let reply = app
        .request(Method::POST, "/api/fn/test.echo", &body, &[])
        .await;
    drop(guard);

    assert_error(
        &reply,
        StatusCode::INTERNAL_SERVER_ERROR,
        "InternalError",
        "INTERNAL",
        "boom",
    );
    assert_eq!(reply.json()["error"]["message"], "Server function failed.");
    assert!(!reply.text().contains("SECRET-CAUSE"));
    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(log.contains("SECRET-CAUSE"), "{log}");
    assert!(log.contains("test.echo"), "{log}");
    assert!(log.contains("\"level\":\"ERROR\""), "{log}");
}

#[tokio::test]
async fn a_session_older_than_a_day_gets_exactly_one_set_cookie() {
    let h = Harness::with_functions(&[], functions()).await;
    let up = h.sign_up("ada@example.com").await;
    let cookie = up.session_cookie().unwrap();
    let call = || async {
        h.request(
            Method::POST,
            "/api/fn/test.whoAmI",
            "null",
            &[("cookie", cookie.as_str())],
        )
        .await
    };

    h.clock.advance(std::time::Duration::from_secs(20 * 3600));
    let young = call().await;
    assert_eq!(young.status, StatusCode::OK);
    assert!(young.set_cookies().is_empty());

    h.clock.advance(std::time::Duration::from_secs(7 * 3600));
    let old = call().await;
    assert_eq!(old.status, StatusCode::OK);
    assert_eq!(old.set_cookies().len(), 1, "{:?}", old.set_cookies());
    assert!(old.set_cookies()[0].starts_with(common::COOKIE_NAME));
    h.finish().await;
}

#[tokio::test]
async fn every_response_under_the_mount_is_no_store() {
    let app = no_database();
    let replies: Vec<Reply> = vec![
        app.request(Method::POST, "/api/fn/test.echo", &echo_body(), &[])
            .await,
        app.request(Method::POST, "/api/fn/test.echo", "{", &[])
            .await,
        app.request(Method::POST, "/api/fn/test.whoAmI", "null", &[])
            .await,
        app.request(Method::POST, "/api/fn/nope", "{}", &[]).await,
        app.request(Method::GET, "/api/fn/test.echo", "", &[]).await,
        app.send(bare(Method::POST, "/api/fn/test.echo", &[])).await,
        app.request(
            Method::POST,
            "/api/fn/test.echo",
            &"x".repeat(FN_BODY_MAX + 1),
            &[],
        )
        .await,
    ];
    let statuses: Vec<u16> = replies.iter().map(|r| r.status.as_u16()).collect();
    assert_eq!(statuses, [200, 400, 503, 404, 405, 403, 413]);
    for reply in &replies {
        assert_eq!(reply.headers[CACHE_CONTROL], "no-store", "{}", reply.text());
    }
}

#[tokio::test]
async fn a_malformed_provider_name_is_a_json_404_not_axum_text() {
    let h = Harness::new().await;
    let reply = h
        .request(Method::POST, "/api/auth/oauth/%FF/start", "{}", &[])
        .await;
    assert_error(
        &reply,
        StatusCode::NOT_FOUND,
        "NotFoundError",
        "NOT_FOUND",
        "oauth start",
    );
    let reply = h
        .request(Method::POST, "/api/auth/callback/%FF", "", &[])
        .await;
    assert_error(
        &reply,
        StatusCode::NOT_FOUND,
        "NotFoundError",
        "NOT_FOUND",
        "apple form post",
    );
    let callback = h
        .request(Method::GET, "/api/auth/callback/%FF", "", &[])
        .await;
    assert!(
        callback.status.is_redirection(),
        "{} {}",
        callback.status,
        callback.text()
    );
    h.finish().await;
}
