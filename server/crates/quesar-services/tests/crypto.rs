//! Behaviour and cross-language tests for `quesar_services::crypto`.
//! Nothing here writes to the repository.

use base64::Engine;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use quesar_services::crypto::{CryptoError, SealingKeys};
use serde::Deserialize;

const KEY_A: &str = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE="; // 32 x 0x01
const KEY_B: &str = "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI="; // 32 x 0x02

fn keys() -> SealingKeys {
    SealingKeys::new(Some(KEY_A), None)
}

#[derive(Deserialize)]
struct VectorFile {
    keys: Keys,
    vectors: Vec<Vector>,
}
#[derive(Deserialize)]
struct Keys {
    current_base64: String,
    previous_base64: String,
}
#[derive(Deserialize)]
struct Vector {
    name: String,
    sealed_with: String,
    associated_data: String,
    plaintext_base64: String,
    envelope: String,
}

fn load(file: &str) -> VectorFile {
    let path = format!("{}/../../contract/{file}", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {path}: {e}"));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("parse {path}: {e}"))
}

fn open_all(file: &str) {
    let f = load(file);
    assert!(!f.vectors.is_empty());
    let keys = SealingKeys::new(Some(&f.keys.current_base64), Some(&f.keys.previous_base64));
    for v in &f.vectors {
        let expected = String::from_utf8(STANDARD.decode(&v.plaintext_base64).unwrap()).unwrap();
        let opened = keys
            .open_with_rotation(&v.envelope, &v.associated_data)
            .unwrap_or_else(|e| panic!("{}: {e}", v.name));
        assert_eq!(opened.plaintext, expected, "{}", v.name);
        assert_eq!(opened.rotated, v.sealed_with == "previous", "{}", v.name);
    }
}

#[test]
fn opens_every_typescript_sealed_vector() {
    open_all("crypto-vectors.json");
}

#[test]
fn opens_every_rust_sealed_vector() {
    open_all("crypto-vectors-rust.json");
}

#[test]
fn test_keys_in_vectors_match_these_constants() {
    let f = load("crypto-vectors.json");
    assert_eq!(f.keys.current_base64, KEY_A);
    assert_eq!(f.keys.previous_base64, KEY_B);
}

#[test]
fn round_trips_with_envelope_shape() {
    let sealed = keys().seal("héllo \u{1F680}", "audit:1:u").unwrap();
    let parts: Vec<&str> = sealed.split('.').collect();
    assert_eq!(parts.len(), 4);
    assert_eq!(parts[0], "v1");
    assert_eq!(URL_SAFE_NO_PAD.decode(parts[1]).unwrap().len(), 12);
    assert_eq!(URL_SAFE_NO_PAD.decode(parts[3]).unwrap().len(), 16);
    assert!(!sealed.contains('='));
    assert_eq!(
        keys().open(&sealed, "audit:1:u").unwrap(),
        "héllo \u{1F680}"
    );
}

#[test]
fn empty_plaintext_and_empty_aad_round_trip() {
    let sealed = keys().seal("", "").unwrap();
    assert_eq!(keys().open(&sealed, "").unwrap(), "");
}

#[test]
fn wrong_associated_data_fails() {
    let sealed = keys().seal("secret", "audit:1:user-a").unwrap();
    assert_eq!(
        keys().open(&sealed, "audit:1:user-b"),
        Err(CryptoError::Authentication)
    );
}

#[test]
fn wrong_key_fails() {
    let sealed = keys().seal("secret", "aad").unwrap();
    let other = SealingKeys::new(Some(KEY_B), None);
    assert_eq!(other.open(&sealed, "aad"), Err(CryptoError::Authentication));
}

#[test]
fn a_flipped_bit_in_each_part_fails() {
    let sealed = keys().seal("secret value", "aad").unwrap();
    for index in 1..=3 {
        let mut parts: Vec<String> = sealed.split('.').map(str::to_owned).collect();
        let mut bytes = URL_SAFE_NO_PAD.decode(&parts[index]).unwrap();
        bytes[0] ^= 0x01;
        parts[index] = URL_SAFE_NO_PAD.encode(bytes);
        assert_eq!(
            keys().open(&parts.join("."), "aad"),
            Err(CryptoError::Authentication),
            "part {index}"
        );
    }
}

#[test]
fn malformed_envelopes_are_refused_by_kind() {
    let sealed = keys().seal("secret", "aad").unwrap();
    let parts: Vec<&str> = sealed.split('.').collect();
    // Wrong part count or version: unknown format.
    for bad in ["", "v1", "v1.a.b", "v1.a.b.c.d", "v2.a.b.c"] {
        assert_eq!(
            keys().open(bad, "aad"),
            Err(CryptoError::UnknownFormat),
            "{bad}"
        );
    }
    let v2 = format!("v2.{}.{}.{}", parts[1], parts[2], parts[3]);
    assert_eq!(keys().open(&v2, "aad"), Err(CryptoError::UnknownFormat));
    // Right shape, bad IV or tag (length or encoding): malformed.
    let short_iv = format!(
        "v1.{}.{}.{}",
        URL_SAFE_NO_PAD.encode([0u8; 8]),
        parts[2],
        parts[3]
    );
    let short_tag = format!(
        "v1.{}.{}.{}",
        parts[1],
        parts[2],
        URL_SAFE_NO_PAD.encode([0u8; 8])
    );
    let junk_iv = format!("v1.!!!.{}.{}", parts[2], parts[3]);
    for bad in [short_iv, short_tag, junk_iv] {
        assert_eq!(
            keys().open(&bad, "aad"),
            Err(CryptoError::Malformed),
            "{bad}"
        );
    }
    // Truncated envelopes never open.
    for cut in 0..sealed.len() {
        assert!(keys().open(&sealed[..cut], "aad").is_err(), "cut {cut}");
    }
}

#[test]
fn rotation_falls_back_to_the_previous_key_and_flags_it() {
    let old = SealingKeys::new(Some(KEY_A), None)
        .seal("legacy", "aad")
        .unwrap();
    let rotated = SealingKeys::new(Some(KEY_B), Some(KEY_A));
    let opened = rotated.open_with_rotation(&old, "aad").unwrap();
    assert_eq!(
        (opened.plaintext.as_str(), opened.rotated),
        ("legacy", true)
    );
    let fresh = rotated.seal("new", "aad").unwrap();
    let opened = rotated.open_with_rotation(&fresh, "aad").unwrap();
    assert_eq!((opened.plaintext.as_str(), opened.rotated), ("new", false));
    // Without the previous key the old value is refused.
    let no_prev = SealingKeys::new(Some(KEY_B), None);
    assert_eq!(no_prev.open(&old, "aad"), Err(CryptoError::Authentication));
}

#[test]
fn previous_key_does_not_rescue_a_wrong_aad() {
    let old = SealingKeys::new(Some(KEY_A), None)
        .seal("legacy", "aad")
        .unwrap();
    let rotated = SealingKeys::new(Some(KEY_B), Some(KEY_A));
    assert_eq!(
        rotated.open(&old, "other"),
        Err(CryptoError::Authentication)
    );
}

#[test]
fn opening_needs_a_current_key_even_when_only_a_previous_one_is_set() {
    // Matches crypto.server.ts: `openWithRotation` reads the active key first.
    let old = keys().seal("legacy", "aad").unwrap();
    let only_prev = SealingKeys::new(None, Some(KEY_A));
    assert_eq!(only_prev.open(&old, "aad"), Err(CryptoError::NotConfigured));
}

#[test]
fn an_invalid_previous_key_is_treated_as_absent() {
    let old = SealingKeys::new(Some(KEY_A), None)
        .seal("legacy", "aad")
        .unwrap();
    let keys = SealingKeys::new(Some(KEY_B), Some("not a key"));
    assert_eq!(keys.open(&old, "aad"), Err(CryptoError::Authentication));
}

#[test]
fn no_key_returns_the_unavailable_variants() {
    for keys in [
        SealingKeys::new(None, None),
        SealingKeys::new(Some("  "), None),
    ] {
        assert!(!keys.configured());
        assert_eq!(keys.seal("x", "aad"), Err(CryptoError::NotConfigured));
        assert_eq!(
            keys.open("v1.a.b.c", "aad"),
            Err(CryptoError::NotConfigured)
        );
    }
    let short = SealingKeys::new(Some(&STANDARD.encode([0u8; 16])), None);
    assert_eq!(short.seal("x", "aad"), Err(CryptoError::InvalidKey));
}

#[test]
fn accepts_base64_base64url_hex_and_padded_keys() {
    let raw = [0xfbu8; 32]; // encodes with '+' and '/' in standard base64
    let hex: String = raw.iter().map(|b| format!("{b:02x}")).collect();
    let forms = [
        STANDARD.encode(raw),
        URL_SAFE_NO_PAD.encode(raw),
        base64::engine::general_purpose::URL_SAFE.encode(raw),
        hex.clone(),
        hex.to_uppercase(),
        format!("  {hex}\n"),
    ];
    let reference = SealingKeys::new(Some(&forms[0]), None)
        .seal("x", "a")
        .unwrap();
    for form in &forms {
        let k = SealingKeys::new(Some(form), None);
        assert!(k.configured(), "{form}");
        assert_eq!(k.open(&reference, "a").unwrap(), "x", "{form}");
    }
}

#[test]
fn two_seals_of_the_same_plaintext_differ() {
    let a = keys().seal("same", "aad").unwrap();
    let b = keys().seal("same", "aad").unwrap();
    assert_ne!(a, b);
}

#[test]
fn debug_and_errors_show_no_key_material_or_plaintext() {
    let k = SealingKeys::new(Some(KEY_A), Some(KEY_B));
    let shown = format!("{k:?}");
    assert!(!shown.contains(KEY_A) && !shown.contains(KEY_B) && !shown.contains("AQEB"));
    let sealed = k.seal("topsecret-plaintext", "aad").unwrap();
    let err = k.open(&sealed, "wrong").unwrap_err();
    let text = format!("{err} {err:?}");
    assert!(!text.contains("topsecret") && !text.contains(KEY_A));
    let opened = k.open_with_rotation(&sealed, "aad").unwrap();
    assert!(!format!("{opened:?}").contains("topsecret"));
}
