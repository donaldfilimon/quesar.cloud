//! The server's HTTP behaviour, driven through the router without a socket.

use std::fs;
use std::path::Path;

use axum::body::Body;
use axum::http::header::{ALLOW, CACHE_CONTROL, CONTENT_RANGE, CONTENT_TYPE, LOCATION, RANGE};
use axum::http::{Method, Request, StatusCode};
use axum::response::Response;
use http_body_util::BodyExt;
use quesar_server::config::Environment;
use quesar_server::{Config, router};
use tempfile::TempDir;
use tower::ServiceExt;

fn write(root: &Path, relative: &str, contents: &str) {
    let path = root.join(relative);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, contents).unwrap();
}

/// A miniature export in the layout `scripts/publish-static.ts` produces.
fn site() -> TempDir {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    write(root, "index.html", "<h1>home</h1>");
    write(root, "docs/index.html", "<h1>docs</h1>");
    write(root, "docs/getting-started/index.html", "<h1>start</h1>");
    write(root, "404.html", "<h1>missing</h1>");
    write(root, "_next/static/chunks/app.js", "console.log(1)");
    write(root, "feed.xml", "<rss/>");
    write(root, "media/clip.bin", "0123456789");
    write(root, ".nojekyll", "");
    dir
}

fn config(site: &TempDir, extra: &[(&str, &str)]) -> Config {
    let mut pairs = vec![(
        "QUESAR_SITE_DIR".to_owned(),
        site.path().to_str().unwrap().to_owned(),
    )];
    pairs.extend(
        extra
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned())),
    );
    Config::from_env(Environment::from_pairs(pairs)).unwrap()
}

async fn send(config: &Config, request: Request<Body>) -> Response {
    router(config).oneshot(request).await.unwrap()
}

async fn get(config: &Config, path: &str) -> Response {
    send(config, Request::get(path).body(Body::empty()).unwrap()).await
}

async fn text(response: Response) -> String {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    String::from_utf8(bytes.to_vec()).unwrap()
}

fn header<'a>(response: &'a Response, name: &axum::http::HeaderName) -> &'a str {
    response.headers().get(name).unwrap().to_str().unwrap()
}

#[tokio::test]
async fn serves_pages_with_and_without_a_trailing_slash() {
    let site = site();
    let config = config(&site, &[]);
    for (path, body) in [
        ("/", "<h1>home</h1>"),
        ("/docs", "<h1>docs</h1>"),
        ("/docs/", "<h1>docs</h1>"),
        ("/docs/getting-started", "<h1>start</h1>"),
    ] {
        let response = get(&config, path).await;
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        assert!(header(&response, &CONTENT_TYPE).starts_with("text/html"));
        assert_eq!(header(&response, &CACHE_CONTROL), "no-cache");
        assert_eq!(text(response).await, body, "{path}");
    }
}

#[tokio::test]
async fn hashed_assets_are_immutable_and_other_files_are_short_lived() {
    let site = site();
    let config = config(&site, &[]);
    let asset = get(&config, "/_next/static/chunks/app.js").await;
    assert_eq!(asset.status(), StatusCode::OK);
    assert_eq!(
        header(&asset, &CACHE_CONTROL),
        "public, max-age=31536000, immutable"
    );
    let feed = get(&config, "/feed.xml").await;
    assert_eq!(header(&feed, &CACHE_CONTROL), "public, max-age=3600");
}

#[tokio::test]
async fn unknown_paths_get_the_exports_404_page_with_status_404() {
    let site = site();
    let config = config(&site, &[]);
    for path in [
        "/nope",
        "/docs/nope",
        "/_next/static/missing.js",
        "/.nojekyll",
    ] {
        let response = get(&config, path).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
        assert_eq!(header(&response, &CACHE_CONTROL), "no-cache");
        assert_eq!(text(response).await, "<h1>missing</h1>", "{path}");
    }
}

#[tokio::test]
async fn a_range_request_for_a_missing_file_is_still_a_whole_404() {
    let site = site();
    let config = config(&site, &[]);
    let request = Request::get("/media/gone.bin")
        .header(RANGE, "bytes=0-3")
        .body(Body::empty())
        .unwrap();
    let response = send(&config, request).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert_eq!(text(response).await, "<h1>missing</h1>");
}

#[tokio::test]
async fn traversal_never_leaves_the_site_directory() {
    let site = site();
    // A file beside the site directory that a traversal would reach.
    let secret = site.path().parent().unwrap().join("quesar-secret.txt");
    fs::write(&secret, "secret").unwrap();
    let config = config(&site, &[]);
    for path in [
        "/../quesar-secret.txt",
        "/%2e%2e/quesar-secret.txt",
        "/docs/..%2f..%2fquesar-secret.txt",
    ] {
        let response = get(&config, path).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{path}");
        assert_eq!(text(response).await, "<h1>missing</h1>", "{path}");
    }
    fs::remove_file(secret).unwrap();
}

#[tokio::test]
async fn media_supports_byte_ranges() {
    let site = site();
    let config = config(&site, &[]);
    let request = Request::get("/media/clip.bin")
        .header(RANGE, "bytes=2-5")
        .body(Body::empty())
        .unwrap();
    let response = send(&config, request).await;
    assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
    assert_eq!(header(&response, &CONTENT_RANGE), "bytes 2-5/10");
    assert_eq!(text(response).await, "2345");
}

#[tokio::test]
async fn head_returns_headers_without_a_body() {
    let site = site();
    let config = config(&site, &[]);
    let request = Request::head("/docs").body(Body::empty()).unwrap();
    let response = send(&config, request).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(text(response).await, "");
}

#[tokio::test]
async fn pages_refuse_methods_other_than_get_and_head() {
    let site = site();
    let config = config(&site, &[]);
    let request = Request::post("/docs").body(Body::empty()).unwrap();
    let response = send(&config, request).await;
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    assert_eq!(header(&response, &ALLOW), "GET, HEAD");
}

#[tokio::test]
async fn the_old_docs_intro_url_redirects_permanently() {
    let site = site();
    let config = config(&site, &[]);
    let response = get(&config, "/docs/intro").await;
    assert_eq!(response.status(), StatusCode::PERMANENT_REDIRECT);
    assert_eq!(header(&response, &LOCATION), "/docs/getting-started");
}

#[tokio::test]
async fn readiness_reports_ready_in_development() {
    let site = site();
    let config = config(&site, &[]);
    let response = get(&config, "/api/readiness").await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(header(&response, &CACHE_CONTROL), "no-store");
    let body: serde_json::Value = serde_json::from_str(&text(response).await).unwrap();
    assert_eq!(body["ready"], true);
    assert_eq!(body["optional"]["encryption"], "not_configured");
}

#[tokio::test]
async fn readiness_refuses_methods_other_than_get_and_head() {
    let site = site();
    let config = config(&site, &[]);
    let request = Request::post("/api/readiness").body(Body::empty()).unwrap();
    let response = send(&config, request).await;
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    let allow = header(&response, &ALLOW);
    assert!(allow.contains("GET") && allow.contains("HEAD"), "{allow}");
}

#[tokio::test]
async fn an_unready_production_server_refuses_everything_but_the_probe() {
    let site = site();
    let config = config(&site, &[("QUESAR_ENV", "production")]);
    for path in ["/", "/docs", "/api/readiness", "/api/fn/anything"] {
        let response = get(&config, path).await;
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE, "{path}");
        let body: serde_json::Value = serde_json::from_str(&text(response).await).unwrap();
        assert_eq!(
            body["reasons"],
            serde_json::json!(["database_unavailable", "auth_origin_invalid"]),
            "{path}"
        );
    }
}

#[tokio::test]
async fn a_configured_production_server_serves_the_site() {
    let site = site();
    let config = config(
        &site,
        &[
            ("QUESAR_ENV", "production"),
            ("DATABASE_URL", "postgres://quesar@127.0.0.1/quesar"),
            ("PUBLIC_ORIGIN", "https://quesar.cloud"),
        ],
    );
    assert_eq!(get(&config, "/").await.status(), StatusCode::OK);
    assert_eq!(
        get(&config, "/api/readiness").await.status(),
        StatusCode::OK
    );
}

#[tokio::test]
async fn unknown_api_paths_answer_in_json_for_every_method() {
    let site = site();
    let config = config(&site, &[]);
    for method in [Method::GET, Method::POST, Method::DELETE] {
        let request = Request::builder()
            .method(method.clone())
            .uri("/api/fn/console.sendChat")
            .body(Body::empty())
            .unwrap();
        let response = send(&config, request).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{method}");
        assert!(header(&response, &CONTENT_TYPE).starts_with("application/json"));
        let body: serde_json::Value = serde_json::from_str(&text(response).await).unwrap();
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"]["name"], "NotFoundError");
    }
}

const CSP: &str = "content-security-policy-report-only";
const REPORTING: &str = "reporting-endpoints";

#[tokio::test]
async fn pages_and_the_404_page_carry_the_csp_and_reporting_headers() {
    let site = site();
    let config = config(&site, &[]);
    for path in ["/", "/docs", "/docs/", "/nope"] {
        let response = get(&config, path).await;
        assert!(
            response.headers().contains_key(CSP) && response.headers().contains_key(REPORTING),
            "{path}"
        );
        assert_eq!(
            header_named(&response, REPORTING),
            r#"csp-endpoint="/api/csp-report""#
        );
    }
    assert_eq!(get(&config, "/nope").await.status(), StatusCode::NOT_FOUND);
}

fn header_named<'a>(response: &'a Response, name: &str) -> &'a str {
    response.headers().get(name).unwrap().to_str().unwrap()
}

#[tokio::test]
async fn development_and_production_pages_get_their_own_policy() {
    let site = site();
    let development = get(&config(&site, &[]), "/").await;
    let production = get(
        &config(
            &site,
            &[
                ("QUESAR_ENV", "production"),
                ("DATABASE_URL", "postgres://quesar@127.0.0.1/quesar"),
                ("PUBLIC_ORIGIN", "https://quesar.cloud"),
            ],
        ),
        "/",
    )
    .await;
    let development = header_named(&development, CSP);
    let production = header_named(&production, CSP);
    assert!(development.contains("'unsafe-eval'") && development.contains("ws: wss:"));
    assert!(!production.contains("'unsafe-eval'") && !production.contains("ws:"));
}

#[tokio::test]
async fn assets_media_the_feed_and_api_responses_carry_neither_header() {
    let site = site();
    let config = config(&site, &[]);
    for path in [
        "/_next/static/chunks/app.js",
        "/feed.xml",
        "/media/clip.bin",
        "/api/readiness",
        "/api/no-such-endpoint",
        "/api",
    ] {
        let response = get(&config, path).await;
        assert!(!response.headers().contains_key(CSP), "{path}");
        assert!(!response.headers().contains_key(REPORTING), "{path}");
    }
}
