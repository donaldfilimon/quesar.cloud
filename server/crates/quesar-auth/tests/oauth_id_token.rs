//! ID-token verification and the JWKS cache, against the in-process mock
//! identity provider. No database. Time is a plain value passed in.

use std::time::Duration;

use quesar_auth::mock_idp::{MockIdp, Signing, sign};
use quesar_auth::oauth::http::HttpError;
use quesar_auth::oauth::id_token::{self, Expect, IdTokenError, KeySource};
use quesar_auth::oauth::jwks::{JWKS_REFETCH_MIN, JWKS_TTL, JwksCache, JwksError};
use serde_json::{Value, json};
use time::OffsetDateTime;
use time::macros::datetime;

const NOW: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
const AUD: &str = "client-id.apps.example";
const NONCE: &str = "expected-nonce-value";

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

fn claims() -> Value {
    let now = NOW.unix_timestamp();
    json!({
        "iss": "https://accounts.google.com",
        "aud": AUD,
        "sub": "sub-1",
        "iat": now,
        "exp": now + 3600,
        "nonce": NONCE,
        "email": "ada@example.com",
        "email_verified": true,
        "name": "Ada Lovelace",
        "picture": "https://example.com/ada.png",
    })
}

struct Rig {
    idp: MockIdp,
    cache: JwksCache,
    http: reqwest::Client,
}

impl Rig {
    async fn new() -> Self {
        Self {
            idp: MockIdp::start().await,
            cache: JwksCache::new(),
            http: client(),
        }
    }

    async fn verify_at(
        &self,
        token: &str,
        at: OffsetDateTime,
    ) -> Result<id_token::Claims, IdTokenError> {
        let url = self.idp.jwks_url();
        id_token::verify(
            token,
            &Expect {
                issuers: &["https://accounts.google.com", "accounts.google.com"],
                audience: AUD,
                nonce: Some(NONCE),
            },
            &KeySource {
                cache: &self.cache,
                http: &self.http,
                url: &url,
                allow_http: true,
            },
            at,
        )
        .await
    }

    async fn verify(
        &self,
        claims: &Value,
        signing: Signing,
    ) -> Result<id_token::Claims, IdTokenError> {
        self.verify_at(&sign(claims, signing), NOW).await
    }

    fn jwks_fetches(&self) -> usize {
        self.idp.requests_to("/jwks").len()
    }
}

fn with(mut claims: Value, key: &str, value: Value) -> Value {
    claims[key] = value;
    claims
}

fn without(mut claims: Value, key: &str) -> Value {
    claims.as_object_mut().unwrap().remove(key);
    claims
}

#[tokio::test]
async fn a_good_token_gives_its_claims() {
    let rig = Rig::new().await;
    let verified = rig.verify(&claims(), Signing::Primary).await.unwrap();
    assert_eq!(verified.subject, "sub-1");
    assert_eq!(verified.email.as_deref(), Some("ada@example.com"));
    assert!(verified.email_verified);
    assert_eq!(verified.name.as_deref(), Some("Ada Lovelace"));
    assert_eq!(
        verified.picture.as_deref(),
        Some("https://example.com/ada.png")
    );
    assert!(!format!("{verified:?}").contains("ada@example.com"));
}

#[tokio::test]
async fn both_google_issuers_and_an_audience_list_are_accepted() {
    let rig = Rig::new().await;
    for iss in ["https://accounts.google.com", "accounts.google.com"] {
        rig.verify(&with(claims(), "iss", json!(iss)), Signing::Primary)
            .await
            .unwrap();
    }
    rig.verify(
        &with(claims(), "aud", json!(["other", AUD])),
        Signing::Primary,
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn only_a_json_true_counts_as_a_verified_email() {
    let rig = Rig::new().await;
    for value in [json!("true"), json!(false), json!(1), Value::Null] {
        let verified = rig
            .verify(&with(claims(), "email_verified", value), Signing::Primary)
            .await
            .unwrap();
        assert!(!verified.email_verified);
    }
    let missing = rig
        .verify(&without(claims(), "email_verified"), Signing::Primary)
        .await
        .unwrap();
    assert!(!missing.email_verified);
}

#[tokio::test]
async fn claim_mismatches_are_refused() {
    let rig = Rig::new().await;
    let cases = [
        (
            with(claims(), "nonce", json!("another-nonce")),
            IdTokenError::Nonce,
        ),
        (without(claims(), "nonce"), IdTokenError::Nonce),
        (
            with(claims(), "aud", json!("someone-elses-client")),
            IdTokenError::Audience,
        ),
        (
            with(claims(), "aud", json!(["a", "b"])),
            IdTokenError::Audience,
        ),
        (without(claims(), "aud"), IdTokenError::MissingClaim),
        (
            with(claims(), "iss", json!("https://evil.example")),
            IdTokenError::Issuer,
        ),
        (
            with(claims(), "iss", json!("https://accounts.google.com/")),
            IdTokenError::Issuer,
        ),
        (without(claims(), "iss"), IdTokenError::MissingClaim),
        (without(claims(), "sub"), IdTokenError::MissingClaim),
        (with(claims(), "sub", json!("")), IdTokenError::MissingClaim),
        (without(claims(), "exp"), IdTokenError::MissingClaim),
        (without(claims(), "iat"), IdTokenError::MissingClaim),
    ];
    for (claims, expected) in cases {
        assert_eq!(
            rig.verify(&claims, Signing::Primary).await.unwrap_err(),
            expected,
            "{claims}"
        );
    }
}

#[tokio::test]
async fn time_claims_use_the_injected_clock_with_thirty_seconds_of_leeway() {
    let rig = Rig::new().await;
    let now = NOW.unix_timestamp();
    // exp: expired once it is 30 s in the past.
    for (exp, ok) in [
        (now + 1, true),
        (now - 29, true),
        (now - 30, false),
        (now - 3600, false),
    ] {
        let result = rig
            .verify(&with(claims(), "exp", json!(exp)), Signing::Primary)
            .await;
        assert_eq!(result.is_ok(), ok, "exp {exp} vs now {now}");
        if !ok {
            assert_eq!(result.unwrap_err(), IdTokenError::Expired);
        }
    }
    // iat: at most an hour old (30 s leeway as in jose), not from the future.
    for (iat, expected) in [
        (now - 3600, Ok(())),
        (now - 3630, Ok(())),
        (now - 3631, Err(IdTokenError::TooOld)),
        (now - 7200, Err(IdTokenError::TooOld)),
        (now + 30, Ok(())),
        (now + 31, Err(IdTokenError::NotYetValid)),
    ] {
        let result = rig
            .verify(&with(claims(), "iat", json!(iat)), Signing::Primary)
            .await
            .map(|_| ());
        assert_eq!(result, expected, "iat {iat}");
    }
    // nbf in the future.
    assert_eq!(
        rig.verify(&with(claims(), "nbf", json!(now + 60)), Signing::Primary)
            .await
            .unwrap_err(),
        IdTokenError::NotYetValid
    );
    // The same token is judged against whatever "now" the caller passes.
    let token = sign(&claims(), Signing::Primary);
    assert!(
        rig.verify_at(&token, NOW + time::Duration::minutes(59))
            .await
            .is_ok()
    );
    assert_eq!(
        rig.verify_at(&token, NOW + time::Duration::hours(2))
            .await
            .unwrap_err(),
        IdTokenError::Expired
    );
}

#[tokio::test]
async fn bad_signatures_and_algorithms_are_refused() {
    let rig = Rig::new().await;
    assert_eq!(
        rig.verify(&claims(), Signing::UnknownKey)
            .await
            .unwrap_err(),
        IdTokenError::Jwks(JwksError::UnknownKey)
    );
    assert_eq!(
        rig.verify(&claims(), Signing::ForgedAsPrimary)
            .await
            .unwrap_err(),
        IdTokenError::Signature
    );
    assert_eq!(
        rig.verify(&claims(), Signing::Hs256).await.unwrap_err(),
        IdTokenError::Algorithm
    );
    assert_eq!(
        rig.verify(&claims(), Signing::NoneAlg).await.unwrap_err(),
        IdTokenError::Malformed
    );
    // A valid header and signature over different claims.
    let token = sign(&claims(), Signing::Primary);
    let parts: Vec<&str> = token.split('.').collect();
    let other = sign(
        &with(claims(), "email", json!("mallory@example.com")),
        Signing::Primary,
    );
    let other_payload = other.split('.').nth(1).unwrap();
    let spliced = format!("{}.{other_payload}.{}", parts[0], parts[2]);
    assert_eq!(
        rig.verify_at(&spliced, NOW).await.unwrap_err(),
        IdTokenError::Signature
    );
    for junk in ["", "a.b.c", "not a token", "..", &"a".repeat(20 * 1024)] {
        assert_eq!(
            rig.verify_at(junk, NOW).await.unwrap_err(),
            IdTokenError::Malformed,
            "{:?}",
            &junk[..junk.len().min(12)]
        );
    }
}

#[tokio::test]
async fn the_key_set_is_cached_for_an_hour() {
    let rig = Rig::new().await;
    let token = sign(&claims(), Signing::Primary);
    let wide = || with(claims(), "exp", json!(NOW.unix_timestamp() + 6 * 3600));
    rig.verify_at(&token, NOW).await.unwrap();
    rig.verify_at(&token, NOW).await.unwrap();
    assert_eq!(rig.jwks_fetches(), 1, "second use is from the cache");

    let at = NOW + JWKS_TTL - time::Duration::seconds(1);
    rig.verify_at(&token, at).await.unwrap();
    assert_eq!(
        rig.jwks_fetches(),
        1,
        "still fresh a second before the hour"
    );

    // After an hour the set is fetched again (a token valid then is needed).
    let later = NOW + JWKS_TTL;
    let fresh = sign(
        &with(
            with(wide(), "iat", json!(later.unix_timestamp())),
            "exp",
            json!(later.unix_timestamp() + 3600),
        ),
        Signing::Primary,
    );
    rig.verify_at(&fresh, later).await.unwrap();
    assert_eq!(rig.jwks_fetches(), 2);
}

#[tokio::test]
async fn an_unknown_key_id_refetches_at_most_once_a_minute() {
    let rig = Rig::new().await;
    rig.verify(&claims(), Signing::Primary).await.unwrap();
    assert_eq!(rig.jwks_fetches(), 1);

    // The provider rotates: the other key now signs, but is not published yet.
    let unknown = sign(&claims(), Signing::UnknownKey);
    for second in [0, 10, 30, 59] {
        let at = NOW + time::Duration::seconds(second);
        assert_eq!(
            rig.verify_at(&unknown, at).await.unwrap_err(),
            IdTokenError::Jwks(JwksError::UnknownKey)
        );
    }
    assert_eq!(rig.jwks_fetches(), 1, "no refetch inside the first minute");

    // Published now, but the cache may not look again until a minute has passed.
    rig.idp.publish_both_keys();
    let at = NOW + JWKS_REFETCH_MIN;
    assert!(rig.verify_at(&unknown, at).await.is_ok());
    assert_eq!(rig.jwks_fetches(), 2, "one refetch after the minute");
    // Known keys never refetch.
    rig.verify_at(&sign(&claims(), Signing::Primary), at)
        .await
        .unwrap();
    assert_eq!(rig.jwks_fetches(), 2);
}

#[tokio::test]
async fn a_stream_of_forged_key_ids_cannot_hammer_the_provider() {
    let rig = Rig::new().await;
    rig.verify(&claims(), Signing::Primary).await.unwrap();
    let unknown = sign(&claims(), Signing::UnknownKey);
    for _ in 0..25 {
        let _ = rig
            .verify_at(&unknown, NOW + time::Duration::seconds(5))
            .await;
    }
    assert_eq!(rig.jwks_fetches(), 1);
}

#[tokio::test]
async fn an_unreachable_or_insecure_key_endpoint_is_refused() {
    let rig = Rig::new().await;
    let http = client();
    let token = sign(&claims(), Signing::Primary);
    let expect = Expect {
        issuers: &["https://accounts.google.com"],
        audience: AUD,
        nonce: Some(NONCE),
    };
    // Plain http is refused when not allowed (production).
    let url = rig.idp.jwks_url();
    let insecure = id_token::verify(
        &token,
        &expect,
        &KeySource {
            cache: &JwksCache::new(),
            http: &http,
            url: &url,
            allow_http: false,
        },
        NOW,
    )
    .await;
    assert_eq!(
        insecure.unwrap_err(),
        IdTokenError::Jwks(JwksError::Fetch(HttpError::Insecure))
    );
    assert_eq!(rig.jwks_fetches(), 0, "nothing was sent");
    // A key endpoint that cannot be reached.
    let dead = id_token::verify(
        &token,
        &expect,
        &KeySource {
            cache: &JwksCache::new(),
            http: &http,
            url: "http://127.0.0.1:1/jwks",
            allow_http: true,
        },
        NOW,
    )
    .await;
    assert_eq!(
        dead.unwrap_err(),
        IdTokenError::Jwks(JwksError::Fetch(HttpError::Network))
    );
    // Only RSA signing keys are kept.
    rig.idp.set_jwks(&json!({ "keys": [
        { "kty": "EC", "kid": "fake-primary", "crv": "P-256", "x": "AA", "y": "AA" },
        { "kty": "RSA", "kid": "fake-primary", "use": "enc", "n": "AA", "e": "AQAB" },
        { "kty": "RSA", "kid": "fake-primary", "alg": "RS512", "n": "AA", "e": "AQAB" },
    ]}));
    assert_eq!(
        rig.verify_at(&token, NOW).await.unwrap_err(),
        IdTokenError::Jwks(JwksError::UnknownKey)
    );
}
