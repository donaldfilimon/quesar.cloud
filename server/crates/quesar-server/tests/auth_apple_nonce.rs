//! Apple still requires its nonce now that the OAuth core makes it
//! provider-specific (X has none).

mod apple_support;
mod common;

use apple_support::Apple;
use axum::http::StatusCode;

#[tokio::test]
async fn an_apple_flow_without_its_nonce_is_not_exchanged() {
    let h = Apple::new().await;
    let started = h.start().await;
    assert!(!started.nonce.is_empty(), "Apple's URL carries a nonce");
    h.issue(&started.nonce);
    let post = h.post_code(&started, None).await;
    assert_eq!(post.status, StatusCode::SEE_OTHER, "{}", post.text());
    sqlx::query("update auth_flows set payload = payload - 'nonce'")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let get = h.follow(&post, &started).await;
    assert_eq!(
        apple_support::location(&get),
        "/login?error=failed",
        "{}",
        get.text()
    );
    assert!(get.session_cookie().is_none());
    assert!(h.idp.requests().is_empty(), "nothing was sent to Apple");
    let users: i64 = sqlx::query_scalar(r#"select count(*) from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(users, 0);
    h.cleanup().await;
}
