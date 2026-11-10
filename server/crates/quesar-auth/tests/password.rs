use std::sync::Mutex;

use argon2::password_hash::PasswordHash;
use quesar_auth::password::{
    Argon2Hasher, DummyHash, Password, PasswordHasher, PhcString, hash, verify, verify_unknown_user,
};
use quesar_auth::validate::{self, ValidationError};

#[test]
fn hash_round_trip_and_wrong_password() {
    let phc = hash(&Password::new("correct horse")).unwrap();
    assert!(verify(&Password::new("correct horse"), &phc));
    assert!(!verify(&Password::new("wrong horse"), &phc));
    assert!(!verify(&Password::new("x"), &PhcString::new("garbage")));
}

#[test]
fn hash_has_owasp_parameters() {
    let phc = hash(&Password::new("pw-12345678")).unwrap();
    assert!(
        phc.as_str().starts_with("$argon2id$v=19$m=19456,t=2,p=1$"),
        "{}",
        phc.as_str()
    );
    let dummy = DummyHash::new(&Argon2Hasher).unwrap();
    assert!(
        dummy
            .phc()
            .as_str()
            .starts_with("$argon2id$v=19$m=19456,t=2,p=1$")
    );
}

#[test]
fn dummy_hash_does_the_same_work_as_a_real_hash() {
    let dummy = DummyHash::new(&Argon2Hasher).unwrap();
    let real = hash(&Password::new("a real password")).unwrap();
    let d = PasswordHash::new(dummy.phc().as_str()).unwrap();
    let r = PasswordHash::new(real.as_str()).unwrap();
    assert_eq!(d.algorithm, r.algorithm);
    assert_eq!(d.version, r.version);
    for name in ["m", "t", "p"] {
        let get = |h: &PasswordHash| h.params.get(name).map(|v| v.to_string());
        assert!(get(&d).is_some());
        assert_eq!(get(&d), get(&r), "param {name}");
    }
    assert_eq!(d.hash.unwrap().len(), r.hash.unwrap().len());
    assert_eq!(d.salt.unwrap().len(), r.salt.unwrap().len());
}

struct Counting(Mutex<Vec<String>>);

impl PasswordHasher for Counting {
    fn hash(&self, _: &Password) -> Result<PhcString, quesar_auth::password::HashError> {
        unreachable!("not used")
    }
    fn verify(&self, _: &Password, hash: &PhcString) -> bool {
        self.0.lock().unwrap().push(hash.as_str().to_owned());
        false
    }
}

#[test]
fn unknown_user_verifies_once_against_dummy_hash() {
    let counter = Counting(Mutex::new(Vec::new()));
    let dummy = DummyHash::new(&Argon2Hasher).unwrap();
    assert!(!verify_unknown_user(
        &counter,
        &dummy,
        &Password::new("whatever1")
    ));
    let calls = counter.0.lock().unwrap();
    assert_eq!(calls.as_slice(), [dummy.phc().as_str().to_owned()]);
    // The real hasher also rejects it.
    assert!(!Argon2Hasher.verify(&Password::new("whatever1"), dummy.phc()));
}

#[test]
fn debug_is_redacted() {
    let shown = format!("{:?}", Password::new("hunter2-secret"));
    assert!(!shown.contains("hunter2"), "{shown}");
    assert!(shown.contains("redacted"));
    let dummy = DummyHash::new(&Argon2Hasher).unwrap();
    assert!(!format!("{dummy:?}").contains("argon2"));
}

#[test]
fn display_names() {
    let eighty = "é".repeat(80);
    assert_eq!(validate::display_name(&eighty).unwrap(), eighty);
    assert_eq!(
        validate::display_name(&"é".repeat(81)),
        Err(ValidationError::DisplayNameTooLong)
    );
    assert_eq!(
        validate::display_name("   "),
        Err(ValidationError::DisplayNameEmpty)
    );
    assert_eq!(
        validate::display_name(""),
        Err(ValidationError::DisplayNameEmpty)
    );
    assert_eq!(validate::display_name("  Ada  ").unwrap(), "Ada");
    assert_eq!(
        ValidationError::DisplayNameEmpty.to_string(),
        "Enter a display name."
    );
    assert_eq!(
        ValidationError::DisplayNameTooLong.to_string(),
        "Keep the display name to 80 characters or fewer."
    );
}

#[test]
fn emails() {
    assert_eq!(
        validate::email("  Ada@Example.COM ").unwrap(),
        "ada@example.com"
    );
    for ok in [
        "a+tag@example.com",
        "o'brien@example.com",
        "a.b-c_d@sub.example.co.uk",
        "a@my-host.example.com",
        "x'.y@example.com",
        "a@1b.example.com",
    ] {
        assert!(validate::email(ok).is_ok(), "{ok:?}");
    }
    for bad in [
        "a@b",
        "@b.c",
        "a b@c.d",
        "",
        "a@@b.c",
        "a@b..c",
        "a@.c.d",
        "a@b.c",
        "a..b@x.com",
        ".a@x.com",
        "a.@x.com",
        "a'@x.com",
        "a<b>@x.com",
        "a\"b@x.com",
        "a@-b.com",
        "a@b.123",
        "a@b.c1",
        "a@b_c.com",
        "é@x.com",
        "a@exämple.com",
        "a\u{200b}b@x.com",
        "\u{feff}a@x.com",
        "a@x.com\u{200b}",
    ] {
        assert_eq!(
            validate::email(bad),
            Err(ValidationError::InvalidEmail),
            "{bad:?}"
        );
    }
}

#[test]
fn email_is_checked_before_lowercasing() {
    for bad in [
        "\u{212A}@x.com",
        "a\u{130}b@x.com",
        "a@\u{212A}.com",
        "a@x.\u{212A}\u{212A}",
    ] {
        assert_eq!(
            validate::email(bad),
            Err(ValidationError::InvalidEmail),
            "{bad:?}"
        );
    }
    assert_eq!(
        validate::email("ADA.Lovelace@EXAMPLE.Com").unwrap(),
        "ada.lovelace@example.com"
    );
}

#[test]
fn password_lengths() {
    assert_eq!(
        validate::password_len("1234567"),
        Err(ValidationError::PasswordTooShort)
    );
    assert!(validate::password_len("12345678").is_ok());
    assert!(validate::password_len(&"a".repeat(128)).is_ok());
    assert_eq!(
        validate::password_len(&"a".repeat(129)),
        Err(ValidationError::PasswordTooLong)
    );
    assert_eq!(
        ValidationError::PasswordTooShort.code(),
        "PASSWORD_TOO_SHORT"
    );
    assert_eq!(ValidationError::PasswordTooLong.code(), "PASSWORD_TOO_LONG");
}
