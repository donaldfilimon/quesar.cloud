//! Secret tokens and their stored form.

use std::fmt;

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use rand::RngCore;
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

/// 32 random bytes from the OS RNG, as unpadded base64url (43 characters).
///
/// `Debug` is redacted and the text is wiped on drop. The database stores only
/// [`token_hash`] of it; the token itself goes to the client once.
pub struct SecretToken(Zeroizing<String>);

impl SecretToken {
    pub fn generate() -> Self {
        let mut bytes = Zeroizing::new([0u8; 32]);
        OsRng.fill_bytes(bytes.as_mut());
        Self(Zeroizing::new(URL_SAFE_NO_PAD.encode(bytes.as_ref())))
    }

    /// The token text, for the cookie or URL that carries it.
    pub fn expose(&self) -> &str {
        &self.0
    }

    pub fn hash(&self) -> [u8; 32] {
        token_hash(&self.0)
    }
}

impl fmt::Debug for SecretToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretToken([redacted])")
    }
}

/// SHA-256 of a presented token, the value looked up in the database.
///
/// Looking a token up by this hash through a unique index leaks nothing
/// useful: the input is 256 random bits, so the timing of the index search
/// tells an attacker nothing they can use. It needs no constant-time compare.
pub fn token_hash(token: &str) -> [u8; 32] {
    Sha256::digest(token.as_bytes()).into()
}
