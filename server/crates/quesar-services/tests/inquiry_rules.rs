//! `quesar_services::inquiries::rules` against the vectors the TypeScript
//! `coerceInquiryInput` and `validateInquiry` produced
//! (`server/contract/inquiry-vectors.json`, written by
//! `src/lib/server/public-contract.test.ts`), plus each boundary by hand.

use std::path::Path;

use quesar_services::inquiries::rules::{Field, InquiryInput, Refusal, coerce, validate};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
struct Coerced {
    name: String,
    email: String,
    company: String,
    topic: String,
    message: String,
    #[serde(rename = "turnstileToken")]
    turnstile_token: String,
    #[serde(rename = "tokenPairCut")]
    token_pair_cut: bool,
}

#[derive(Deserialize)]
struct Validation {
    ok: bool,
    field: Option<String>,
    error: Option<String>,
    value: Option<Value>,
}

#[derive(Deserialize)]
struct Vector {
    name: String,
    input: Value,
    coerced: Coerced,
    validation: Validation,
}

#[derive(Deserialize)]
struct File {
    vectors: Vec<Vector>,
}

#[test]
fn every_vector_matches_the_typescript() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contract/inquiry-vectors.json");
    let file: File = serde_json::from_slice(&std::fs::read(path).expect("vector file"))
        .expect("vector file parses");
    assert!(file.vectors.len() >= 80);
    let mut failures = Vec::new();
    for vector in &file.vectors {
        let got = coerce(&vector.input);
        let want = &vector.coerced;
        let want_input = InquiryInput {
            name: want.name.clone(),
            email: want.email.clone(),
            company: want.company.clone(),
            topic: want.topic.clone(),
            message: want.message.clone(),
            turnstile_token: want.turnstile_token.clone(),
        };
        if got != want_input {
            failures.push(format!("{}: coerce differs", vector.name));
            continue;
        }
        // The pair-cut flag is information for the reader of the file: the
        // TypeScript keeps the lone high surrogate, which the vector omits.
        assert!(!want.token_pair_cut || got.turnstile_token.len() >= 4096);
        let checked = validate(&got);
        match (&checked, &vector.validation) {
            (
                Ok(valid),
                Validation {
                    ok: true, value, ..
                },
            ) => {
                let value = value.as_ref().expect("an ok vector has a value");
                let ours = json!({
                    "name": valid.name, "email": valid.email, "company": valid.company,
                    "topic": valid.topic, "message": valid.message,
                });
                if &ours != value {
                    failures.push(format!("{}: value differs", vector.name));
                }
            }
            (
                Err(Refusal { field, message }),
                Validation {
                    ok: false,
                    field: want_field,
                    error,
                    ..
                },
            ) => {
                if Some(field.as_str()) != want_field.as_deref()
                    || Some(message.as_str()) != error.as_deref()
                {
                    failures.push(format!(
                        "{}: refusal {}/{} differs",
                        vector.name,
                        field.as_str(),
                        message
                    ));
                }
            }
            _ => failures.push(format!("{}: ok/refused differs", vector.name)),
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

fn good() -> InquiryInput {
    InquiryInput {
        name: "Ada Lovelace".into(),
        email: "ada@example.com".into(),
        company: String::new(),
        topic: "Quesar".into(),
        message: "I would like to talk about WDBX provenance.".into(),
        turnstile_token: String::new(),
    }
}

fn refused(input: &InquiryInput) -> (Field, String) {
    let refusal = validate(input).expect_err("should be refused");
    (refusal.field, refusal.message)
}

#[test]
fn a_complete_inquiry_passes_trimmed() {
    let mut input = good();
    input.name = "  Ada  ".into();
    input.message = "  a real message here  ".into();
    let valid = validate(&input).unwrap();
    assert_eq!(valid.name, "Ada");
    assert_eq!(valid.message, "a real message here");
    assert_eq!(valid.topic, "Quesar");
}

#[test]
fn name_boundaries() {
    for (name, ok) in [("A", false), ("Al", true)] {
        let mut input = good();
        input.name = name.into();
        assert_eq!(validate(&input).is_ok(), ok, "{name}");
    }
    let mut input = good();
    input.name = "A".into();
    assert_eq!(
        refused(&input),
        (Field::Name, "Enter your full name.".into())
    );
    input.name = "n".repeat(80);
    assert!(validate(&input).is_ok());
    input.name = "n".repeat(81);
    assert_eq!(
        refused(&input),
        (Field::Name, "Keep your name under 80 characters.".into())
    );
    // Astral characters count two units each.
    input.name = "😀".repeat(40);
    assert!(validate(&input).is_ok());
    input.name = "😀".repeat(41);
    assert_eq!(refused(&input).0, Field::Name);
}

#[test]
fn email_boundaries() {
    let mut input = good();
    input.email = format!("{}@example.com", "a".repeat(108));
    assert_eq!(input.email.len(), 120);
    assert!(validate(&input).is_ok());
    input.email = format!("{}@example.com", "a".repeat(109));
    assert_eq!(
        refused(&input),
        (
            Field::Email,
            "Enter an email address we can reply to.".into()
        )
    );
    for bad in [
        "",
        "a",
        "a@b",
        "@b.c",
        "a@.c",
        "a@b.",
        "a@@b.c",
        "a@b@c.d",
        "a b@c.d",
        "a@b .c",
        "a@b.c\u{FEFF}x",
    ] {
        input.email = bad.into();
        assert_eq!(refused(&input).0, Field::Email, "{bad:?}");
    }
    for fine in [
        "a@b.c",
        "a@b..c",
        "a.b@c.d.e",
        "a\u{85}b@c.d",
        "a@b\u{200B}.c",
    ] {
        input.email = fine.into();
        assert!(validate(&input).is_ok(), "{fine:?}");
    }
}

#[test]
fn company_boundaries() {
    let mut input = good();
    input.company = "c".repeat(120);
    assert!(validate(&input).is_ok());
    input.company = "c".repeat(121);
    assert_eq!(
        refused(&input),
        (
            Field::Company,
            "Keep the organization under 120 characters.".into()
        )
    );
}

#[test]
fn topics_match_exactly_after_trimming() {
    let mut input = good();
    for topic in [
        "Quesar",
        "Abbey",
        "ABI / WDBX",
        "Services",
        "Investors",
        "Other",
    ] {
        input.topic = format!(" {topic}\u{FEFF}");
        assert_eq!(validate(&input).unwrap().topic, topic);
    }
    for topic in [
        "",
        "quesar",
        "QUESAR",
        "abbey",
        "ABI/WDBX",
        "Crypto",
        "Other\u{85}",
    ] {
        input.topic = topic.into();
        assert_eq!(
            refused(&input),
            (Field::Topic, "Choose a topic.".into()),
            "{topic:?}"
        );
    }
}

#[test]
fn message_boundaries() {
    let mut input = good();
    input.message = "123456789".into();
    assert_eq!(
        refused(&input),
        (
            Field::Message,
            "Add a bit more detail: at least 10 characters.".into()
        )
    );
    input.message = "1234567890".into();
    assert!(validate(&input).is_ok());
    input.message = "m".repeat(2000);
    assert!(validate(&input).is_ok());
    input.message = "m".repeat(2001);
    assert_eq!(
        refused(&input),
        (
            Field::Message,
            "Keep the message under 2000 characters.".into()
        )
    );
    input.message = "😀".repeat(1000);
    assert!(validate(&input).is_ok());
    input.message = format!("{}a", "😀".repeat(1000));
    assert_eq!(refused(&input).0, Field::Message);
    // U+FEFF is trimmed, U+0085 is not.
    input.message = "\u{FEFF}123456789\u{FEFF}".into();
    assert_eq!(refused(&input).0, Field::Message);
    input.message = "\u{85}123456789\u{85}".into();
    assert!(validate(&input).is_ok());
}

#[test]
fn checks_run_in_the_typescript_order() {
    let all_bad = InquiryInput::default();
    assert_eq!(refused(&all_bad).0, Field::Name);
    let mut input = good();
    input.email = "bad".into();
    input.company = "c".repeat(121);
    input.topic = "x".into();
    input.message = String::new();
    assert_eq!(refused(&input).0, Field::Email);
    input.email = good().email;
    assert_eq!(refused(&input).0, Field::Company);
    input.company = String::new();
    assert_eq!(refused(&input).0, Field::Topic);
    input.topic = "Other".into();
    assert_eq!(refused(&input).0, Field::Message);
}

#[test]
fn coerce_never_fails_on_hostile_input() {
    for hostile in [
        Value::Null,
        json!(5),
        json!("x"),
        json!([]),
        json!(["name", "x"]),
        json!({"name": 42, "email": {}, "company": null, "topic": ["Quesar"], "message": true}),
    ] {
        let coerced = coerce(&hostile);
        assert_eq!(coerced, InquiryInput::default(), "{hostile}");
        assert!(validate(&coerced).is_err());
    }
}

#[test]
fn the_token_is_cut_to_4097_units_without_splitting_a_pair() {
    let token = |value: String| coerce(&json!({ "turnstileToken": value })).turnstile_token;
    assert_eq!(token("t".repeat(4097)).len(), 4097);
    assert_eq!(token("t".repeat(9000)).len(), 4097);
    // 4096 units then a pair: the cut would land inside the pair.
    let cut = token(format!("{}😀", "t".repeat(4096)));
    assert_eq!(cut, "t".repeat(4096));
    // A pair that ends exactly at the limit is kept.
    let kept = token(format!("{}😀z", "t".repeat(4095)));
    assert_eq!(kept, format!("{}😀", "t".repeat(4095)));
}
