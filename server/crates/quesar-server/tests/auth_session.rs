//! The current session, the session list, profile changes and the cookie
//! re-issue that every authenticated response shares.

mod common;

use axum::http::StatusCode;
use axum::http::header::SET_COOKIE;
use common::{COOKIE_NAME, Harness, PASSWORD, Reply};
use serde_json::{Value, json};
use std::time::Duration;

fn hours(h: u64) -> Duration {
    Duration::from_secs(h * 3600)
}

fn reissued(token: &str) -> String {
    format!("{COOKIE_NAME}={token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax")
}

async fn session_id(h: &Harness, cookie: &str) -> String {
    h.get("/session", Some(cookie)).await.result()["session"]["id"]
        .as_str()
        .unwrap()
        .to_owned()
}

#[tokio::test]
async fn session_is_null_without_a_valid_cookie() {
    let h = Harness::new().await;
    let reply = h.get("/session", None).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.json(), json!({ "ok": true, "result": null }));
    assert!(reply.set_cookies().is_empty());
    let unknown = format!("{COOKIE_NAME}={}", "Z".repeat(43));
    let reply = h.get("/session", Some(&unknown)).await;
    assert_eq!(reply.result(), Value::Null);
    assert!(reply.set_cookies().is_empty());
    // Scripted cross-site reads are refused.
    let evil = h
        .get_with(
            "/session",
            &[("sec-fetch-site", "cross-site"), ("sec-fetch-mode", "cors")],
        )
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    h.finish().await;
}

#[tokio::test]
async fn a_revoked_session_is_refused_everywhere() {
    let h = Harness::new().await;
    let first = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    let second = h
        .sign_in("ada@example.com", PASSWORD)
        .await
        .session_cookie()
        .unwrap();
    let first_id = session_id(&h, &first).await;
    assert_eq!(
        h.post("/profile", &json!({ "name": "Ada" }), &[("cookie", &first)])
            .await
            .status,
        StatusCode::OK
    );

    let revoke = h
        .post(
            "/sessions/revoke",
            &json!({ "id": first_id }),
            &[("cookie", &second)],
        )
        .await;
    assert_eq!(revoke.status, StatusCode::OK);
    assert_eq!(revoke.json(), json!({ "ok": true, "result": {} }));

    assert_eq!(h.get("/session", Some(&first)).await.result(), Value::Null);
    let profile = h
        .post("/profile", &json!({ "name": "Eve" }), &[("cookie", &first)])
        .await;
    assert_eq!(profile.status, StatusCode::UNAUTHORIZED);
    assert_eq!(profile.error_code(), "UNAUTHORIZED");
    assert_eq!(
        h.get("/sessions", Some(&first)).await.status,
        StatusCode::UNAUTHORIZED
    );
    // The other session still works.
    assert_ne!(h.get("/session", Some(&second)).await.result(), Value::Null);
    h.finish().await;
}

#[tokio::test]
async fn the_session_list_needs_a_fresh_sign_in_and_marks_the_current_one() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let cookie = up.session_cookie().unwrap();
    let id = up.result()["session"]["id"].as_str().unwrap().to_owned();
    h.clock.advance(hours(1));
    let other = h
        .post(
            "/sign-in",
            &json!({ "email": "ada@example.com", "password": PASSWORD }),
            &[
                ("user-agent", "Test Browser/1.0"),
                ("x-real-ip", "203.0.113.9"),
            ],
        )
        .await;
    let other_cookie = other.session_cookie().unwrap();

    let list = h.get("/sessions", Some(&cookie)).await;
    assert_eq!(list.status, StatusCode::OK);
    let sessions = list.result()["sessions"].as_array().unwrap().clone();
    assert_eq!(sessions.len(), 2);
    // Newest first; only the caller's own is current.
    assert_eq!(sessions[0]["id"], other.result()["session"]["id"]);
    assert_eq!(sessions[0]["current"], false);
    assert_eq!(sessions[0]["userAgent"], "Test Browser/1.0");
    assert_eq!(sessions[0]["ipAddress"], "203.0.113.9");
    assert_eq!(sessions[1]["id"], id.as_str());
    assert_eq!(sessions[1]["current"], true);
    assert_eq!(sessions[1]["userAgent"], Value::Null);
    for item in &sessions {
        assert!(item["createdAt"].as_str().unwrap().ends_with('Z'));
        assert!(item["expiresAt"].as_str().unwrap().ends_with('Z'));
    }
    // From the other session the flag flips.
    let from_other = h.get("/sessions", Some(&other_cookie)).await.result();
    assert_eq!(from_other["sessions"][0]["current"], true);

    // 24 h after sign-up (the first session's age) is no longer fresh.
    h.clock.advance(hours(24));
    let stale = h.get("/sessions", Some(&cookie)).await;
    assert_eq!(stale.status, StatusCode::FORBIDDEN);
    assert_eq!(stale.json()["error"]["code"], "SESSION_NOT_FRESH");
    // The newer sign-in is 24 h old too; sign in again to get a fresh one.
    let fresh = h
        .sign_in("ada@example.com", PASSWORD)
        .await
        .session_cookie()
        .unwrap();
    assert_eq!(
        h.get("/sessions", Some(&fresh)).await.status,
        StatusCode::OK
    );
    h.clock.advance(hours(1));
    assert_eq!(
        h.get("/sessions", Some(&fresh)).await.status,
        StatusCode::OK
    );
    h.finish().await;
}

#[tokio::test]
async fn sessions_at_25_hours_are_not_fresh() {
    let h = Harness::new().await;
    let cookie = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    h.clock.advance(hours(25));
    let reply = h.get("/sessions", Some(&cookie)).await;
    assert_eq!(reply.status, StatusCode::FORBIDDEN);
    assert_eq!(reply.json()["error"]["code"], "SESSION_NOT_FRESH");
    h.finish().await;
}

#[tokio::test]
async fn revoking_is_by_id_and_only_your_own() {
    let h = Harness::new().await;
    let ada = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    let bob = h.sign_up("bob@example.com").await;
    let bob_cookie = bob.session_cookie().unwrap();
    let bob_session = bob.result()["session"]["id"].as_str().unwrap().to_owned();
    let before = h.session_count().await;

    let foreign = h
        .post(
            "/sessions/revoke",
            &json!({ "id": bob_session }),
            &[("cookie", &ada)],
        )
        .await;
    assert_eq!(foreign.status, StatusCode::NOT_FOUND);
    assert_eq!(foreign.json()["error"]["name"], "NotFoundError");
    assert_eq!(foreign.error_code(), "NOT_FOUND");
    assert_eq!(h.session_count().await, before, "nothing changed");
    assert_ne!(
        h.get("/session", Some(&bob_cookie)).await.result(),
        Value::Null
    );

    for body in [json!({ "id": "nope" }), json!({}), json!({ "id": "" })] {
        let reply = h.post("/sessions/revoke", &body, &[("cookie", &ada)]).await;
        assert_eq!(reply.status, StatusCode::NOT_FOUND, "{body}");
    }
    // A token is not an id.
    let token = bob.token().unwrap();
    let by_token = h
        .post(
            "/sessions/revoke",
            &json!({ "id": token }),
            &[("cookie", &ada)],
        )
        .await;
    assert_eq!(by_token.status, StatusCode::NOT_FOUND);

    // Unauthenticated and cross-site calls are refused first.
    assert_eq!(
        h.post("/sessions/revoke", &json!({ "id": "x" }), &[])
            .await
            .status,
        StatusCode::UNAUTHORIZED
    );
    let evil = h
        .post(
            "/sessions/revoke",
            &json!({ "id": bob_session }),
            &[
                ("origin", "https://example.invalid"),
                ("cookie", &bob_cookie),
            ],
        )
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    assert_eq!(h.session_count().await, before);
    h.finish().await;
}

#[tokio::test]
async fn revoke_others_keeps_only_the_current_session() {
    let h = Harness::new().await;
    let keep = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    h.sign_in("ada@example.com", PASSWORD).await;
    h.sign_in("ada@example.com", PASSWORD).await;
    let bob = h.sign_up("bob@example.com").await.session_cookie().unwrap();

    let reply = h
        .post("/sessions/revoke-others", &json!({}), &[("cookie", &keep)])
        .await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.result(), json!({ "revoked": 2 }));
    assert_eq!(
        h.session_count().await,
        2,
        "Ada's current session and Bob's"
    );
    assert_ne!(h.get("/session", Some(&keep)).await.result(), Value::Null);
    assert_ne!(h.get("/session", Some(&bob)).await.result(), Value::Null);
    let again = h
        .post("/sessions/revoke-others", &json!({}), &[("cookie", &keep)])
        .await;
    assert_eq!(again.result(), json!({ "revoked": 0 }));
    h.finish().await;
}

#[tokio::test]
async fn the_token_never_appears_in_a_response_body() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let token = up.token().unwrap();
    let cookie = up.session_cookie().unwrap();
    let signed_in = h.sign_in("ada@example.com", PASSWORD).await;
    let second_token = signed_in.token().unwrap();
    let id = up.result()["session"]["id"].as_str().unwrap().to_owned();

    let replies: Vec<Reply> = vec![
        up,
        signed_in,
        h.get("/session", Some(&cookie)).await,
        h.get("/sessions", Some(&cookie)).await,
        h.post(
            "/profile",
            &json!({ "name": "Ada" }),
            &[("cookie", &cookie)],
        )
        .await,
        h.post(
            "/sessions/revoke",
            &json!({ "id": "x" }),
            &[("cookie", &cookie)],
        )
        .await,
        h.post(
            "/sessions/revoke-others",
            &json!({}),
            &[("cookie", &cookie)],
        )
        .await,
        h.post(
            "/sessions/revoke",
            &json!({ "id": id }),
            &[("cookie", &cookie)],
        )
        .await,
        h.get("/session", Some(&cookie)).await,
    ];
    for (i, reply) in replies.iter().enumerate() {
        let body = reply.text();
        for secret in [&token, &second_token] {
            assert!(
                !body.contains(secret.as_str()),
                "reply {i} leaks a token: {body}"
            );
        }
        assert!(!body.to_lowercase().contains("token"), "reply {i}: {body}");
    }
    h.finish().await;
}

#[tokio::test]
async fn a_refreshed_session_re_sends_its_cookie_on_every_authenticated_route() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let token = up.token().unwrap();
    let cookie = up.session_cookie().unwrap();

    // Under a day old: nothing to re-send, on any route.
    h.clock.advance(hours(20));
    assert!(
        h.get("/session", Some(&cookie))
            .await
            .set_cookies()
            .is_empty()
    );

    // 1.1 days: GET /session re-sends the same token with a fresh Max-Age.
    h.clock.advance(hours(6) + Duration::from_secs(24 * 60));
    let refreshed = h.get("/session", Some(&cookie)).await;
    assert_eq!(refreshed.set_cookies(), [reissued(&token)]);
    // The expiry moved, and a second request has nothing more to say.
    assert_eq!(
        refreshed.result()["session"]["expiresAt"],
        "2026-11-18T14:24:00.000Z"
    );
    assert!(
        h.get("/session", Some(&cookie))
            .await
            .set_cookies()
            .is_empty()
    );

    // The same holds for POST /profile ...
    let bob = h.sign_up("bob@example.com").await;
    let bob_cookie = bob.session_cookie().unwrap();
    h.clock.advance(hours(27));
    let profile = h
        .post(
            "/profile",
            &json!({ "name": "Bob" }),
            &[("cookie", &bob_cookie)],
        )
        .await;
    assert_eq!(profile.status, StatusCode::OK);
    assert_eq!(profile.set_cookies(), [reissued(&bob.token().unwrap())]);

    // ... for an authenticated 403 ...
    let carol = h.sign_up("carol@example.com").await;
    let carol_cookie = carol.session_cookie().unwrap();
    h.clock.advance(hours(27));
    let stale = h.get("/sessions", Some(&carol_cookie)).await;
    assert_eq!(stale.status, StatusCode::FORBIDDEN);
    assert_eq!(stale.set_cookies(), [reissued(&carol.token().unwrap())]);

    // ... and for POST /sessions/revoke-others.
    let dave = h.sign_up("dave@example.com").await;
    let dave_cookie = dave.session_cookie().unwrap();
    h.clock.advance(hours(27));
    let others = h
        .post(
            "/sessions/revoke-others",
            &json!({}),
            &[("cookie", &dave_cookie)],
        )
        .await;
    assert_eq!(others.set_cookies(), [reissued(&dave.token().unwrap())]);

    // One Set-Cookie each, and no response carries it twice.
    for reply in [&refreshed, &profile, &stale, &others] {
        assert_eq!(reply.headers.get_all(SET_COOKIE).iter().count(), 1);
    }
    h.finish().await;
}

#[tokio::test]
async fn profile_changes_the_display_name() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let cookie = up.session_cookie().unwrap();
    let created = up.result()["user"]["createdAt"].clone();
    h.clock.advance(hours(2));

    let ok = h
        .post(
            "/profile",
            &json!({ "name": "  Ada Lovelace  " }),
            &[("cookie", &cookie)],
        )
        .await;
    assert_eq!(ok.status, StatusCode::OK);
    let user = &ok.result()["user"];
    assert_eq!(user["name"], "Ada Lovelace");
    assert_eq!(user["email"], "ada@example.com");
    assert_eq!(user["createdAt"], created);
    let stored: (String, time::OffsetDateTime) =
        sqlx::query_as(r#"select name, "updatedAt" from "user""#)
            .fetch_one(&h.db.pool)
            .await
            .unwrap();
    assert_eq!(stored.0, "Ada Lovelace");
    assert_eq!(stored.1, common::T0 + time::Duration::hours(2));
    assert_eq!(
        h.get("/session", Some(&cookie)).await.result()["user"]["name"],
        "Ada Lovelace"
    );

    for (name, message) in [
        (
            "x".repeat(81),
            "Keep the display name to 80 characters or fewer.",
        ),
        ("   ".to_owned(), "Enter a display name."),
        (String::new(), "Enter a display name."),
    ] {
        let reply = h
            .post("/profile", &json!({ "name": name }), &[("cookie", &cookie)])
            .await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST);
        assert_eq!(reply.json()["error"]["name"], "ValidationError");
        assert_eq!(reply.json()["error"]["message"], message);
    }
    assert_eq!(
        h.post(
            "/profile",
            &json!({ "name": "x".repeat(80) }),
            &[("cookie", &cookie)]
        )
        .await
        .status,
        StatusCode::OK
    );

    assert_eq!(
        h.post("/profile", &json!({ "name": "Eve" }), &[])
            .await
            .status,
        StatusCode::UNAUTHORIZED
    );
    let evil = h
        .post(
            "/profile",
            &json!({ "name": "Eve" }),
            &[("origin", "https://example.invalid"), ("cookie", &cookie)],
        )
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    h.finish().await;
}

#[tokio::test]
async fn authenticated_routes_are_rate_limited_per_user() {
    let h = Harness::new().await;
    let cookie = h.sign_up("ada@example.com").await.session_cookie().unwrap();
    for i in 0..100 {
        let reply = h.get("/sessions", Some(&cookie)).await;
        assert_eq!(reply.status, StatusCode::OK, "request {i}");
    }
    let refused = h.get("/sessions", Some(&cookie)).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(refused.error_code(), "RATE_LIMITED");
    h.finish().await;
}

#[tokio::test]
async fn revoking_the_current_session_clears_the_cookie_and_never_re_issues_it() {
    let h = Harness::new().await;
    let clear = format!("{COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
    for age in [0, 27] {
        let email = format!("user{age}@example.com");
        let up = h.sign_up(&email).await;
        let cookie = up.session_cookie().unwrap();
        let id = up.result()["session"]["id"].as_str().unwrap().to_owned();
        h.clock.advance(hours(age));
        let reply = h
            .post(
                "/sessions/revoke",
                &json!({ "id": id }),
                &[("cookie", &cookie)],
            )
            .await;
        assert_eq!(reply.status, StatusCode::OK);
        assert_eq!(
            reply.set_cookies(),
            std::slice::from_ref(&clear),
            "age {age} h"
        );
        assert_eq!(h.get("/session", Some(&cookie)).await.result(), Value::Null);
    }
    h.finish().await;
}
