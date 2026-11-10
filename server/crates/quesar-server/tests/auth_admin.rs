//! Who counts as an administrator, end to end: users made by the real sign-in
//! paths (mock Google, email/password) and then judged from the database.

mod common;
mod oauth_support;

use axum::http::StatusCode;
use common::PASSWORD;
use oauth_support::{EMAIL, OAuth};
use quesar_auth::admin::{AdminDecision, admin_decision_for};
use quesar_auth::config::AdminEmails;
use serde_json::json;

async fn user_id(h: &OAuth, email: &str) -> String {
    sqlx::query_scalar(r#"select id from "user" where email = $1"#)
        .bind(email)
        .fetch_one(&h.db.pool)
        .await
        .unwrap()
}

async fn decision(h: &OAuth, email: &str, allow: &AdminEmails) -> AdminDecision {
    let id = user_id(h, email).await;
    admin_decision_for(&h.db.pool, &id, allow).await.unwrap()
}

#[tokio::test]
async fn a_google_user_on_the_allowlist_is_admin_and_a_deleted_verification_revokes_it() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    let reply = h.finish(&started).await;
    assert_eq!(reply.status, StatusCode::SEE_OTHER, "{}", reply.text());

    // ADMIN_EMAILS is parsed the way the server parses it: case and spacing are ignored.
    let allow = AdminEmails::parse(&format!(" Other@Example.com, {} ", EMAIL.to_uppercase()));
    assert_eq!(decision(&h, EMAIL, &allow).await, AdminDecision::Admin);

    // Not on the list, and an empty list.
    let elsewhere = AdminEmails::parse("someone@example.com");
    assert_eq!(
        decision(&h, EMAIL, &elsewhere).await,
        AdminDecision::NotAllowlisted
    );
    assert_eq!(
        decision(&h, EMAIL, &AdminEmails::default()).await,
        AdminDecision::NoAllowlist
    );

    // The verification row is the evidence: without it the same user is refused.
    let deleted = sqlx::query("delete from oauth_email_verifications")
        .execute(&h.db.pool)
        .await
        .unwrap()
        .rows_affected();
    assert_eq!(deleted, 1);
    assert_eq!(
        decision(&h, EMAIL, &allow).await,
        AdminDecision::UnverifiedIdentity
    );
    h.cleanup().await;
}

#[tokio::test]
async fn an_email_password_user_on_the_allowlist_is_not_admin() {
    let h = OAuth::new().await;
    let signed_up = h
        .post(
            "/sign-up",
            &json!({ "name": "Ada Local", "email": EMAIL, "password": PASSWORD }),
            &[],
        )
        .await;
    assert_eq!(signed_up.status, StatusCode::OK, "{}", signed_up.text());

    let allow = AdminEmails::parse(EMAIL);
    assert_eq!(
        decision(&h, EMAIL, &allow).await,
        AdminDecision::UnverifiedIdentity
    );

    // Even with emailVerified forced on, which nothing in the app does.
    sqlx::query(r#"update "user" set "emailVerified" = true"#)
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(
        decision(&h, EMAIL, &allow).await,
        AdminDecision::UnverifiedIdentity
    );
    h.cleanup().await;
}

#[tokio::test]
async fn a_verification_for_another_email_does_not_make_the_user_admin() {
    let h = OAuth::new().await;
    let started = h.start(&json!({})).await;
    h.issue(&started.nonce);
    h.finish(&started).await;
    sqlx::query("update oauth_email_verifications set email = 'other@example.com'")
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(
        decision(&h, EMAIL, &AdminEmails::parse(EMAIL)).await,
        AdminDecision::UnverifiedIdentity
    );
    h.cleanup().await;
}

#[tokio::test]
async fn a_missing_user_is_not_allowlisted() {
    let h = OAuth::new().await;
    let got = admin_decision_for(&h.db.pool, "no-such-user", &AdminEmails::parse(EMAIL))
        .await
        .unwrap();
    assert_eq!(got, AdminDecision::NotAllowlisted);
    h.cleanup().await;
}
