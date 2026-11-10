//! The router is complete against the API reference: every route exists with
//! its method, a wrong method is a JSON 405, and every state-changing route
//! but the Apple form POST refuses a cross-site request.

mod apple_support;
mod common;

use apple_support::Apple;
use axum::body::Body;
use axum::http::header::{ALLOW, CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{Method, Request, StatusCode};
use common::{Harness, ORIGIN, Reply};

/// `(method, path below /api/auth)` for every route in the API reference.
/// Provider segments use `google`; the callback also takes `GET`.
const ROUTES: &[(&str, &str)] = &[
    ("GET", "/methods"),
    ("POST", "/sign-up"),
    ("POST", "/sign-in"),
    ("POST", "/sign-out"),
    ("GET", "/session"),
    ("POST", "/profile"),
    ("GET", "/sessions"),
    ("POST", "/sessions/revoke"),
    ("POST", "/sessions/revoke-others"),
    ("POST", "/oauth/google/start"),
    ("POST", "/oauth/apple/start"),
    ("POST", "/oauth/twitter/start"),
    ("GET", "/callback/google"),
    ("GET", "/callback/twitter"),
    ("GET", "/callback/apple"),
    ("POST", "/callback/apple"),
    ("POST", "/passkey/register/options"),
    ("POST", "/passkey/register/verify"),
    ("POST", "/passkey/authenticate/options"),
    ("POST", "/passkey/authenticate/verify"),
    ("GET", "/passkeys"),
    ("POST", "/passkey/delete"),
    ("POST", "/delete-account"),
];

fn method(name: &str) -> Method {
    Method::from_bytes(name.as_bytes()).unwrap()
}

/// A request from a fresh client address, with `headers` on top.
async fn send(h: &Harness, verb: &Method, path: &str, headers: &[(&str, &str)]) -> Reply {
    let mut builder = Request::builder()
        .method(verb.clone())
        .uri(format!("/api/auth{path}"))
        .header("x-real-ip", h.fresh_ip());
    for (name, value) in headers {
        builder = builder.header(*name, *value);
    }
    h.send(builder.body(Body::empty()).unwrap()).await
}

fn assert_json_error(reply: &Reply, status: StatusCode, context: &str) {
    assert_eq!(reply.status, status, "{context}");
    assert_eq!(reply.headers[CONTENT_TYPE], "application/json", "{context}");
    assert_eq!(reply.headers[CACHE_CONTROL], "no-store", "{context}");
    assert_eq!(reply.json()["ok"], false, "{context}");
}

#[tokio::test]
async fn every_route_in_the_api_reference_exists_with_its_method() {
    let h = Harness::new().await;
    for (verb, path) in ROUTES {
        let reply = send(&h, &method(verb), path, &[("origin", ORIGIN)]).await;
        // Not the router's own 404 or 405; the handler answered (any other
        // status, including 400/401/404 PROVIDER_NOT_CONFIGURED, is its own).
        assert_ne!(
            reply.status,
            StatusCode::METHOD_NOT_ALLOWED,
            "{verb} {path}"
        );
        if reply.status == StatusCode::NOT_FOUND {
            assert_ne!(
                reply.json()["error"]["name"],
                "NotFoundError",
                "{verb} {path}"
            );
        }
    }
    h.finish().await;
}

#[tokio::test]
async fn a_wrong_method_is_a_json_405_naming_the_allowed_methods() {
    let h = Harness::new().await;
    for (verb, path) in ROUTES {
        let wrong = if *verb == "GET" { "PUT" } else { "GET" };
        // POST /callback/apple also takes GET, so use PUT there.
        let wrong = if path.starts_with("/callback/") {
            "PUT"
        } else {
            wrong
        };
        let reply = send(&h, &method(wrong), path, &[("origin", ORIGIN)]).await;
        let context = format!("{wrong} {path}");
        assert_json_error(&reply, StatusCode::METHOD_NOT_ALLOWED, &context);
        assert_eq!(
            reply.json()["error"]["code"],
            "METHOD_NOT_ALLOWED",
            "{context}"
        );
        assert!(reply.headers.contains_key(ALLOW), "{context}");
    }
    h.finish().await;
}

#[tokio::test]
async fn every_post_but_the_apple_form_post_refuses_a_cross_site_request() {
    let h = Harness::new().await;
    let cross_site: [&[(&str, &str)]; 2] = [
        &[("origin", "https://evil.example")],
        &[("sec-fetch-site", "cross-site"), ("sec-fetch-mode", "cors")],
    ];
    for (verb, path) in ROUTES.iter().filter(|(verb, _)| *verb != "GET") {
        if *path == "/callback/apple" {
            continue;
        }
        for headers in cross_site {
            let reply = send(&h, &method(verb), path, headers).await;
            let context = format!("{verb} {path} {headers:?}");
            assert_json_error(&reply, StatusCode::FORBIDDEN, &context);
            assert_eq!(
                reply.json()["error"]["code"],
                "CROSS_SITE_REQUEST",
                "{context}"
            );
        }
    }
    h.finish().await;
}

#[tokio::test]
async fn the_apple_form_post_is_the_one_cross_site_post_that_is_accepted() {
    let h = Apple::new().await;
    let started = h.start().await;
    let post = h.post_code(&started, None).await;
    assert_eq!(post.status, StatusCode::SEE_OTHER, "{}", post.text());
    h.cleanup().await;
}
