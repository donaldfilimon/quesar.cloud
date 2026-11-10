//! PKCE (RFC 7636) with the S256 method.
//!
//! The verifier is 128 characters from the unreserved set, as Better Auth
//! generates it (`generateRandomString(128)`, `oauth2/state.mjs`).

use std::fmt;

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use rand::Rng;
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

/// RFC 7636 section 4.1: unreserved characters.
const UNRESERVED: &[u8; 66] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
pub const VERIFIER_LEN: usize = 128;

/// A PKCE verifier: `Debug` is redacted and the text is wiped on drop.
pub struct Verifier(Zeroizing<String>);

impl Verifier {
    /// 128 characters from the OS RNG (`gen_range` samples uniformly).
    pub fn generate() -> Self {
        let mut rng = OsRng;
        let text: String = (0..VERIFIER_LEN)
            .map(|_| char::from(UNRESERVED[rng.gen_range(0..UNRESERVED.len())]))
            .collect();
        Self(Zeroizing::new(text))
    }

    /// Wraps text read back from the flow row.
    pub fn from_stored(text: String) -> Self {
        Self(Zeroizing::new(text))
    }

    /// The text, for the flow row and the token request.
    pub fn expose(&self) -> &str {
        &self.0
    }

    /// `BASE64URL(SHA256(verifier))`, the S256 challenge.
    pub fn challenge(&self) -> String {
        challenge_for(&self.0)
    }
}

impl fmt::Debug for Verifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Verifier([redacted])")
    }
}

/// The S256 challenge for `verifier`.
pub fn challenge_for(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}
