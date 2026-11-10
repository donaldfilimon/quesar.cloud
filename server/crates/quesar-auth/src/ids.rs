//! Row identifiers in Better Auth's `generateId` shape.

use rand::Rng;
use rand::rngs::OsRng;

const ALPHABET: &[u8; 62] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/// Length of every generated id.
pub const ID_LEN: usize = 32;

/// A fresh 32-character id from `[A-Za-z0-9]`, drawn from the OS RNG.
/// `gen_range` samples uniformly, so there is no modulo bias.
pub fn new_id() -> String {
    let mut rng = OsRng;
    (0..ID_LEN)
        .map(|_| char::from(ALPHABET[rng.gen_range(0..ALPHABET.len())]))
        .collect()
}
