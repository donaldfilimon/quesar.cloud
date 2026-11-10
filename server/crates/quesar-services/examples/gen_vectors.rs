//! Regenerates `server/contract/crypto-vectors-rust.json`: seals the same
//! cases as the TypeScript-sealed `crypto-vectors.json` (same TEST keys, same
//! associated data and plaintext) with the Rust implementation, so the vitest
//! contract test can open them with the real TypeScript functions.
//!
//! ```text
//! cargo run --manifest-path server/Cargo.toml -p quesar-services --example gen_vectors
//! ```

use std::path::PathBuf;

use quesar_services::crypto::SealingKeys;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
struct Keys {
    current_base64: String,
    previous_base64: String,
    note: String,
}

#[derive(Deserialize, Serialize)]
struct Vector {
    name: String,
    sealed_with: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    key_text: Option<String>,
    associated_data: String,
    plaintext_base64: String,
    envelope: String,
}

#[derive(Deserialize, Serialize)]
struct VectorFile {
    description: String,
    keys: Keys,
    vectors: Vec<Vector>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    use base64::Engine;
    use base64::engine::general_purpose::STANDARD;

    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contract");
    let source: VectorFile =
        serde_json::from_str(&std::fs::read_to_string(dir.join("crypto-vectors.json"))?)?;

    let current = SealingKeys::new(Some(&source.keys.current_base64), None);
    let previous = SealingKeys::new(Some(&source.keys.previous_base64), None);

    let mut vectors = Vec::new();
    for v in source.vectors {
        let plaintext = String::from_utf8(STANDARD.decode(&v.plaintext_base64)?)?;
        let custom = v
            .key_text
            .as_deref()
            .map(|text| SealingKeys::new(Some(text), None));
        let keys = match v.sealed_with.as_str() {
            "previous" => &previous,
            "custom" => custom.as_ref().ok_or("custom vector without key_text")?,
            _ => &current,
        };
        vectors.push(Vector {
            envelope: keys.seal(&plaintext, &v.associated_data)?,
            ..v
        });
    }
    let out = VectorFile {
        description: "Sealed by server/crates/quesar-services (Rust). Regenerate: cargo run --manifest-path server/Cargo.toml -p quesar-services --example gen_vectors".to_owned(),
        keys: source.keys,
        vectors,
    };
    std::fs::write(
        dir.join("crypto-vectors-rust.json"),
        format!("{}\n", serde_json::to_string_pretty(&out)?),
    )?;
    Ok(())
}
