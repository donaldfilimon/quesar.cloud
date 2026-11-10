//! An X-created user cannot be taken over by Apple sign-in (see `link.rs`).

mod apple_support;
mod common;

use apple_support::{Apple, BINDING_COOKIE, EMAIL, location};
use serde_json::json;

#[tokio::test]
async fn apple_cannot_link_into_a_user_x_created_first() {
    let h = Apple::with(&[
        ("TWITTER_CLIENT_ID", "x-id"),
        ("TWITTER_CLIENT_SECRET", "x-secret"),
    ])
    .await;

    // X signs in first with a confirmed email.
    let reply = h.post_json("/oauth/twitter/start", &json!({})).await;
    assert_eq!(reply.status, 200, "{}", reply.text());
    let url = url::Url::parse(reply.result()["url"].as_str().unwrap()).unwrap();
    let state = url
        .query_pairs()
        .find(|(k, _)| k == "state")
        .unwrap()
        .1
        .into_owned();
    let binding = reply
        .set_cookies()
        .into_iter()
        .find(|c| c.starts_with(BINDING_COOKIE))
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_owned();
    h.idp
        .respond_with_token_body(200, json!({ "access_token": "mock-x-token" }).to_string());
    h.idp.set_userinfo_for(
        "profile_image_url",
        200,
        &json!({ "data": { "id": "2244994945", "name": "Ada on X" } }),
    );
    h.idp.set_userinfo_for(
        "confirmed_email",
        200,
        &json!({ "data": { "confirmed_email": EMAIL } }),
    );
    let done = h
        .get_callback_on("twitter", &format!("code=c&state={state}"), Some(&binding))
        .await;
    assert_eq!(location(&done), "/console", "{}", done.text());
    let verified: bool = sqlx::query_scalar(r#"select "emailVerified" from "user""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert!(!verified);

    // The owner then signs in with Apple, verified email, same address.
    let started = h.start().await;
    h.issue(&started.nonce);
    let post = h.post_code(&started, None).await;
    let get = h.follow(&post, &started).await;
    assert_eq!(location(&get), "/login?error=account_not_linked");
    assert!(get.session_cookie().is_none());
    assert_eq!(h.count(r#""user""#).await, 1);
    let providers: Vec<String> = sqlx::query_scalar(r#"select "providerId" from "account""#)
        .fetch_all(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(providers, ["twitter"]);
    assert_eq!(h.count("oauth_email_verifications").await, 0);
    h.cleanup().await;
}
