//! The committed `src/lib/api/generated/` must equal what `quesar_contract`
//! renders now. Regenerate with:
//! `GEN_CONTRACT_TYPES=1 cargo test -p quesar-contract --test drift`

use std::{collections::BTreeMap, fs, path::PathBuf};

const REGENERATE: &str = "GEN_CONTRACT_TYPES=1 cargo test -p quesar-contract --test drift";

fn generated_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../src/lib/api/generated")
}

#[test]
fn generated_types_match_the_contract() {
    let dir = generated_dir();
    let expected: BTreeMap<String, String> = quesar_contract::export::files().into_iter().collect();

    if std::env::var_os("GEN_CONTRACT_TYPES").is_some() {
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create the generated directory");
        for (name, body) in &expected {
            fs::write(dir.join(name), body).expect("write a generated file");
        }
        return;
    }

    let mut actual = BTreeMap::new();
    let entries = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("{} is unreadable ({e}); run: {REGENERATE}", dir.display()));
    for entry in entries {
        let entry = entry.expect("read a directory entry");
        let name = entry.file_name().to_string_lossy().into_owned();
        let body = fs::read_to_string(entry.path())
            .unwrap_or_else(|e| panic!("{name} is unreadable ({e}); run: {REGENERATE}"));
        actual.insert(name, body);
    }

    let mut problems = Vec::new();
    for name in expected.keys().filter(|n| !actual.contains_key(*n)) {
        problems.push(format!("missing: {name}"));
    }
    for name in actual.keys().filter(|n| !expected.contains_key(*n)) {
        problems.push(format!("extra: {name}"));
    }
    for (name, body) in &expected {
        if actual.get(name).is_some_and(|have| have != body) {
            problems.push(format!("different: {name}"));
        }
    }
    assert!(
        problems.is_empty(),
        "src/lib/api/generated/ has drifted from the Rust contract:\n  {}\nregenerate with: {REGENERATE}",
        problems.join("\n  ")
    );
}
