use std::time::Duration;

use quesar_auth::{Clock, FixedClock, SecretToken, SystemClock, new_id, token_hash};
use time::macros::datetime;

#[test]
fn ids_are_32_alphanumeric_characters_and_differ() {
    let a = new_id();
    let b = new_id();
    assert_eq!(a.len(), 32);
    assert!(a.chars().all(|c| c.is_ascii_alphanumeric()));
    assert_ne!(a, b);
}

#[test]
fn tokens_are_43_base64url_characters_with_a_redacted_debug() {
    let token = SecretToken::generate();
    let text = token.expose().to_owned();
    assert_eq!(text.len(), 43);
    assert!(
        text.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    );
    assert!(!format!("{token:?}").contains(&text));
    assert_ne!(SecretToken::generate().expose(), text);
    assert_eq!(token.hash(), token_hash(&text));
}

#[test]
fn token_hash_is_sha256() {
    let hex: String = token_hash("abc")
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    assert_eq!(
        hex,
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn the_fixed_clock_is_settable_and_the_system_clock_moves_on() {
    let clock = FixedClock::new(datetime!(2026-01-01 00:00 UTC));
    assert_eq!(clock.now(), datetime!(2026-01-01 00:00 UTC));
    clock.advance(Duration::from_secs(90));
    assert_eq!(clock.now(), datetime!(2026-01-01 00:01:30 UTC));
    clock.set(datetime!(2027-06-01 12:00 UTC));
    assert_eq!(clock.now(), datetime!(2027-06-01 12:00 UTC));
    assert!(SystemClock.now().year() >= 2026);
}
