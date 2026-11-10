//! `normalize_origin` against the vectors the TypeScript `normalizeOrigin`
//! produced (`server/contract/quasar-origin-vectors.json`, written by
//! `src/lib/server/public-contract.test.ts`).

use std::path::Path;

use quesar_services::quasar::normalize_origin;
use serde::Deserialize;

#[derive(Deserialize)]
struct Vector {
    name: String,
    input: String,
    origin: Option<String>,
}

#[derive(Deserialize)]
struct File {
    vectors: Vec<Vector>,
}

#[test]
fn every_vector_matches_the_typescript() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contract/quasar-origin-vectors.json");
    let file: File = serde_json::from_slice(&std::fs::read(path).expect("vector file"))
        .expect("vector file parses");
    assert!(file.vectors.len() >= 30);
    let mut failures = Vec::new();
    for vector in &file.vectors {
        let got = normalize_origin(&vector.input);
        if got != vector.origin {
            failures.push(format!(
                "{}: {:?} -> {:?}, TypeScript says {:?}",
                vector.name, vector.input, got, vector.origin
            ));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn the_brief_cases_hold() {
    let accepted = [
        ("https://example.com:443", "https://example.com"),
        ("https://Example.COM/", "https://example.com"),
        ("http://[::1]:4700", "http://[::1]:4700"),
        ("  http://localhost:4700 ", "http://localhost:4700"),
    ];
    for (input, expected) in accepted {
        assert_eq!(
            normalize_origin(input).as_deref(),
            Some(expected),
            "{input}"
        );
    }
    for input in [
        "https://example.com/a",
        "https://example.com?x",
        "https://example.com#x",
        "https://user@example.com",
        "https:\\\\example.com",
        "ftp://example.com",
        "",
        "   ",
    ] {
        assert_eq!(normalize_origin(input), None, "{input:?}");
    }
}
