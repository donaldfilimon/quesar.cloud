//! Completeness of the public routes: the function table equals the contract,
//! and every M3 route answers the same way with a database, without one, with
//! sign-in switched off, and is refused while a production server is not ready.

mod common;

use axum::http::{Method, StatusCode};
use common::{Harness, NoDatabase, Reply};
use serde_json::{Value, json};

/// One M3 route and what it answers to a same-origin request.
struct Route {
    path: String,
    body: Value,
    status: StatusCode,
}

fn routes() -> Vec<Route> {
    let function = |name: &str| format!("/api/fn/{name}");
    vec![
        Route {
            path: function("inquiries.sendInquiry"),
            // Every field missing counts as empty: a domain refusal inside a 200.
            body: json!({}),
            status: StatusCode::OK,
        },
        Route {
            path: function("inquiries.getTurnstileConfig"),
            body: Value::Null,
            status: StatusCode::OK,
        },
        Route {
            path: function("quasar.getQuasarDefaultOrigin"),
            body: Value::Null,
            status: StatusCode::OK,
        },
        Route {
            path: function("commerce.getCommerceReadiness"),
            body: Value::Null,
            status: StatusCode::OK,
        },
        Route {
            path: "/api/telemetry".into(),
            body: json!({"event": "page_view", "path": "/"}),
            status: StatusCode::NO_CONTENT,
        },
        Route {
            path: "/api/csp-report".into(),
            body: json!({"csp-report": {"violated-directive": "img-src"}}),
            status: StatusCode::NO_CONTENT,
        },
    ]
}

fn payload(route: &Route) -> String {
    if route.body.is_null() {
        String::new()
    } else {
        route.body.to_string()
    }
}

fn assert_answers(route: &Route, reply: &Reply, mode: &str) {
    assert_eq!(
        reply.status,
        route.status,
        "{mode}: POST {} answered {}",
        route.path,
        reply.text()
    );
    if route.path.starts_with("/api/fn/") {
        assert_eq!(reply.json()["ok"], json!(true), "{mode}: {}", route.path);
    }
}

#[test]
fn the_mounted_functions_are_the_contract_functions() {
    let mut contract = quesar_contract::export::function_names();
    let (_, mut mounted) = quesar_server::api::functions().finish();
    contract.sort_unstable();
    mounted.sort_unstable();
    assert_eq!(
        mounted, contract,
        "a function was mounted without a contract entry, or the reverse"
    );
}

#[tokio::test]
async fn every_contract_function_is_reachable() {
    let server = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    for name in quesar_contract::export::function_names() {
        let path = format!("/api/fn/{name}");
        let reply = server.request(Method::POST, &path, "", &[]).await;
        assert_ne!(
            reply.json()["error"]["code"],
            json!("UNKNOWN_FUNCTION"),
            "{name} is in the contract but not mounted"
        );
    }
    let reply = server
        .request(Method::POST, "/api/fn/nothing.here", "", &[])
        .await;
    assert_eq!(reply.status, StatusCode::NOT_FOUND);
    assert_eq!(reply.json()["error"]["code"], json!("UNKNOWN_FUNCTION"));
}

#[tokio::test]
async fn every_route_answers_over_a_database() {
    let h = Harness::new().await;
    for route in routes() {
        let reply = h
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_answers(&route, &reply, "database");
    }
    h.finish().await;
}

#[tokio::test]
async fn every_route_answers_without_a_database() {
    let server = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    for route in routes() {
        let reply = server
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_answers(&route, &reply, "no database");
    }
}

#[tokio::test]
async fn every_route_answers_with_sign_in_switched_off() {
    let h = Harness::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    for route in routes() {
        let reply = h
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_answers(&route, &reply, "auth off");
    }
    h.finish().await;
    let server = NoDatabase::new(
        &[("VITE_AUTH_ENABLED", "false")],
        quesar_server::api::functions(),
        |_| {},
    );
    for route in routes() {
        let reply = server
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_answers(&route, &reply, "auth off, no database");
    }
}

#[tokio::test]
async fn a_production_server_that_is_not_ready_refuses_every_route() {
    // Production without the secrets readiness demands.
    let server = NoDatabase::new(
        &[("QUESAR_ENV", "production")],
        quesar_server::api::functions(),
        |_| {},
    );
    let readiness = server.request(Method::GET, "/api/readiness", "", &[]).await;
    assert_eq!(readiness.status, StatusCode::SERVICE_UNAVAILABLE);
    for route in routes() {
        let reply = server
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_eq!(
            reply.status,
            StatusCode::SERVICE_UNAVAILABLE,
            "POST {}",
            route.path
        );
        assert_eq!(reply.json(), readiness.json(), "POST {}", route.path);
    }
}

#[tokio::test]
async fn a_production_server_with_a_database_that_is_not_ready_refuses_every_route() {
    let key = "k".repeat(43);
    let h = Harness::with(&[("QUESAR_ENV", "production"), ("APP_ENCRYPTION_KEY", &key)]).await;
    let readiness = h.request(Method::GET, "/api/readiness", "", &[]).await;
    assert_eq!(readiness.status, StatusCode::SERVICE_UNAVAILABLE);
    for route in routes() {
        let reply = h
            .request(Method::POST, &route.path, &payload(&route), &[])
            .await;
        assert_eq!(
            reply.status,
            StatusCode::SERVICE_UNAVAILABLE,
            "POST {}",
            route.path
        );
    }
    h.finish().await;
}
