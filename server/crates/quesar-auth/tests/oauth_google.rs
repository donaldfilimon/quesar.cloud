//! Google's authorization URL and code exchange, against the mock provider.
//! No database.

use std::time::Duration;

use quesar_auth::mock_idp::{MockIdp, Signing};
use quesar_auth::oauth::http::{HttpError, RESPONSE_CAP};
use quesar_auth::oauth::id_token::IdTokenError;
use quesar_auth::oauth::jwks::JwksCache;
use quesar_auth::oauth::pkce;
use quesar_auth::oauth::provider::{ProviderError, ProviderId};
use quesar_auth::providers::{Deps, google};
use quesar_auth::{ClientSecret, OAuthClient, ProviderEndpoints};
use serde_json::{Value, json};
use time::OffsetDateTime;
use time::macros::datetime;

const NOW: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
const CLIENT_ID: &str = "client-id.apps.example";
const REDIRECT: &str = "https://quesar.cloud/api/auth/callback/google";

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

fn client_for(idp: &MockIdp) -> OAuthClient {
    OAuthClient {
        client_id: CLIENT_ID.to_owned(),
        client_secret: ClientSecret::new("synthetic-client-secret"),
        endpoints: ProviderEndpoints {
            authorize: "https://accounts.google.com/o/oauth2/v2/auth".to_owned(),
            token: idp.token_url(),
            jwks: Some(idp.jwks_url()),
            userinfo: None,
        },
    }
}

fn claims() -> Value {
    let now = NOW.unix_timestamp();
    json!({
        "iss": "https://accounts.google.com", "aud": CLIENT_ID, "sub": "sub-9",
        "iat": now, "exp": now + 3600, "nonce": "the-nonce",
        "email": "Ada@Example.com", "email_verified": true, "name": "Ada", "picture": "https://example.com/a.png",
    })
}

async fn exchange(
    idp: &MockIdp,
    allow_http: bool,
) -> Result<quesar_auth::oauth::provider::Identity, ProviderError> {
    let http = http();
    let jwks = JwksCache::new();
    google::exchange(
        &Deps {
            http: &http,
            jwks: &jwks,
            allow_http,
        },
        &client_for(idp),
        "the-code",
        "the-verifier",
        REDIRECT,
        "the-nonce",
        NOW,
    )
    .await
}

#[test]
fn the_authorization_url_carries_every_parameter() {
    let verifier = pkce::Verifier::generate();
    let client = OAuthClient {
        client_id: CLIENT_ID.to_owned(),
        client_secret: ClientSecret::new("s"),
        endpoints: ProviderEndpoints::google(),
    };
    let url = google::authorize_url(
        &client,
        REDIRECT,
        "the-state",
        &verifier.challenge(),
        "the-nonce",
    )
    .unwrap();
    let url = url::Url::parse(&url).unwrap();
    assert_eq!(
        url.origin().ascii_serialization(),
        "https://accounts.google.com"
    );
    assert_eq!(url.path(), "/o/oauth2/v2/auth");
    let pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();
    let get = |name: &str| {
        pairs
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.as_str())
    };
    assert_eq!(get("response_type"), Some("code"));
    assert_eq!(get("client_id"), Some(CLIENT_ID));
    assert_eq!(get("redirect_uri"), Some(REDIRECT));
    assert_eq!(get("scope"), Some("email profile openid"));
    assert_eq!(get("state"), Some("the-state"));
    assert_eq!(get("code_challenge"), Some(verifier.challenge().as_str()));
    assert_eq!(get("code_challenge_method"), Some("S256"));
    assert_eq!(get("nonce"), Some("the-nonce"));
    assert_eq!(get("prompt"), Some("select_account"));
    assert_eq!(get("include_granted_scopes"), Some("true"));
    assert_eq!(pairs.len(), 10);
    assert!(!url.as_str().contains("client_secret"));
}

#[tokio::test]
async fn the_exchange_posts_the_code_and_verifier_and_returns_the_identity() {
    let idp = MockIdp::start().await;
    idp.respond_with_id_token(&claims(), Signing::Primary);
    let identity = exchange(&idp, true).await.unwrap();
    assert_eq!(identity.provider, ProviderId::Google);
    assert_eq!(identity.subject, "sub-9");
    assert_eq!(identity.email.as_deref(), Some("Ada@Example.com"));
    assert!(identity.email_verified);
    assert_eq!(identity.name.as_deref(), Some("Ada"));
    assert_eq!(identity.image.as_deref(), Some("https://example.com/a.png"));

    let tokens = idp.requests_to("/token");
    assert_eq!(tokens.len(), 1);
    let request = &tokens[0];
    assert_eq!(request.method, "POST");
    assert_eq!(request.field("grant_type"), Some("authorization_code"));
    assert_eq!(request.field("code"), Some("the-code"));
    assert_eq!(request.field("code_verifier"), Some("the-verifier"));
    assert_eq!(request.field("redirect_uri"), Some(REDIRECT));
    assert_eq!(request.field("client_id"), Some(CLIENT_ID));
    assert_eq!(
        request.field("client_secret"),
        Some("synthetic-client-secret")
    );
    assert_eq!(request.authorization, None);
    assert_eq!(request.query, "", "secrets are in the body, not the URL");
}

#[tokio::test]
async fn token_endpoint_failures_are_refused_without_provider_text() {
    let idp = MockIdp::start().await;
    // The default answer is 400.
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::Http(HttpError::Status(400))
    );
    idp.respond_with_token_body(200, "{\"access_token\":\"a\"}".to_owned());
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::NoIdToken
    );
    idp.respond_with_token_body(200, "not json".to_owned());
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::Http(HttpError::Malformed)
    );
    idp.respond_with_token_body(500, "boom".to_owned());
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::Http(HttpError::Status(500))
    );
    let error = exchange(&idp, true).await.unwrap_err().to_string();
    assert!(
        !error.contains("boom") && !error.contains("127.0.0.1"),
        "{error}"
    );
}

#[tokio::test]
async fn redirects_are_refused_and_not_followed() {
    let idp = MockIdp::start().await;
    idp.redirect_token_to(&idp.jwks_url());
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::Http(HttpError::Status(302))
    );
    assert_eq!(
        idp.requests_to("/jwks").len(),
        0,
        "the redirect target was never fetched"
    );
}

#[tokio::test]
async fn responses_over_the_cap_are_refused() {
    let idp = MockIdp::start().await;
    idp.respond_with_token_body(
        200,
        format!("{{\"id_token\":\"{}\"}}", "x".repeat(RESPONSE_CAP)),
    );
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::Http(HttpError::TooLarge)
    );
}

#[tokio::test]
async fn plain_http_endpoints_are_refused_when_not_allowed() {
    let idp = MockIdp::start().await;
    idp.respond_with_id_token(&claims(), Signing::Primary);
    assert_eq!(
        exchange(&idp, false).await.unwrap_err(),
        ProviderError::Http(HttpError::Insecure)
    );
    assert!(
        idp.requests().is_empty(),
        "nothing was sent, no secret left the process"
    );
}

#[tokio::test]
async fn a_bad_id_token_is_an_error_not_an_identity() {
    let idp = MockIdp::start().await;
    let wrong_nonce = {
        let mut claims = claims();
        claims["nonce"] = json!("other");
        claims
    };
    idp.respond_with_id_token(&wrong_nonce, Signing::Primary);
    assert_eq!(
        exchange(&idp, true).await.unwrap_err(),
        ProviderError::IdToken(IdTokenError::Nonce)
    );
}
