//! Sign-up, sign-in and sign-out over HTTP, against a real database.

mod common;

use axum::http::StatusCode;
use axum::http::header::{CACHE_CONTROL, RETRY_AFTER};
use common::{COOKIE_NAME, Harness, ORIGIN, PASSWORD};
use serde_json::{Value, json};

const ATTRIBUTES: &str = "; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax";

async fn user_count(h: &Harness) -> i64 {
    sqlx::query_scalar(r#"select count(*) from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap()
}

#[tokio::test]
async fn the_full_email_password_scenario() {
    let h = Harness::new().await;
    let email = "ada@example.com";

    let up = h.sign_up(email).await;
    assert_eq!(up.headers[CACHE_CONTROL], "no-store");
    let result = up.result();
    assert_eq!(result["user"]["emailVerified"], false);
    assert_eq!(result["user"]["email"], email);
    assert_eq!(result["user"]["name"], "Synthetic Signup");
    assert_eq!(result["user"]["image"], Value::Null);
    assert!(result["user"]["createdAt"].as_str().unwrap().ends_with('Z'));
    assert_eq!(result["session"]["createdAt"], "2026-11-10T12:00:00.000Z");
    assert_eq!(result["session"]["expiresAt"], "2026-11-17T12:00:00.000Z");
    let user_id = result["user"]["id"].as_str().unwrap().to_owned();

    // The cookie resolves to that user.
    let cookie = up.session_cookie().unwrap();
    let me = h.get("/session", Some(&cookie)).await;
    assert_eq!(me.result()["user"]["id"], user_id);

    // Sign-in resolves the same user.
    let signed_in = h.sign_in(email, PASSWORD).await;
    assert_eq!(signed_in.status, StatusCode::OK);
    assert_eq!(signed_in.result()["user"]["id"], user_id);
    let second = signed_in.session_cookie().unwrap();
    assert_ne!(second, cookie);
    let me = h.get("/session", Some(&second)).await;
    assert_eq!(me.result()["user"]["id"], user_id);

    // A wrong password is refused with no cookie at all.
    let wrong = h.sign_in(email, "synthetic-wrong-password").await;
    assert_eq!(wrong.status, StatusCode::UNAUTHORIZED);
    assert!(wrong.set_cookies().is_empty());
    let error = &wrong.json()["error"];
    assert_eq!(error["name"], "AuthError");
    assert_eq!(error["code"], "INVALID_EMAIL_OR_PASSWORD");
    assert_eq!(error["message"], "Invalid email or password");

    // Cross-site sign-up is refused, by Origin and by fetch metadata, and
    // creates nothing.
    let body = json!({ "name": "Must Refuse", "email": "evil@example.com", "password": PASSWORD });
    let evil = h
        .post("/sign-up", &body, &[("origin", "https://example.invalid")])
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    assert_eq!(evil.error_code(), "CROSS_SITE_REQUEST");
    let fetch = h
        .post("/sign-up", &body, &[("sec-fetch-site", "cross-site")])
        .await;
    assert_eq!(fetch.status, StatusCode::FORBIDDEN);
    assert_eq!(user_count(&h).await, 1);
    h.finish().await;
}

#[tokio::test]
async fn the_real_hasher_signs_up_and_in() {
    let h = Harness::with_argon2().await;
    h.sign_up("real@example.com").await;
    let stored: String = sqlx::query_scalar(r#"select password from "account""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert!(stored.starts_with("$argon2id$v=19$m=19456,t=2,p=1$"));
    assert_eq!(
        h.sign_in("real@example.com", PASSWORD).await.status,
        StatusCode::OK
    );
    assert_eq!(
        h.sign_in("real@example.com", "synthetic-wrong-password")
            .await
            .status,
        StatusCode::UNAUTHORIZED
    );
    h.finish().await;
}

#[tokio::test]
async fn the_cookie_attributes_are_exact() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let cookies = up.set_cookies();
    assert_eq!(cookies.len(), 1);
    let token = up.token().unwrap();
    assert_eq!(token.len(), 43);
    assert!(
        token
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    );
    assert_eq!(cookies[0], format!("{COOKIE_NAME}={token}{ATTRIBUTES}"));
    assert!(!cookies[0].contains("Domain"));
    // Sign-in sets the same shape.
    let again = h.sign_in("ada@example.com", PASSWORD).await;
    let cookie = &again.set_cookies()[0];
    assert!(cookie.starts_with(&format!("{COOKIE_NAME}=")));
    assert!(cookie.ends_with(ATTRIBUTES));
    h.finish().await;
}

#[tokio::test]
async fn sign_up_validates_email_then_password_then_name() {
    let h = Harness::new().await;
    let attempt = |name: &str, email: &str, password: &str| {
        let body = json!({ "name": name, "email": email, "password": password });
        let h = &h;
        async move { h.post("/sign-up", &body, &[]).await }
    };
    let long_name = "x".repeat(81);

    let reply = attempt("   ", "nope", "short").await;
    assert_eq!(
        (reply.status.as_u16(), reply.error_code().as_str()),
        (400, "INVALID_EMAIL")
    );
    let reply = attempt("   ", "a@example.com", "short").await;
    assert_eq!(reply.error_code(), "PASSWORD_TOO_SHORT");
    let reply = attempt("   ", "a@example.com", &"x".repeat(129)).await;
    assert_eq!(reply.error_code(), "PASSWORD_TOO_LONG");

    let reply = attempt(&long_name, "a@example.com", PASSWORD).await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(reply.json()["error"]["name"], "ValidationError");
    assert_eq!(
        reply.json()["error"]["message"],
        "Keep the display name to 80 characters or fewer."
    );
    let reply = attempt("   ", "a@example.com", PASSWORD).await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(reply.json()["error"]["message"], "Enter a display name.");
    // 80 characters (not bytes) is fine.
    let reply = attempt(&"é".repeat(80), "a@example.com", PASSWORD).await;
    assert_eq!(reply.status, StatusCode::OK);

    // Nothing was hashed or stored for the refusals: one user, one hash.
    assert_eq!(user_count(&h).await, 1);
    assert_eq!(h.hasher.hashes(), 1);
    assert!(
        attempt("n", "a@example.com", PASSWORD).await.status == StatusCode::UNPROCESSABLE_ENTITY
    );
    h.finish().await;
}

#[tokio::test]
async fn a_registered_email_is_422_whatever_its_case() {
    let h = Harness::new().await;
    h.sign_up("ada@example.com").await;
    let hashes = h.hasher.hashes();
    for email in ["ada@example.com", "ADA@Example.COM", " ada@example.com "] {
        let reply = h
            .post(
                "/sign-up",
                &json!({ "name": "Other", "email": email, "password": PASSWORD }),
                &[],
            )
            .await;
        assert_eq!(reply.status, StatusCode::UNPROCESSABLE_ENTITY, "{email}");
        assert_eq!(reply.error_code(), "USER_ALREADY_EXISTS");
        assert!(reply.set_cookies().is_empty());
    }
    assert_eq!(user_count(&h).await, 1);
    assert_eq!(h.hasher.hashes(), hashes, "no hash was spent");
    h.finish().await;
}

#[tokio::test]
async fn sign_up_creates_the_better_auth_rows() {
    let h = Harness::new().await;
    let up = h.sign_up("Ada@Example.com").await;
    let id = up.result()["user"]["id"].as_str().unwrap().to_owned();
    assert_eq!(up.result()["user"]["email"], "ada@example.com");
    let row: (String, String, String, String, bool) = sqlx::query_as(
        r#"select a."accountId", a."providerId", a."userId", a.password, u."emailVerified"
           from "account" a join "user" u on u.id = a."userId""#,
    )
    .fetch_one(&h.db.pool)
    .await
    .unwrap();
    assert_eq!(
        (row.0.as_str(), row.1.as_str(), row.2.as_str()),
        (id.as_str(), "credential", id.as_str())
    );
    assert!(row.3.starts_with("fake$"));
    assert!(!row.4);
    h.finish().await;
}

#[tokio::test]
async fn a_failed_session_insert_rolls_the_sign_up_back_and_sets_no_cookie() {
    let h = Harness::new().await;
    sqlx::query("drop table auth_sessions cascade")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = h
        .post(
            "/sign-up",
            &json!({ "name": "Ada", "email": "ada@example.com", "password": PASSWORD }),
            &[],
        )
        .await;
    assert_eq!(reply.status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(reply.set_cookies().is_empty());
    assert_eq!(user_count(&h).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn sign_in_applies_only_the_maximum_and_malformed_bodies_are_400() {
    let h = Harness::new().await;
    h.sign_up("ada@example.com").await;
    h.hasher.reset();

    // A short password costs a hash and fails like any wrong one.
    let short = h.sign_in("ada@example.com", "abc").await;
    assert_eq!(short.status, StatusCode::UNAUTHORIZED);
    assert_eq!(short.error_code(), "INVALID_EMAIL_OR_PASSWORD");
    assert_eq!(h.hasher.verifies(), 1);
    // An empty or missing password too.
    assert_eq!(
        h.sign_in("ada@example.com", "").await.status,
        StatusCode::UNAUTHORIZED
    );
    let missing = h
        .post("/sign-in", &json!({ "email": "ada@example.com" }), &[])
        .await;
    assert_eq!(missing.status, StatusCode::UNAUTHORIZED);
    assert_eq!(h.hasher.verifies(), 3);

    h.hasher.reset();
    let bad_email = h.sign_in("not-an-email", PASSWORD).await;
    assert_eq!(
        (bad_email.status.as_u16(), bad_email.error_code().as_str()),
        (400, "INVALID_EMAIL")
    );
    let no_email = h.post("/sign-in", &json!({}), &[]).await;
    assert_eq!(no_email.error_code(), "INVALID_EMAIL");
    let long = h.sign_in("ada@example.com", &"x".repeat(129)).await;
    assert_eq!(
        (long.status.as_u16(), long.error_code().as_str()),
        (400, "PASSWORD_TOO_LONG")
    );
    let exact = h.sign_in("ada@example.com", &"x".repeat(128)).await;
    assert_eq!(exact.status, StatusCode::UNAUTHORIZED);
    assert_eq!(
        h.hasher.verifies(),
        1,
        "only the 128-character attempt was hashed"
    );

    for body in [
        "not json",
        "null",
        r#"{"email":"ada@example.com","password":123}"#,
    ] {
        let reply = h.post_raw("/sign-in", body.to_owned(), &[]).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(reply.error_code(), "INVALID_BODY");
    }
    let big = h.post_raw("/sign-in", "x".repeat(20 * 1024), &[]).await;
    assert_eq!(big.status, StatusCode::PAYLOAD_TOO_LARGE);
    h.finish().await;
}

#[tokio::test]
async fn unknown_email_no_password_and_wrong_password_are_indistinguishable() {
    let h = Harness::new().await;
    h.sign_up("ada@example.com").await;
    // A user who signed up only through a provider.
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('g1', 'G', 'g@example.com', true)"#,
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('a1', 'sub', 'google', 'g1', now())"#,
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    // A credential account whose password is null.
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('n1', 'N', 'n@example.com', false)"#,
    )
    .execute(&h.db.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('a2', 'n1', 'credential', 'n1', now())"#,
    )
    .execute(&h.db.pool)
    .await
    .unwrap();

    let mut replies = Vec::new();
    for email in [
        "nobody@example.com",
        "g@example.com",
        "n@example.com",
        "ada@example.com",
    ] {
        h.hasher.reset();
        let reply = h.sign_in(email, "synthetic-wrong-password").await;
        assert_eq!(h.hasher.verifies(), 1, "{email}: exactly one verification");
        assert_eq!(h.hasher.hashes(), 0, "{email}");
        assert!(reply.set_cookies().is_empty(), "{email}");
        replies.push(reply);
    }
    let first = &replies[0];
    assert_eq!(first.status, StatusCode::UNAUTHORIZED);
    for other in &replies[1..] {
        assert_eq!(other.status, first.status);
        assert_eq!(other.body, first.body, "byte-identical bodies");
        assert_eq!(other.headers, first.headers, "no distinguishing header");
    }
    assert_eq!(h.session_count().await, 1, "only sign-up's session exists");
    h.finish().await;
}

#[tokio::test]
async fn the_fourth_request_to_one_credential_route_in_ten_seconds_is_429() {
    let h = Harness::new().await;
    h.sign_up("ada@example.com").await;
    h.hasher.reset();
    let ip = [("x-real-ip", "203.0.113.50")];
    let body = json!({ "email": "ada@example.com", "password": "synthetic-wrong-password" });
    let mut statuses = Vec::new();
    for _ in 0..3 {
        statuses.push(h.post("/sign-in", &body, &ip).await.status.as_u16());
    }
    assert_eq!(statuses, [401, 401, 401]);
    assert_eq!(h.hasher.verifies(), 3);

    let refused = h.post("/sign-in", &body, &ip).await;
    assert_eq!(refused.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(refused.error_code(), "RATE_LIMITED");
    // The clock stands at the start of a 10 s window.
    assert_eq!(refused.headers[RETRY_AFTER], "10");
    assert_eq!(h.hasher.verifies(), 3, "no hash was spent on the refusal");
    // Each route has its own window per client (Better Auth keys by path):
    // three sign-ins did not use up this client's sign-up.
    let up = h
        .post(
            "/sign-up",
            &json!({ "name": "B", "email": "b@example.com", "password": PASSWORD }),
            &ip,
        )
        .await;
    assert_eq!(up.status, StatusCode::OK, "{}", up.text());
    // Another client is unaffected, and the window passes with the clock.
    assert_eq!(
        h.post("/sign-in", &body, &[]).await.status,
        StatusCode::UNAUTHORIZED
    );
    h.clock.advance(std::time::Duration::from_secs(10));
    assert_eq!(
        h.post("/sign-in", &body, &ip).await.status,
        StatusCode::UNAUTHORIZED
    );
    h.finish().await;
}

#[tokio::test]
async fn sign_in_never_reuses_a_presented_token() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let body = json!({ "email": "ada@example.com", "password": PASSWORD });

    // An attacker-chosen value: a fresh token comes back, the planted one is nothing.
    let planted = format!("{COOKIE_NAME}={}", "A".repeat(43));
    let reply = h.post("/sign-in", &body, &[("cookie", &planted)]).await;
    assert_eq!(reply.status, StatusCode::OK);
    let token = reply.token().unwrap();
    assert_ne!(token, "A".repeat(43));
    assert_eq!(
        h.get("/session", Some(&planted)).await.result(),
        Value::Null
    );
    assert_ne!(
        h.get("/session", reply.session_cookie().as_deref())
            .await
            .result(),
        Value::Null
    );
    assert_eq!(
        h.session_count().await,
        2,
        "nothing was deleted for an unknown value"
    );

    // A valid prior session is deleted by the sign-in that replaces it.
    let prior = up.session_cookie().unwrap();
    let before = h.session_count().await;
    let reply = h.post("/sign-in", &body, &[("cookie", &prior)]).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_ne!(reply.token(), up.token());
    assert_eq!(h.get("/session", Some(&prior)).await.result(), Value::Null);
    assert_eq!(h.session_count().await, before, "one deleted, one created");
    h.finish().await;
}

#[tokio::test]
async fn a_failed_sign_in_keeps_the_presented_session() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let prior = up.session_cookie().unwrap();
    let wrong = h
        .post(
            "/sign-in",
            &json!({ "email": "ada@example.com", "password": "synthetic-wrong-password" }),
            &[("cookie", &prior)],
        )
        .await;
    assert_eq!(wrong.status, StatusCode::UNAUTHORIZED);
    assert!(wrong.set_cookies().is_empty());
    assert_ne!(h.get("/session", Some(&prior)).await.result(), Value::Null);
    h.finish().await;
}

#[tokio::test]
async fn sign_out_deletes_the_session_and_always_clears_the_cookie() {
    let h = Harness::new().await;
    let up = h.sign_up("ada@example.com").await;
    let cookie = up.session_cookie().unwrap();
    let clear = format!("{COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");

    // Cross-site: refused, and the session survives.
    let evil = h
        .post(
            "/sign-out",
            &json!({}),
            &[("origin", "https://example.invalid"), ("cookie", &cookie)],
        )
        .await;
    assert_eq!(evil.status, StatusCode::FORBIDDEN);
    assert_ne!(h.get("/session", Some(&cookie)).await.result(), Value::Null);

    let out = h
        .post("/sign-out", &json!({}), &[("cookie", &cookie)])
        .await;
    assert_eq!(out.status, StatusCode::OK);
    assert_eq!(out.json(), json!({ "ok": true, "result": {} }));
    assert_eq!(out.set_cookies(), std::slice::from_ref(&clear));
    assert_eq!(h.session_count().await, 0);
    assert_eq!(h.get("/session", Some(&cookie)).await.result(), Value::Null);

    // No session, or one that matches nothing: still 200 and cleared.
    for headers in [
        vec![],
        vec![("cookie", format!("{COOKIE_NAME}={}", "B".repeat(43)))],
    ] {
        let pairs: Vec<(&str, &str)> = headers.iter().map(|(n, v)| (*n, v.as_str())).collect();
        let reply = h.post("/sign-out", &json!({}), &pairs).await;
        assert_eq!(reply.status, StatusCode::OK);
        assert_eq!(reply.set_cookies(), std::slice::from_ref(&clear));
    }
    // The Origin of a same-site referer-only caller is honoured too.
    let referer = h
        .post(
            "/sign-out",
            &json!({}),
            &[("referer", &format!("{ORIGIN}/profile"))],
        )
        .await;
    assert_eq!(referer.status, StatusCode::OK);
    h.finish().await;
}

#[tokio::test]
async fn each_credential_route_counts_its_own_three_requests() {
    let h = Harness::new().await;
    let ip = [("x-real-ip", "203.0.113.51")];
    let sign_up = |n: usize| {
        let body =
            json!({ "name": "N", "email": format!("n{n}@example.com"), "password": PASSWORD });
        let h = &h;
        async move { h.post("/sign-up", &body, &ip).await.status.as_u16() }
    };
    assert_eq!(
        [sign_up(1).await, sign_up(2).await, sign_up(3).await],
        [200, 200, 200]
    );
    assert_eq!(sign_up(4).await, 429);
    // Sign-in from the same client is a different route and still has its three.
    let body = json!({ "email": "n1@example.com", "password": PASSWORD });
    for _ in 0..3 {
        assert_eq!(h.post("/sign-in", &body, &ip).await.status, StatusCode::OK);
    }
    assert_eq!(
        h.post("/sign-in", &body, &ip).await.status,
        StatusCode::TOO_MANY_REQUESTS
    );
    h.finish().await;
}

#[tokio::test]
async fn a_placeholder_address_cannot_be_claimed_by_a_password_sign_up() {
    let h = Harness::new().await;
    for email in [
        "123@twitter.placeholder.invalid",
        "123@Twitter.Placeholder.Invalid",
        "someone@example.invalid",
    ] {
        let reply = h
            .post(
                "/sign-up",
                &json!({ "name": "Squatter", "email": email, "password": PASSWORD }),
                &[],
            )
            .await;
        assert_eq!(
            (reply.status.as_u16(), reply.error_code().as_str()),
            (400, "INVALID_EMAIL"),
            "{email}"
        );
    }
    assert_eq!(user_count(&h).await, 0);
    assert_eq!(h.hasher.hashes(), 0);
    h.finish().await;
}

#[tokio::test]
async fn sign_up_ends_the_presented_session() {
    let h = Harness::new().await;
    let first = h.sign_up("first@example.com").await;
    let prior = first.session_cookie().unwrap();
    // A failed sign-up (taken email) keeps the presented session.
    let taken = h
        .post(
            "/sign-up",
            &json!({ "name": "N", "email": "first@example.com", "password": PASSWORD }),
            &[("cookie", &prior)],
        )
        .await;
    assert_eq!(taken.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_ne!(h.get("/session", Some(&prior)).await.result(), Value::Null);
    // A good one replaces it.
    let reply = h
        .post(
            "/sign-up",
            &json!({ "name": "N", "email": "second@example.com", "password": PASSWORD }),
            &[("cookie", &prior)],
        )
        .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(h.get("/session", Some(&prior)).await.result(), Value::Null);
    assert_eq!(h.session_count().await, 1);
    h.finish().await;
}
