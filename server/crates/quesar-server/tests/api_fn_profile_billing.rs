//! Profile and hosted checkout through the production function mount.

mod common;

use axum::http::{Method, StatusCode};
use common::{Harness, NoDatabase, Reply, T0};
use quesar_services::rate_limit::Bucket;
use serde_json::{Value, json};
use time::Duration;

const PROFILE: &str = "/api/fn/profile.getProfile";
const PLANS: &str = "/api/fn/billing.getBillingPlans";
const CHECKOUT: &str = "/api/fn/billing.createCheckout";

async fn call(h: &Harness, path: &str, cookie: &str, body: &str) -> Reply {
    h.request(Method::POST, path, body, &[("cookie", cookie)])
        .await
}

#[tokio::test]
async fn profile_projects_only_the_callers_fields_and_distinct_providers_in_order() {
    let h = Harness::new().await;
    let first = h.sign_up("profile-password@example.test").await;
    let second = h.sign_up("profile-linked@example.test").await;
    let linked_id = second.result()["user"]["id"].as_str().unwrap().to_owned();
    sqlx::query(r#"update "user" set name = 'Linked User', "emailVerified" = true, image = 'https://example.test/avatar' where id = $1"#)
        .bind(&linked_id).execute(&h.db.pool).await.unwrap();
    for (id, provider, seconds) in [("b", "apple", 1), ("a", "google", 1), ("c", "google", 2)] {
        sqlx::query(r#"insert into "account" (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "createdAt", "updatedAt") values ($1,$1,$2,$3,'fixture-access','fixture-refresh',$4,$4)"#)
            .bind(id).bind(provider).bind(&linked_id).bind(T0 + Duration::seconds(seconds))
            .execute(&h.db.pool).await.unwrap();
    }
    let reply = call(
        &h,
        PROFILE,
        &first.session_cookie().unwrap(),
        &json!({"userId": linked_id}).to_string(),
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.headers["cache-control"], "no-store");
    assert_eq!(
        reply.json(),
        json!({"ok": true, "result": {
            "name": "Synthetic Signup", "email": "profile-password@example.test", "image": null,
            "emailVerified": false, "providers": ["credential"]
        }})
    );
    let linked = call(
        &h,
        PROFILE,
        &second.session_cookie().unwrap(),
        "ignored input",
    )
    .await;
    assert_eq!(
        linked.json(),
        json!({"ok": true, "result": {
            "name": "Linked User", "email": "profile-linked@example.test", "image": "https://example.test/avatar",
            "emailVerified": true, "providers": ["credential", "google", "apple"]
        }})
    );
    h.finish().await;
}

#[tokio::test]
async fn checkout_uses_each_sessions_identity_and_rejects_invalid_inputs() {
    let h = Harness::with(&[
        (
            "STRIPE_PAYMENT_LINK",
            "\u{feff}https://checkout.example.test/link?source=profile",
        ),
        ("BILLING_PROVIDER", "\u{0085}stripe\u{0085}"),
    ])
    .await;
    let first = h.sign_up("checkout+owner@example.test").await;
    let second = h.sign_up("checkout+other@example.test").await;
    let cookie = first.session_cookie().unwrap();
    let plans = call(&h, PLANS, &cookie, "ignored input").await;
    assert_eq!(plans.status, StatusCode::OK);
    let vectors: Value =
        serde_json::from_str(include_str!("../../../contract/signed-in-vectors.json")).unwrap();
    assert_eq!(
        plans.result(),
        json!({"configured": true, "provider": "\u{0085}stripe\u{0085}", "plans": vectors["billing"]["plans"]})
    );
    for (signup, email) in [
        (&first, "checkout%2Bowner%40example.test"),
        (&second, "checkout%2Bother%40example.test"),
    ] {
        let user_id = signup.result()["user"]["id"].as_str().unwrap().to_owned();
        let reply = call(
            &h,
            CHECKOUT,
            &signup.session_cookie().unwrap(),
            r#"{"planId":"pilot","email":"spoof@example.test","userId":"spoof","user_id":"spoof"}"#,
        )
        .await;
        assert_eq!(reply.status, StatusCode::OK);
        assert_eq!(
            reply.json(),
            json!({"ok": true, "result": {"ok": true,
                "url": format!("https://checkout.example.test/link?source=profile&prefilled_email={email}&client_reference_id={user_id}")
            }})
        );
    }
    for body in [
        "{",
        "null",
        "{}",
        r#"["pilot"]"#,
        r#"{"planId":1}"#,
        r#"{"planId":null}"#,
    ] {
        let reply = call(&h, CHECKOUT, &cookie, body).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{}", reply.text());
        assert_eq!(reply.error_code(), "INVALID_BODY");
    }
    for plan in [
        "".to_owned(),
        " pilot ".to_owned(),
        "constructor".to_owned(),
        "😀".repeat(32),
    ] {
        let reply = call(&h, CHECKOUT, &cookie, &json!({"planId": plan}).to_string()).await;
        assert_eq!(reply.status, StatusCode::OK);
        assert_eq!(
            reply.json(),
            json!({"ok": true, "result": {"ok": false, "error": "Unknown plan"}})
        );
    }
    let reply = call(
        &h,
        CHECKOUT,
        &cookie,
        &json!({"planId": format!("{}x", "😀".repeat(32))}).to_string(),
    )
    .await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(reply.error_code(), "PLAN_ID_TOO_LONG");
    h.finish().await;
}

#[tokio::test]
async fn checkout_without_configuration_refuses_each_plan_in_the_expected_order() {
    let h = Harness::new().await;
    let cookie = h
        .sign_up("billing-unconfigured@example.test")
        .await
        .session_cookie()
        .unwrap();
    let plans = call(&h, PLANS, &cookie, "").await;
    assert_eq!(
        plans.result(),
        json!({"configured": false, "provider": "manual", "reason": "unconfigured"})
    );
    for (plan, result) in [
        ("unknown", json!({"ok": false, "error": "Unknown plan"})),
        (
            "platform",
            json!({"ok": false, "error": "This plan is priced individually and has no self-serve checkout.", "nextStep": "Contact sales to scope a Platform engagement."}),
        ),
        (
            "pilot",
            json!({"ok": false, "error": "Billing checkout is not configured yet.", "nextStep": "Set STRIPE_PAYMENT_LINK to enable self-serve checkout."}),
        ),
    ] {
        let reply = call(&h, CHECKOUT, &cookie, &json!({"planId": plan}).to_string()).await;
        assert_eq!(reply.status, StatusCode::OK);
        assert_eq!(reply.json(), json!({"ok": true, "result": result}));
    }
    h.finish().await;
}

#[tokio::test]
async fn all_three_functions_require_post_same_origin_database_and_session() {
    let h = Harness::new().await;
    let disabled = Harness::with(&[("VITE_AUTH_ENABLED", "false")]).await;
    let no_database = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    let signup = h.sign_up("limited-profile@example.test").await;
    let cookie = signup.session_cookie().unwrap();
    assert_eq!(call(&h, PLANS, &cookie, "").await.status, StatusCode::OK);
    let bucket = Bucket::AuthGeneral;
    sqlx::query("update rate_limits set count = $3 where bucket = $1 and subject = $2")
        .bind(bucket.name())
        .bind(signup.result()["user"]["id"].as_str().unwrap())
        .bind(i32::try_from(bucket.limit().max).unwrap())
        .execute(&h.db.pool)
        .await
        .unwrap();
    for path in [PROFILE, PLANS, CHECKOUT] {
        let reply = h.request(Method::GET, path, "", &[]).await;
        assert_eq!(reply.status, StatusCode::METHOD_NOT_ALLOWED, "{path}");
        let reply = h
            .request(
                Method::POST,
                path,
                "{",
                &[("origin", "https://other.example.test")],
            )
            .await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN, "{path}");
        assert_eq!(reply.error_code(), "CROSS_SITE_REQUEST");
        for app in [&h, &disabled] {
            let reply = app.request(Method::POST, path, "{", &[]).await;
            assert_eq!(reply.status, StatusCode::UNAUTHORIZED, "{path}");
            assert_eq!(reply.error_code(), "UNAUTHORIZED");
        }
        let reply = no_database.request(Method::POST, path, "{", &[]).await;
        assert_eq!(reply.status, StatusCode::SERVICE_UNAVAILABLE, "{path}");
        assert_eq!(reply.error_code(), "AUTH_UNAVAILABLE");
        let reply = call(&h, path, &cookie, "{").await;
        assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS, "{path}");
        assert_eq!(reply.headers["retry-after"], "10");
    }
    h.finish().await;
    disabled.finish().await;
}
