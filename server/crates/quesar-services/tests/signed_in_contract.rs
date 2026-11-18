use quesar_services::crypto::{SealingKeys, digest};
use serde_json::Value;

#[test]
fn signed_in_audit_matches_the_typescript_seal_and_digest() {
    let vectors: Value =
        serde_json::from_str(include_str!("../../../contract/signed-in-vectors.json")).unwrap();
    let audit = &vectors["audit"];
    let field = |name| audit[name].as_str().unwrap();
    let keys = SealingKeys::new(Some(field("key")), None);
    assert_eq!(
        keys.open(field("sealed"), field("aad")).unwrap(),
        field("plaintext"),
    );
    assert_eq!(digest(field("plaintext")), field("digest"));
}

#[test]
fn digest_uses_unpadded_base64url_sha256() {
    assert_eq!(digest(""), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
    assert_eq!(digest("abc"), "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
}
