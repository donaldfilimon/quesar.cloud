//! Password hashing: Argon2id with the `argon2` crate's default parameters
//! (19 MiB, t=2, p=1: the OWASP baseline).
//!
//! `verify` uses argon2's own constant-time comparison. Unknown users are
//! verified against [`dummy_hash`] so the work done matches a real account.

use std::fmt;
use std::sync::OnceLock;

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher as _, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};
use zeroize::Zeroizing;

/// A plaintext password. `Debug` is redacted and the memory is zeroized on drop.
pub struct Password(Zeroizing<String>);

impl Password {
    pub fn new(value: impl Into<String>) -> Self {
        Self(Zeroizing::new(value.into()))
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for Password {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Password([redacted])")
    }
}

/// A password hash in PHC string format (`$argon2id$v=19$m=...`).
#[derive(Clone, PartialEq, Eq)]
pub struct PhcString(String);

impl PhcString {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for PhcString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("PhcString([redacted])")
    }
}

/// Hashing failed (never expected with the fixed default parameters).
#[derive(Debug)]
pub struct HashError;

impl fmt::Display for HashError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("password hashing failed")
    }
}

impl std::error::Error for HashError {}

/// Hash and verify, behind a trait so tests can count calls.
pub trait PasswordHasher: Send + Sync {
    fn hash(&self, password: &Password) -> Result<PhcString, HashError>;
    fn verify(&self, password: &Password, hash: &PhcString) -> bool;
}

/// The production hasher: Argon2id, `Params::default()`.
#[derive(Debug, Clone, Copy, Default)]
pub struct Argon2Hasher;

fn argon2() -> Argon2<'static> {
    Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default())
}

impl PasswordHasher for Argon2Hasher {
    fn hash(&self, password: &Password) -> Result<PhcString, HashError> {
        let salt = SaltString::generate(&mut OsRng);
        let hash = argon2()
            .hash_password(password.expose().as_bytes(), &salt)
            .map_err(|_| HashError)?;
        Ok(PhcString(hash.to_string()))
    }

    fn verify(&self, password: &Password, hash: &PhcString) -> bool {
        match PasswordHash::new(hash.as_str()) {
            Ok(parsed) => argon2()
                .verify_password(password.expose().as_bytes(), &parsed)
                .is_ok(),
            Err(_) => false,
        }
    }
}

/// Hash with the production hasher.
pub fn hash(password: &Password) -> Result<PhcString, HashError> {
    Argon2Hasher.hash(password)
}

/// Verify with the production hasher.
pub fn verify(password: &Password, hash: &PhcString) -> bool {
    Argon2Hasher.verify(password, hash)
}

/// A hash with the production parameters, made once from a random password
/// nobody knows. Verifying against it costs the same as a real account.
pub static DUMMY_HASH: OnceLock<PhcString> = OnceLock::new();

pub fn dummy_hash() -> &'static PhcString {
    DUMMY_HASH.get_or_init(|| {
        let random = crate::token::SecretToken::generate();
        // Hashing with fixed parameters cannot fail; if it somehow does, an
        // unparseable placeholder still makes `verify` fail closed.
        hash(&Password::new(random.expose())).unwrap_or_else(|_| PhcString::new("$invalid"))
    })
}

/// Verify a password for an email with no usable credential: exactly one hasher
/// call, against [`dummy_hash`]. Always returns false for the caller to ignore.
pub fn verify_unknown_user(hasher: &dyn PasswordHasher, password: &Password) -> bool {
    hasher.verify(password, dummy_hash());
    false
}
