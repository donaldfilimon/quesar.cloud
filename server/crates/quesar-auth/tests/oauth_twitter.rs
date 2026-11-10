//! X's authorization URL and Basic client authentication, against the mock
//! provider. No database.

use std::time::Duration;

use quesar_auth::mock_idp::MockIdp;
use quesar_auth::oauth::http::HttpError;
use quesar_auth::oauth::jwks::JwksCache;
use quesar_auth::oauth::provider::{ProviderError, ProviderId};
use quesar_auth::providers::{Deps, twitter};
use quesar_auth::{ClientSecret, OAuthClient, ProviderEndpoints};
use serde_json::json;

const REDIRECT: &str = "https://quesar.cloud/api/auth/callback/twitter";

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

fn client_for(idp: &MockIdp, id: &str, secret: &str) -> OAuthClient {
    OAuthClient {
        client_id: id.to_owned(),
        client_secret: ClientSecret::new(secret),
        endpoints: ProviderEndpoints {
            token: idp.token_url(),
            userinfo: Some(idp.userinfo_url()),
            ..ProviderEndpoints::twitter()
        },
    }
}

async fn exchange(
    client: &OAuthClient,
    allow_http: bool,
) -> Result<quesar_auth::oauth::provider::Identity, ProviderError> {
    let http = http();
    let jwks = JwksCache::new();
    twitter::exchange(
        &Deps {
            http: &http,
            jwks: &jwks,
            allow_http,
        },
        client,
        "the-code",
        "the-verifier",
        REDIRECT,
    )
    .await
}

fn serve(idp: &MockIdp) {
    idp.respond_with_token_body(200, json!({ "access_token": "tok" }).to_string());
    idp.set_userinfo_for(
        "profile_image_url",
        200,
        &json!({ "data": { "id": "77", "name": "N" } }),
    );
}

#[test]
fn the_defaults_are_the_production_endpoints_without_a_query() {
    let endpoints = ProviderEndpoints::twitter();
    assert_eq!(endpoints.authorize, "https://x.com/i/oauth2/authorize");
    assert_eq!(endpoints.token, "https://api.x.com/2/oauth2/token");
    assert_eq!(
        endpoints.userinfo.as_deref(),
        Some("https://api.x.com/2/users/me")
    );
    assert!(endpoints.jwks.is_none());
}

#[test]
fn the_authorize_url_has_state_pkce_and_the_scopes_but_no_nonce() {
    let client = OAuthClient {
        client_id: "cid".into(),
        client_secret: ClientSecret::new("secret"),
        endpoints: ProviderEndpoints::twitter(),
    };
    let url = twitter::authorize_url(&client, REDIRECT, "the-state", "the-challenge").unwrap();
    let url = url::Url::parse(&url).unwrap();
    let pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();
    let want = [
        ("response_type", "code"),
        ("client_id", "cid"),
        ("state", "the-state"),
        ("scope", "users.read tweet.read offline.access users.email"),
        ("redirect_uri", REDIRECT),
        ("code_challenge_method", "S256"),
        ("code_challenge", "the-challenge"),
    ];
    let got: Vec<(&str, &str)> = pairs
        .iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();
    assert_eq!(got, want);
    assert!(!ProviderId::Twitter.uses_nonce());
    assert!(!ProviderId::Twitter.asserts_email());
}

#[tokio::test]
async fn basic_credentials_are_form_encoded_then_base64() {
    // Space, colon, plus, slash and star in the secret: RFC 6749 2.3.1.
    let idp = MockIdp::start().await;
    serve(&idp);
    let client = client_for(&idp, "id with space", "s e:c+r/t*");
    exchange(&client, true).await.unwrap();
    let header = idp.requests_to("/token")[0].authorization.clone().unwrap();
    use base64::Engine;
    let encoded =
        base64::engine::general_purpose::STANDARD.encode("id+with+space:s+e%3Ac%2Br%2Ft*");
    assert_eq!(header, format!("Basic {encoded}"));
}

#[tokio::test]
async fn the_identity_has_the_placeholder_when_the_email_call_fails() {
    let idp = MockIdp::start().await;
    serve(&idp);
    idp.set_userinfo_for("confirmed_email", 500, &json!({}));
    let identity = exchange(&client_for(&idp, "i", "s"), true).await.unwrap();
    assert_eq!(identity.provider, ProviderId::Twitter);
    assert_eq!(identity.subject, "77");
    assert_eq!(
        identity.email.as_deref(),
        Some("77@twitter.placeholder.invalid")
    );
    assert!(!identity.email_verified);
    assert_eq!(identity.name.as_deref(), Some("N"));
}

#[tokio::test]
async fn a_confirmed_email_is_verified() {
    let idp = MockIdp::start().await;
    serve(&idp);
    idp.set_userinfo_for(
        "confirmed_email",
        200,
        &json!({ "data": { "confirmed_email": "a@b.example" } }),
    );
    let identity = exchange(&client_for(&idp, "i", "s"), true).await.unwrap();
    assert_eq!(identity.email.as_deref(), Some("a@b.example"));
    assert!(identity.email_verified);
}

#[tokio::test]
async fn an_invalid_confirmed_email_falls_back_to_the_unverified_placeholder() {
    for bad in ["not an email", "a@b", "x@y@z.example", "é@example.com"] {
        let idp = MockIdp::start().await;
        serve(&idp);
        idp.set_userinfo_for(
            "confirmed_email",
            200,
            &json!({ "data": { "confirmed_email": bad } }),
        );
        let identity = exchange(&client_for(&idp, "i", "s"), true).await.unwrap();
        assert_eq!(
            identity.email.as_deref(),
            Some("77@twitter.placeholder.invalid"),
            "{bad}"
        );
        assert!(!identity.email_verified, "{bad}");
    }
}

#[tokio::test]
async fn an_id_with_letters_or_over_twenty_digits_is_refused() {
    for bad in ["AbC", "12a", "123456789012345678901"] {
        let idp = MockIdp::start().await;
        idp.respond_with_token_body(200, json!({ "access_token": "tok" }).to_string());
        idp.set_userinfo_for(
            "profile_image_url",
            200,
            &json!({ "data": { "id": bad, "name": "N" } }),
        );
        let error = exchange(&client_for(&idp, "i", "s"), true)
            .await
            .unwrap_err();
        assert_eq!(error, ProviderError::Http(HttpError::Malformed), "{bad}");
    }
}

#[tokio::test]
async fn https_is_required_unless_allowed() {
    let idp = MockIdp::start().await;
    serve(&idp);
    let error = exchange(&client_for(&idp, "i", "s"), false)
        .await
        .unwrap_err();
    assert_eq!(error, ProviderError::Http(HttpError::Insecure));
    assert!(idp.requests().is_empty());
}

#[tokio::test]
async fn a_profile_without_an_id_is_refused() {
    let idp = MockIdp::start().await;
    idp.respond_with_token_body(200, json!({ "access_token": "tok" }).to_string());
    idp.set_userinfo_for(
        "profile_image_url",
        200,
        &json!({ "data": { "name": "N" } }),
    );
    let error = exchange(&client_for(&idp, "i", "s"), true)
        .await
        .unwrap_err();
    assert_eq!(error, ProviderError::Http(HttpError::Malformed));
}
