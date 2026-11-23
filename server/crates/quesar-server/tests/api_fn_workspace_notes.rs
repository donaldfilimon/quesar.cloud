//! Field notes through the production function mount.

mod common;

use axum::http::{Method, StatusCode};
use common::{Harness, NoDatabase, Reply, T0};
use quesar_server::auth::view::iso;
use quesar_services::catalog::Catalog;
use serde_json::{Value, json};
use time::Duration;

const LIST: &str = "/api/fn/workspace.listNotes";
const ADD: &str = "/api/fn/workspace.addNote";
const DELETE: &str = "/api/fn/workspace.deleteNote";

fn node_id() -> &'static str {
    &Catalog::embedded().unwrap().nodes()[0].id
}

async fn call(harness: &Harness, cookie: &str, path: &str, body: Value) -> Reply {
    harness
        .request(Method::POST, path, &body.to_string(), &[("cookie", cookie)])
        .await
}

fn assert_done(reply: Reply) {
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(reply.json(), json!({"ok": true, "result": null}));
}

#[tokio::test]
async fn notes_list_in_stable_order_and_remove_the_selected_note() {
    let h = Harness::new().await;
    let owner = h
        .sign_up("notes-owner@example.test")
        .await
        .session_cookie()
        .unwrap();
    let reader_signup = h.sign_up("notes-reader@example.test").await;
    let reader_id = reader_signup.result()["user"]["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let reader = reader_signup.session_cookie().unwrap();

    assert_eq!(
        call(&h, &owner, LIST, Value::Null).await.result(),
        json!([])
    );
    for (body, identity_field) in [
        ("\u{feff}First note\n", "userId"),
        ("Second note", "user_id"),
    ] {
        let mut input = json!({"nodeId": node_id(), "body": body});
        input[identity_field] = json!(reader_id);
        assert_done(call(&h, &owner, ADD, input).await);
    }
    let later = T0 + Duration::seconds(1);
    h.clock.set(later);
    assert_done(
        call(
            &h,
            &owner,
            ADD,
            json!({"nodeId": node_id(), "body": "Third note"}),
        )
        .await,
    );

    let reply = call(&h, &owner, LIST, Value::Null).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.headers["cache-control"], "no-store");
    let rows = reply.result();
    assert_eq!(rows.as_array().unwrap().len(), 3);
    let third = rows[0]["id"].as_i64().unwrap();
    let second = rows[1]["id"].as_i64().unwrap();
    let first = rows[2]["id"].as_i64().unwrap();
    assert_eq!(
        rows,
        json!([
            {"id": third, "node_id": node_id(), "body": "Third note", "created_at": iso(later)},
            {"id": second, "node_id": node_id(), "body": "Second note", "created_at": iso(T0)},
            {"id": first, "node_id": node_id(), "body": "First note", "created_at": iso(T0)},
        ]),
    );
    assert!(first < second && second < third);
    assert_eq!(
        call(&h, &reader, LIST, Value::Null).await.result(),
        json!([])
    );
    // A selection kept across an account change matches no note.
    assert_done(call(&h, &reader, DELETE, json!(second)).await);
    assert_eq!(call(&h, &owner, LIST, Value::Null).await.result(), rows);
    assert_done(call(&h, &owner, DELETE, json!(second)).await);
    assert_done(call(&h, &owner, DELETE, json!(second)).await);
    assert_done(call(&h, &owner, DELETE, json!(3_000_000_000_i64)).await);
    assert_eq!(
        call(&h, &owner, LIST, Value::Null).await.result(),
        json!([rows[0], rows[2]]),
    );
    h.finish().await;
}

#[tokio::test]
async fn notes_require_same_origin() {
    let app = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    for (path, input) in [
        (LIST, Value::Null),
        (ADD, json!({"nodeId": node_id(), "body": "A note"})),
        (DELETE, json!(1)),
    ] {
        for site in ["same-site", "cross-site"] {
            let reply = app
                .request(
                    Method::POST,
                    path,
                    &input.to_string(),
                    &[("sec-fetch-site", site)],
                )
                .await;
            assert_eq!(reply.status, StatusCode::FORBIDDEN, "{path} {site}");
            assert_eq!(reply.json()["error"]["name"], "CrossSiteRequestError");
            assert_eq!(reply.error_code(), "CROSS_SITE_REQUEST");
        }
    }
}

#[tokio::test]
async fn notes_validate_fields_and_utf16_length() {
    let h = Harness::new().await;
    let cookie = h
        .sign_up("notes-validation@example.test")
        .await
        .session_cookie()
        .unwrap();
    for (input, code) in [
        (json!({"nodeId": "", "body": "Body"}), "INVALID_NODE_ID"),
        (json!({"nodeId": node_id(), "body": " \n "}), "EMPTY_NOTE"),
        (
            json!({"nodeId": node_id(), "body": "Contains\0NUL"}),
            "INVALID_NOTE",
        ),
        (
            json!({"nodeId": node_id(), "body": format!("{}x", "😀".repeat(1000))}),
            "NOTE_TOO_LONG",
        ),
        (json!([node_id(), "Not an object"]), "INVALID_BODY"),
        (json!({"nodeId": node_id()}), "INVALID_BODY"),
    ] {
        let reply = call(&h, &cookie, ADD, input).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{}", reply.text());
        assert_eq!(reply.json()["error"]["name"], "ValidationError");
        assert_eq!(reply.error_code(), code);
    }
    for invalid in [json!(0), json!(-1), json!(1.5), json!("1"), Value::Null] {
        let reply = call(&h, &cookie, DELETE, invalid).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{}", reply.text());
        assert_eq!(reply.json()["error"]["name"], "ValidationError");
    }
    assert_eq!(
        call(&h, &cookie, LIST, Value::Null).await.result(),
        json!([])
    );
    let body = "😀".repeat(1000);
    assert_done(call(&h, &cookie, ADD, json!({"nodeId": node_id(), "body": body})).await);
    assert_eq!(
        call(&h, &cookie, LIST, Value::Null).await.result()[0]["body"],
        body
    );
    h.finish().await;
}

#[tokio::test]
async fn notes_require_a_session_and_a_database() {
    let signed_out = Harness::new().await;
    let auth_off = Harness::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    let no_database = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    for (path, input) in [
        (LIST, Value::Null),
        (ADD, json!({"nodeId": node_id(), "body": "A note"})),
        (DELETE, json!(1)),
    ] {
        let body = input.to_string();
        for harness in [&signed_out, &auth_off] {
            let reply = harness.request(Method::POST, path, &body, &[]).await;
            assert_eq!(reply.status, StatusCode::UNAUTHORIZED, "{}", reply.text());
            assert_eq!(reply.error_code(), "UNAUTHORIZED");
        }
        let reply = no_database.request(Method::POST, path, &body, &[]).await;
        assert_eq!(
            reply.status,
            StatusCode::SERVICE_UNAVAILABLE,
            "{}",
            reply.text()
        );
        assert_eq!(reply.error_code(), "AUTH_UNAVAILABLE");
    }
    signed_out.finish().await;
    auth_off.finish().await;
}
