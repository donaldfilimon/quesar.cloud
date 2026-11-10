//! Apple's client secret against the TypeScript vectors
//! (`server/contract/apple-secret-vectors.json`, written by
//! `src/lib/auth/apple-secret-contract.test.ts`), and its 30-day re-mint.
//! No database.

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use p256::ecdsa::signature::Verifier;
use p256::ecdsa::{Signature, VerifyingKey};
use p256::pkcs8::DecodePublicKey;
use quesar_auth::providers::apple::{
    AppleSecrets, REMINT_AFTER, SECRET_TTL_SECS, SecretError, client_secret,
};
use quesar_auth::{AppleConfig, ClientSecret, ProviderEndpoints};
use serde_json::Value;
use time::OffsetDateTime;
use time::macros::datetime;

struct Vectors {
    config: AppleConfig,
    public_key_pem: String,
    now: i64,
    secret: String,
}

fn vectors() -> Vectors {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../contract/apple-secret-vectors.json"
    );
    let file: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let text = |value: &Value| value.as_str().unwrap().to_owned();
    let key = &file["key"];
    Vectors {
        config: AppleConfig {
            client_id: text(&key["client_id"]),
            team_id: text(&key["team_id"]),
            key_id: text(&key["key_id"]),
            private_key: ClientSecret::new(text(&key["private_key_pem"])),
            endpoints: ProviderEndpoints::apple(),
        },
        public_key_pem: text(&key["public_key_pem"]),
        now: file["now"].as_i64().unwrap(),
        secret: text(&file["secret"]),
    }
}

fn split(jwt: &str) -> (String, String, Vec<u8>) {
    let parts: Vec<&str> = jwt.split('.').collect();
    assert_eq!(parts.len(), 3, "a compact JWT");
    (
        parts[0].to_owned(),
        parts[1].to_owned(),
        URL_SAFE_NO_PAD.decode(parts[2]).unwrap(),
    )
}

fn verifies(public_key_pem: &str, jwt: &str) -> bool {
    let (header, payload, signature) = split(jwt);
    let key = VerifyingKey::from_public_key_pem(public_key_pem).unwrap();
    let Ok(signature) = Signature::from_slice(&signature) else {
        return false;
    };
    key.verify(format!("{header}.{payload}").as_bytes(), &signature)
        .is_ok()
}

#[test]
fn header_and_payload_are_byte_equal_to_the_typescript_output() {
    let v = vectors();
    let ours = client_secret(&v.config, v.now).unwrap();
    let (their_header, their_payload, _) = split(&v.secret);
    let (our_header, our_payload, _) = split(ours.expose());
    assert_eq!(our_header, their_header);
    assert_eq!(our_payload, their_payload);
}

#[test]
fn both_signatures_verify_and_ours_is_a_raw_64_byte_r_s() {
    let v = vectors();
    let ours = client_secret(&v.config, v.now).unwrap();
    assert!(verifies(&v.public_key_pem, &v.secret), "TypeScript's");
    assert!(verifies(&v.public_key_pem, ours.expose()), "Rust's");
    assert_eq!(split(ours.expose()).2.len(), 64);
    // A signature over other bytes does not verify (the check is real).
    let (header, _, signature) = split(ours.expose());
    let other = format!("{header}.e30.{}", URL_SAFE_NO_PAD.encode(signature));
    assert!(!verifies(&v.public_key_pem, &other));
}

#[test]
fn the_claims_are_apples_required_ones_in_order() {
    let v = vectors();
    let ours = client_secret(&v.config, v.now).unwrap();
    let (header, payload, _) = split(ours.expose());
    let decode = |part: &str| String::from_utf8(URL_SAFE_NO_PAD.decode(part).unwrap()).unwrap();
    assert_eq!(
        decode(&header),
        r#"{"alg":"ES256","kid":"FAKEKEY001"}"#.to_owned()
    );
    assert_eq!(
        decode(&payload),
        format!(
            r#"{{"iss":"FAKETEAM01","iat":{},"exp":{},"aud":"https://appleid.apple.com","sub":"cloud.quesar.test"}}"#,
            v.now,
            v.now + SECRET_TTL_SECS
        )
    );
    const { assert!(SECRET_TTL_SECS < 15_777_000) };
}

#[test]
fn a_pem_with_escaped_newlines_is_accepted() {
    let mut v = vectors();
    let escaped = v.config.private_key.expose().trim().replace('\n', "\\n");
    assert!(!escaped.contains('\n'));
    v.config.private_key = ClientSecret::new(escaped);
    let ours = client_secret(&v.config, v.now).unwrap();
    assert!(verifies(&v.public_key_pem, ours.expose()));
    assert_eq!(split(ours.expose()).0, split(&v.secret).0);
}

#[test]
fn a_malformed_key_is_refused_without_echoing_it() {
    let mut v = vectors();
    for garbage in [
        "not a pem",
        "",
        "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
    ] {
        v.config.private_key = ClientSecret::new(garbage);
        assert_eq!(
            client_secret(&v.config, v.now).err(),
            Some(SecretError::BadKey)
        );
        let error = AppleSecrets::new(&v.config, datetime!(2026-11-10 12:00 UTC)).unwrap_err();
        assert_eq!(error, SecretError::BadKey);
        assert!(!format!("{error} {error:?}").contains("AAAA"));
    }
    // The configuration's Debug never shows the key either.
    assert!(!format!("{:?}", vectors().config).contains("BEGIN"));
}

fn iat_of(secret: &ClientSecret) -> i64 {
    let (_, payload, _) = split(secret.expose());
    let payload: Value = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(payload).unwrap()).unwrap();
    payload["iat"].as_i64().unwrap()
}

#[test]
fn the_secret_is_minted_at_startup_and_re_minted_after_thirty_days() {
    let v = vectors();
    let start: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);
    let secrets = AppleSecrets::new(&v.config, start).unwrap();
    let first = secrets.current(&v.config, start);
    assert_eq!(iat_of(&first), start.unix_timestamp());

    // Inside the window: the same secret, byte for byte.
    let later = start + REMINT_AFTER - time::Duration::seconds(1);
    assert_eq!(secrets.current(&v.config, later).expose(), first.expose());

    // At 30 days: a new one, issued now, still verifying.
    let due = start + REMINT_AFTER;
    let second = secrets.current(&v.config, due);
    assert_eq!(iat_of(&second), due.unix_timestamp());
    assert_ne!(second.expose(), first.expose());
    assert!(verifies(&v.public_key_pem, second.expose()));

    // And the clock for the next window is the new one.
    let soon = due + time::Duration::days(29);
    assert_eq!(secrets.current(&v.config, soon).expose(), second.expose());
    let again = secrets.current(&v.config, due + REMINT_AFTER);
    assert_eq!(iat_of(&again), (due + REMINT_AFTER).unix_timestamp());

    // A clock that went backwards past the issue time does not keep a secret
    // from the future.
    let back = start - time::Duration::days(1);
    assert_eq!(
        iat_of(&secrets.current(&v.config, back)),
        back.unix_timestamp()
    );
}

#[test]
fn the_holder_is_redacted() {
    let v = vectors();
    let secrets = AppleSecrets::new(&v.config, datetime!(2026-11-10 12:00 UTC)).unwrap();
    assert_eq!(format!("{secrets:?}"), "AppleSecrets([redacted])");
}
