//! Apple's authorization URL and code exchange, against the mock provider.
//! No database.

use std::time::Duration;

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use quesar_auth::mock_idp::{MockIdp, Signing};
use quesar_auth::oauth::id_token::IdTokenError;
use quesar_auth::oauth::jwks::JwksCache;
use quesar_auth::oauth::pkce;
use quesar_auth::oauth::provider::{Identity, ProviderError, ProviderId};
use quesar_auth::providers::Deps;
use quesar_auth::providers::apple::{self, AppleSecrets, posted_name};
use quesar_auth::{AppleConfig, ClientSecret, ProviderEndpoints};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use time::macros::datetime;

const NOW: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
const REDIRECT: &str = "https://quesar.cloud/api/auth/callback/apple";
const NONCE: &str = "the-nonce";

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

fn config_for(idp: &MockIdp) -> AppleConfig {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../contract/apple-secret-vectors.json"
    );
    let file: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let key = &file["key"];
    AppleConfig {
        client_id: key["client_id"].as_str().unwrap().to_owned(),
        team_id: key["team_id"].as_str().unwrap().to_owned(),
        key_id: key["key_id"].as_str().unwrap().to_owned(),
        private_key: ClientSecret::new(key["private_key_pem"].as_str().unwrap()),
        endpoints: ProviderEndpoints {
            authorize: "https://appleid.apple.com/auth/authorize".to_owned(),
            token: idp.token_url(),
            jwks: Some(idp.jwks_url()),
            userinfo: None,
        },
    }
}

fn claims(config: &AppleConfig) -> Value {
    let now = NOW.unix_timestamp();
    json!({
        "iss": "https://appleid.apple.com", "aud": config.client_id, "sub": "apple-sub-1",
        "iat": now, "exp": now + 3600, "nonce": NONCE,
        "email": "ada@example.com", "email_verified": "true",
    })
}

async fn exchange(config: &AppleConfig, name: Option<&str>) -> Result<Identity, ProviderError> {
    let http = http();
    let jwks = JwksCache::new();
    let secret = AppleSecrets::new(config, NOW).unwrap().current(config, NOW);
    apple::exchange(
        &Deps {
            http: &http,
            jwks: &jwks,
            allow_http: true,
        },
        config,
        &secret,
        "the-code",
        "the-verifier",
        REDIRECT,
        NONCE,
        name,
        NOW,
    )
    .await
}

#[test]
fn the_authorization_url_carries_every_parameter() {
    let verifier = pkce::Verifier::generate();
    let config = AppleConfig {
        client_id: "cloud.quesar.test".to_owned(),
        team_id: "T".to_owned(),
        key_id: "K".to_owned(),
        private_key: ClientSecret::new("unused"),
        endpoints: ProviderEndpoints::apple(),
    };
    let url =
        apple::authorize_url(&config, REDIRECT, "the-state", &verifier.challenge(), NONCE).unwrap();
    let url = url::Url::parse(&url).unwrap();
    assert_eq!(
        url.origin().ascii_serialization(),
        "https://appleid.apple.com"
    );
    assert_eq!(url.path(), "/auth/authorize");
    let get = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };
    assert_eq!(get("response_type").as_deref(), Some("code id_token"));
    assert_eq!(get("client_id").as_deref(), Some("cloud.quesar.test"));
    assert_eq!(get("redirect_uri").as_deref(), Some(REDIRECT));
    assert_eq!(get("scope").as_deref(), Some("email name"));
    assert_eq!(get("response_mode").as_deref(), Some("form_post"));
    assert_eq!(get("state").as_deref(), Some("the-state"));
    assert_eq!(get("nonce").as_deref(), Some(NONCE));
    assert_eq!(get("code_challenge_method").as_deref(), Some("S256"));
    assert_eq!(get("code_challenge"), Some(verifier.challenge()));
}

#[tokio::test]
async fn the_code_is_exchanged_with_the_minted_secret_and_the_verifier() {
    let idp = MockIdp::start().await;
    let config = config_for(&idp);
    idp.respond_with_id_token(&claims(&config), Signing::Primary);
    let identity = exchange(&config, None).await.unwrap();
    assert_eq!(identity.provider, ProviderId::Apple);
    assert_eq!(identity.subject, "apple-sub-1");
    assert_eq!(identity.email.as_deref(), Some("ada@example.com"));
    assert!(identity.email_verified, "the string \"true\" counts");
    assert_eq!(identity.name, None);

    let sent = idp.requests_to("/token");
    assert_eq!(sent.len(), 1);
    let field = |name: &str| sent[0].field(name).map(str::to_owned);
    assert_eq!(field("grant_type").as_deref(), Some("authorization_code"));
    assert_eq!(field("code").as_deref(), Some("the-code"));
    assert_eq!(field("code_verifier").as_deref(), Some("the-verifier"));
    assert_eq!(field("redirect_uri").as_deref(), Some(REDIRECT));
    assert_eq!(field("client_id"), Some(config.client_id.clone()));
    // The secret is the JWT minted from the key, not the key.
    let secret = field("client_secret").unwrap();
    assert_eq!(secret.split('.').count(), 3);
    let payload: Value = serde_json::from_slice(
        &URL_SAFE_NO_PAD
            .decode(secret.split('.').nth(1).unwrap())
            .unwrap(),
    )
    .unwrap();
    assert_eq!(payload["sub"], json!(config.client_id));
    assert_eq!(payload["aud"], json!("https://appleid.apple.com"));
    assert_eq!(payload["iat"], json!(NOW.unix_timestamp()));
    assert!(sent[0].authorization.is_none());
}

#[tokio::test]
async fn email_verified_accepts_true_and_the_string_true_only() {
    let idp = MockIdp::start().await;
    let config = config_for(&idp);
    for (value, verified) in [
        (json!(true), true),
        (json!("true"), true),
        (json!(false), false),
        (json!("false"), false),
        (json!("True"), false),
        (json!(1), false),
        (json!("yes"), false),
    ] {
        let mut token = claims(&config);
        token["email_verified"] = value.clone();
        idp.respond_with_id_token(&token, Signing::Primary);
        let identity = exchange(&config, None).await.unwrap();
        assert_eq!(identity.email_verified, verified, "{value}");
    }
    let mut token = claims(&config);
    token.as_object_mut().unwrap().remove("email_verified");
    idp.respond_with_id_token(&token, Signing::Primary);
    assert!(!exchange(&config, None).await.unwrap().email_verified);
}

#[tokio::test]
async fn the_nonce_is_compared_exact_or_as_its_sha256_hex() {
    let idp = MockIdp::start().await;
    let config = config_for(&idp);
    let hashed: String = Sha256::digest(NONCE.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    for (nonce, ok) in [
        (json!(NONCE), true),
        (json!(hashed), true),
        (json!(hashed.to_uppercase()), false),
        (json!("another-nonce"), false),
        (json!(""), false),
        (json!(7), false),
        (Value::Null, false),
    ] {
        let mut token = claims(&config);
        token["nonce"] = nonce.clone();
        idp.respond_with_id_token(&token, Signing::Primary);
        let result = exchange(&config, None).await;
        match (ok, result) {
            (true, Ok(_)) => {}
            (false, Err(ProviderError::IdToken(IdTokenError::Nonce | IdTokenError::Malformed))) => {
            }
            (_, other) => panic!("nonce {nonce}: unexpected {other:?}"),
        }
    }
    let mut token = claims(&config);
    token.as_object_mut().unwrap().remove("nonce");
    idp.respond_with_id_token(&token, Signing::Primary);
    assert!(matches!(
        exchange(&config, None).await,
        Err(ProviderError::IdToken(IdTokenError::Nonce))
    ));
}

#[tokio::test]
async fn issuer_audience_and_signature_are_checked() {
    let idp = MockIdp::start().await;
    let config = config_for(&idp);
    let mut wrong_issuer = claims(&config);
    wrong_issuer["iss"] = json!("https://accounts.google.com");
    let mut wrong_audience = claims(&config);
    wrong_audience["aud"] = json!("someone.else");
    for (token, signing, expected) in [
        (wrong_issuer, Signing::Primary, IdTokenError::Issuer),
        (wrong_audience, Signing::Primary, IdTokenError::Audience),
        (
            claims(&config),
            Signing::ForgedAsPrimary,
            IdTokenError::Signature,
        ),
    ] {
        idp.respond_with_id_token(&token, signing);
        match exchange(&config, None).await {
            Err(ProviderError::IdToken(error)) => assert_eq!(error, expected),
            other => panic!("expected {expected:?}, got {other:?}"),
        }
    }
}

#[tokio::test]
async fn the_name_is_the_posted_one_else_the_tokens() {
    let idp = MockIdp::start().await;
    let config = config_for(&idp);
    let mut token = claims(&config);
    token["name"] = json!("Token Name");
    idp.respond_with_id_token(&token, Signing::Primary);
    assert_eq!(
        exchange(&config, Some("Ada Lovelace"))
            .await
            .unwrap()
            .name
            .as_deref(),
        Some("Ada Lovelace")
    );
    assert_eq!(
        exchange(&config, None).await.unwrap().name.as_deref(),
        Some("Token Name")
    );
}

#[test]
fn the_posted_user_field_gives_first_and_last_name_joined_and_trimmed() {
    let name = |raw: &str| posted_name(raw);
    assert_eq!(
        name(r#"{"name":{"firstName":"Ada","lastName":"Lovelace"},"email":"a@b.c"}"#).as_deref(),
        Some("Ada Lovelace")
    );
    assert_eq!(
        name(r#"{"name":{"firstName":"Ada"}}"#).as_deref(),
        Some("Ada")
    );
    assert_eq!(
        name(r#"{"name":{"lastName":"  Lovelace "}}"#).as_deref(),
        Some("Lovelace")
    );
    for none in [
        r#"{"name":{"firstName":"","lastName":" "}}"#,
        r#"{"name":{}}"#,
        r#"{"email":"a@b.c"}"#,
        r#"{"name":"Ada"}"#,
        r#"{"name":{"firstName":7}}"#,
        "not json",
        "",
        "null",
        "[]",
    ] {
        assert_eq!(name(none), None, "{none}");
    }
}
