//! `normalize_path` against the vectors the TypeScript produced
//! (`server/contract/telemetry-routes.json`, written by
//! `src/lib/server/public-contract.test.ts`).

use std::path::Path;

use quesar_services::telemetry::{RoutePatterns, app_route_patterns, normalize_path};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
struct Vector {
    name: String,
    input: Value,
    path: String,
}

#[derive(Deserialize)]
struct File {
    files: Vec<String>,
    vectors: Vec<Vector>,
}

fn file() -> File {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contract/telemetry-routes.json");
    serde_json::from_slice(&std::fs::read(path).expect("vector file")).expect("vector file parses")
}

#[test]
fn every_vector_matches_the_typescript() {
    let file = file();
    assert!(file.vectors.len() >= 60);
    let patterns = RoutePatterns::from_files(&file.files);
    let mut failures = Vec::new();
    for vector in &file.vectors {
        let got = normalize_path(&vector.input, &patterns);
        if got != vector.path {
            failures.push(format!(
                "{}: {} -> {:?}, TypeScript says {:?}",
                vector.name, vector.input, got, vector.path
            ));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn the_embedded_patterns_are_the_committed_file() {
    let file = file();
    assert_eq!(
        app_route_patterns(),
        &RoutePatterns::from_files(&file.files),
        "the embedded route list differs from the file read now"
    );
}
