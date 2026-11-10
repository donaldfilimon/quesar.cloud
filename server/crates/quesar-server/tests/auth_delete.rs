//! `POST /api/auth/delete-account`.

mod common;

use axum::http::StatusCode;
use common::{COOKIE_NAME, Harness, PASSWORD};
use serde_json::{Value, json};
use std::time::Duration;

fn hours(h: u64) -> Duration {
    Duration::from_secs(h * 3600)
}

const CLEARED: &str = "Max-Age=0";

async fn user_id(h: &Harness, email: &str) -> String {
    sqlx::query_scalar(r#"select id from "user" where email = $1"#)
        .bind(email)
        .fetch_one(&h.db.pool)
        .await
        .unwrap()
}

async fn count(h: &Harness, sql: &str, bind: &str) -> i64 {
    sqlx::query_scalar(sql)
        .bind(bind)
        .fetch_one(&h.db.pool)
        .await
        .unwrap()
}

async fn users(h: &Harness, id: &str) -> i64 {
    count(h, r#"select count(*) from "user" where id = $1"#, id).await
}

/// A user with a session and per-user rows, as sign-up leaves them plus data.
async fn account(h: &Harness, email: &str) -> (String, String) {
    let cookie = h.sign_up(email).await.session_cookie().unwrap();
    let id = user_id(h, email).await;
    sqlx::query("insert into field_notes (user_id, node_id, body) values ($1, 'quesar', 'note')")
        .bind(&id)
        .execute(&h.db.pool)
        .await
        .unwrap();
    (id, cookie)
}

async fn delete(h: &Harness, cookie: &str, body: Value) -> common::Reply {
    h.post("/delete-account", &body, &[("cookie", cookie)])
        .await
}

fn assert_error(reply: &common::Reply, status: StatusCode, name: &str, code: &str) {
    assert_eq!(reply.status, status, "{}", reply.text());
    let error = &reply.json()["error"];
    assert_eq!(error["name"], name, "{}", reply.text());
    assert_eq!(error["code"], code, "{}", reply.text());
    // A refusal never clears the cookie (a session refresh may re-send it).
    assert!(
        reply.set_cookies().iter().all(|c| !c.contains(CLEARED)),
        "{:?}",
        reply.set_cookies()
    );
}

#[tokio::test]
async fn a_wrong_password_is_refused_and_nothing_is_deleted() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;

    let reply = delete(&h, &cookie, json!({ "password": "not-the-password" })).await;

    assert_error(
        &reply,
        StatusCode::BAD_REQUEST,
        "AuthError",
        "INVALID_PASSWORD",
    );
    assert_eq!(users(&h, &id).await, 1);
    assert_eq!(
        count(
            &h,
            "select count(*) from field_notes where user_id = $1",
            &id
        )
        .await,
        1
    );
    assert_eq!(
        h.get("/session", Some(&cookie)).await.result()["user"]["id"],
        id
    );
    h.finish().await;
}

#[tokio::test]
async fn a_user_without_a_credential_account_cannot_use_a_password() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;
    sqlx::query(r#"delete from "account" where "userId" = $1"#)
        .bind(&id)
        .execute(&h.db.pool)
        .await
        .unwrap();
    h.hasher.reset();

    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;

    assert_error(
        &reply,
        StatusCode::BAD_REQUEST,
        "AuthError",
        "CREDENTIAL_ACCOUNT_NOT_FOUND",
    );
    assert_eq!(h.hasher.verifies(), 0);
    assert_eq!(users(&h, &id).await, 1);
    h.finish().await;
}

#[tokio::test]
async fn an_over_long_password_is_refused_without_a_hash() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;
    h.hasher.reset();

    let reply = delete(&h, &cookie, json!({ "password": "x".repeat(129) })).await;

    assert_error(
        &reply,
        StatusCode::BAD_REQUEST,
        "ValidationError",
        "PASSWORD_TOO_LONG",
    );
    assert_eq!(h.hasher.verifies(), 0);
    assert_eq!(users(&h, &id).await, 1);
    h.finish().await;
}

#[tokio::test]
async fn an_old_session_needs_the_password_and_a_fresh_one_does_not() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;

    h.clock.advance(hours(25));
    // No password, a blank one and a missing one all mean "none".
    for body in [json!({}), json!({ "password": "" })] {
        let reply = delete(&h, &cookie, body).await;
        assert_error(
            &reply,
            StatusCode::BAD_REQUEST,
            "AuthError",
            "SESSION_EXPIRED",
        );
        assert_eq!(users(&h, &id).await, 1);
    }

    // With the right password the same session succeeds.
    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(reply.json(), json!({ "ok": true, "result": {} }));
    assert_eq!(users(&h, &id).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn a_fresh_session_deletes_without_a_password() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;
    h.hasher.reset();

    h.clock.advance(hours(23));
    let reply = delete(&h, &cookie, json!({})).await;

    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(h.hasher.verifies(), 0);
    assert_eq!(users(&h, &id).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn success_removes_the_user_everywhere_and_clears_the_cookie() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;
    let other = h
        .sign_in("ada@example.com", PASSWORD)
        .await
        .session_cookie()
        .unwrap();
    let bystander = account(&h, "grace@example.com").await;
    // A linked provider account with its verification, as the OAuth flow leaves them.
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('acc-google', 'g-1', 'google', $1, now())"#,
    )
    .bind(&id)
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        "insert into oauth_email_verifications (account_id, email) values ('acc-google', 'ada@example.com')",
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        "insert into inquiries (user_id, name, email, message) values ($1, 'Ada', 'ada@example.com', 'hello there')",
    )
    .bind(&id)
    .execute(&h.db.pool)
    .await
    .unwrap();

    h.clock.advance(hours(25));
    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;

    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(reply.json(), json!({ "ok": true, "result": {} }));
    // Exactly one Set-Cookie: the clearing one (the 25 h refresh is not re-sent).
    let cookies = reply.set_cookies();
    assert_eq!(cookies.len(), 1, "{cookies:?}");
    assert!(
        cookies[0].starts_with(&format!("{COOKIE_NAME}=;")),
        "{}",
        cookies[0]
    );
    assert!(cookies[0].contains(CLEARED), "{}", cookies[0]);

    assert_eq!(users(&h, &id).await, 0);
    for (what, sql) in [
        (
            "accounts",
            r#"select count(*) from "account" where "userId" = $1"#,
        ),
        (
            "sessions",
            "select count(*) from auth_sessions where user_id = $1",
        ),
        (
            "notes",
            "select count(*) from field_notes where user_id = $1",
        ),
        (
            "linked inquiries",
            "select count(*) from inquiries where user_id = $1",
        ),
    ] {
        assert_eq!(count(&h, sql, &id).await, 0, "{what}");
    }
    assert_eq!(
        count(
            &h,
            "select count(*) from oauth_email_verifications where account_id = $1",
            "acc-google"
        )
        .await,
        0
    );
    // The inquiry is kept, unlinked.
    assert_eq!(
        count(
            &h,
            "select count(*) from inquiries where user_id is null and email = $1",
            "ada@example.com"
        )
        .await,
        1
    );
    // The old cookies resolve to nothing, on either session.
    assert_eq!(h.get("/session", Some(&cookie)).await.result(), Value::Null);
    assert_eq!(h.get("/session", Some(&other)).await.result(), Value::Null);
    assert_eq!(
        delete(&h, &other, json!({ "password": PASSWORD }))
            .await
            .status,
        StatusCode::UNAUTHORIZED
    );
    // The other user is untouched.
    assert_eq!(users(&h, &bystander.0).await, 1);
    assert_eq!(
        count(
            &h,
            "select count(*) from field_notes where user_id = $1",
            &bystander.0
        )
        .await,
        1
    );
    assert_eq!(
        h.get("/session", Some(&bystander.1)).await.result()["user"]["id"],
        bystander.0
    );
    h.finish().await;
}

#[tokio::test]
async fn a_cross_site_post_is_refused() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;

    let evil = h
        .post(
            "/delete-account",
            &json!({ "password": PASSWORD }),
            &[("cookie", &cookie), ("origin", "https://evil.example")],
        )
        .await;
    assert_error(
        &evil,
        StatusCode::FORBIDDEN,
        "CrossSiteRequestError",
        "CROSS_SITE_REQUEST",
    );
    let fetch = h
        .post(
            "/delete-account",
            &json!({ "password": PASSWORD }),
            &[("cookie", &cookie), ("sec-fetch-site", "cross-site")],
        )
        .await;
    assert_eq!(fetch.status, StatusCode::FORBIDDEN);
    assert_eq!(users(&h, &id).await, 1);
    h.finish().await;
}

#[tokio::test]
async fn it_needs_a_session() {
    let h = Harness::new().await;
    let reply = h
        .post("/delete-account", &json!({ "password": PASSWORD }), &[])
        .await;
    assert_error(
        &reply,
        StatusCode::UNAUTHORIZED,
        "UnauthorizedError",
        "UNAUTHORIZED",
    );
    h.finish().await;
}

#[tokio::test]
async fn with_sign_in_switched_off_it_answers_401_like_the_other_session_routes() {
    let h = Harness::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    let reply = h
        .post("/delete-account", &json!({ "password": PASSWORD }), &[])
        .await;
    assert_error(
        &reply,
        StatusCode::UNAUTHORIZED,
        "UnauthorizedError",
        "UNAUTHORIZED",
    );
    h.finish().await;
}

#[tokio::test]
async fn password_guesses_are_rate_limited_per_user() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;

    for _ in 0..3 {
        let reply = delete(&h, &cookie, json!({ "password": "wrong-password-1" })).await;
        assert_eq!(reply.json()["error"]["code"], "INVALID_PASSWORD");
    }
    h.hasher.reset();
    // The fourth, even with the right password, is refused before any hashing.
    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;
    assert_eq!(
        reply.status,
        StatusCode::TOO_MANY_REQUESTS,
        "{}",
        reply.text()
    );
    assert!(reply.headers.contains_key("retry-after"));
    assert_eq!(h.hasher.verifies(), 0);
    assert_eq!(users(&h, &id).await, 1);

    // The window passes, and it goes through.
    h.clock.advance(Duration::from_secs(11));
    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(users(&h, &id).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn an_unavailable_commerce_cleanup_refuses_deletion() {
    let complete = [
        ("WDBX_BINARY", "/usr/bin/wdbx"),
        ("WDBX_COMMERCE_DIRECTORY", "/srv/wdbx/commerce"),
        ("WDBX_COMMERCE_CONFIG", "/srv/wdbx/config.toml"),
        ("WDBX_COMMERCE_HOST_KEY", "/srv/wdbx/key"),
    ];
    for (label, variables) in [
        ("complete", complete.to_vec()),
        (
            "partial",
            vec![("WDBX_COMMERCE_DIRECTORY", "/srv/wdbx/commerce")],
        ),
    ] {
        let h = Harness::with(&variables).await;
        let (id, cookie) = account(&h, "ada@example.com").await;

        let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;

        assert_error(
            &reply,
            StatusCode::SERVICE_UNAVAILABLE,
            "AuthError",
            "DELETION_UNAVAILABLE",
        );
        assert_eq!(users(&h, &id).await, 1, "{label}");
        assert_eq!(
            count(
                &h,
                "select count(*) from field_notes where user_id = $1",
                &id
            )
            .await,
            1
        );
        assert_eq!(
            h.get("/session", Some(&cookie)).await.result()["user"]["id"],
            id
        );
        h.finish().await;
    }
}

#[tokio::test]
async fn a_purge_failure_is_a_500_and_leaves_the_account_whole() {
    let h = Harness::new().await;
    let (id, cookie) = account(&h, "ada@example.com").await;
    for statement in [
        "create function purge_fault() returns trigger language plpgsql as $$ begin raise exception 'synthetic purge fault'; end $$",
        "create trigger purge_fault before delete on field_notes for each row execute function purge_fault()",
    ] {
        sqlx::query(statement).execute(&h.db.pool).await.unwrap();
    }

    let reply = delete(&h, &cookie, json!({ "password": PASSWORD })).await;

    assert_error(
        &reply,
        StatusCode::INTERNAL_SERVER_ERROR,
        "AuthError",
        "DELETION_FAILED",
    );
    // Nothing in the message says why.
    assert!(!reply.text().contains("synthetic"), "{}", reply.text());
    assert_eq!(users(&h, &id).await, 1);
    assert_eq!(
        h.get("/session", Some(&cookie)).await.result()["user"]["id"],
        id
    );
    h.finish().await;
}
