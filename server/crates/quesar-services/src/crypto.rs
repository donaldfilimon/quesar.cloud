//! AES-256-GCM sealing, byte-compatible with `src/lib/server/crypto.server.ts`.
//!
//! Envelope: `v1.<iv>.<ciphertext>.<tag>`, each part base64url without
//! padding; IV 12 bytes, tag 16 bytes. The AES key is not the configured key
//! itself: it is `HMAC-SHA256(key, "quesar:seal")`, so sealing and hashing
//! never share key material. Associated data is always supplied (a string,
//! possibly empty) and is bound to the blob, so a sealed value cannot be moved
//! between rows.
//!
//! Keys are 32 bytes, given as hex (64 chars) or base64/base64url.
//! Rotation: seal with the current key; open with the current key and, only on
//! an authentication failure, with the previous key. An invalid previous key
//! counts as absent. As in the TypeScript, opening needs a current key even if
//! only the previous one could open the value.
//!
//! Errors never carry key material or plaintext.

use std::fmt;

use aes_gcm::aead::{Aead, OsRng, Payload};
use aes_gcm::{AeadCore, Aes256Gcm, KeyInit, Nonce};
use base64::Engine;
use base64::alphabet::STANDARD;
use base64::engine::DecodePaddingMode;
use base64::engine::general_purpose::{GeneralPurpose, GeneralPurposeConfig, URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use zeroize::Zeroizing;

const VERSION: &str = "v1";
const IV_BYTES: usize = 12;
const TAG_BYTES: usize = 16;
const KEY_BYTES: usize = 32;
const SUBKEY_PURPOSE: &[u8] = b"quesar:seal";

/// Why a sealing operation was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CryptoError {
    /// No key is configured (`EncryptionUnavailableError`).
    NotConfigured,
    /// A key is configured but is not 32 bytes in a supported encoding.
    InvalidKey,
    /// The envelope is not `v1.<iv>.<ct>.<tag>` (wrong part count or version).
    UnknownFormat,
    /// The envelope has the right shape but an IV, tag or ciphertext that
    /// cannot be decoded or has the wrong length.
    Malformed,
    /// The value failed authentication: tampered, wrong key or wrong
    /// associated data.
    Authentication,
    /// The value authenticated but is not UTF-8 text.
    NotUtf8,
    /// The cipher refused to seal (input beyond AES-GCM's size limit).
    SealFailed,
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::NotConfigured => "APP_ENCRYPTION_KEY is not configured",
            Self::InvalidKey => "APP_ENCRYPTION_KEY must decode to exactly 32 bytes",
            Self::UnknownFormat => "unknown envelope format",
            Self::Malformed => "malformed envelope",
            Self::Authentication => "sealed value failed authentication",
            Self::NotUtf8 => "sealed value is not UTF-8 text",
            Self::SealFailed => "value could not be sealed",
        })
    }
}

impl std::error::Error for CryptoError {}

/// A value opened by [`SealingKeys::open_with_rotation`].
#[derive(Clone, PartialEq, Eq)]
pub struct Opened {
    pub plaintext: String,
    /// True when only the previous key worked: re-seal and store.
    pub rotated: bool,
}

impl fmt::Debug for Opened {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Opened")
            .field("rotated", &self.rotated)
            .finish_non_exhaustive()
    }
}

/// Standard alphabet, no padding (the caller strips it), and trailing bits
/// that are not canonical are accepted, as Node's `Buffer.from(x, "base64")`.
const LENIENT_STANDARD: GeneralPurpose = GeneralPurpose::new(
    &STANDARD,
    GeneralPurposeConfig::new()
        .with_decode_allow_trailing_bits(true)
        .with_decode_padding_mode(DecodePaddingMode::RequireNone),
);

type SealKey = Zeroizing<[u8; KEY_BYTES]>;

/// The configured sealing keys. Key bytes are zeroized on drop and never
/// printed.
pub struct SealingKeys {
    current: Result<SealKey, CryptoError>,
    previous: Option<SealKey>,
}

impl fmt::Debug for SealingKeys {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SealingKeys")
            .field("current", &self.current.is_ok())
            .field("previous", &self.previous.is_some())
            .finish_non_exhaustive()
    }
}

impl SealingKeys {
    /// Build from the raw `APP_ENCRYPTION_KEY` and `APP_ENCRYPTION_KEY_PREVIOUS`
    /// values. Never fails: a missing or invalid current key makes `seal` and
    /// `open` refuse, as in the TypeScript, and an invalid previous key is
    /// ignored.
    pub fn new(current: Option<&str>, previous: Option<&str>) -> Self {
        Self {
            current: parse_key(current).and_then(|key| derive_seal_key(key.as_slice())),
            previous: previous
                .and_then(|raw| parse_key(Some(raw)).ok())
                .and_then(|key| derive_seal_key(key.as_slice()).ok()),
        }
    }

    /// Whether a usable current key is configured.
    pub fn configured(&self) -> bool {
        self.current.is_ok()
    }

    /// Seal `plaintext` under the current key, bound to `associated_data`.
    pub fn seal(&self, plaintext: &str, associated_data: &str) -> Result<String, CryptoError> {
        let key = self.current.as_ref().map_err(Clone::clone)?;
        seal_with(key, plaintext, associated_data)
    }

    /// Open with the current key, falling back to the previous one.
    pub fn open(&self, envelope: &str, associated_data: &str) -> Result<String, CryptoError> {
        self.open_with_rotation(envelope, associated_data)
            .map(|opened| opened.plaintext)
    }

    /// Like [`open`](Self::open), also reporting whether the previous key was
    /// needed.
    pub fn open_with_rotation(
        &self,
        envelope: &str,
        associated_data: &str,
    ) -> Result<Opened, CryptoError> {
        let current = self.current.as_ref().map_err(Clone::clone)?;
        match open_with(current, envelope, associated_data) {
            Ok(plaintext) => Ok(Opened {
                plaintext,
                rotated: false,
            }),
            Err(CryptoError::Authentication) => match &self.previous {
                Some(previous) => Ok(Opened {
                    plaintext: open_with(previous, envelope, associated_data)?,
                    rotated: true,
                }),
                None => Err(CryptoError::Authentication),
            },
            Err(other) => Err(other),
        }
    }
}

/// Parse a raw key into 32 bytes, wiping every intermediate copy.
///
/// Accepted, as in `parseKey`: 64 hex characters, or base64/base64url with
/// padding present or absent. Like Node's lenient decoder, non-canonical
/// trailing bits in the last character are accepted (so every 43/44-character
/// key Node accepts works here). Deliberate difference: Node silently skips
/// interior whitespace and stray characters; this refuses a key containing
/// any (only surrounding whitespace is trimmed), since a key with junk in it
/// is almost certainly a misconfiguration and failing closed is safer.
fn parse_key(raw: Option<&str>) -> Result<Zeroizing<[u8; KEY_BYTES]>, CryptoError> {
    let value = raw.map(str::trim).filter(|v| !v.is_empty());
    let Some(value) = value else {
        return Err(CryptoError::NotConfigured);
    };
    let mut key = Zeroizing::new([0u8; KEY_BYTES]);
    if value.len() == 64 && value.bytes().all(|b| b.is_ascii_hexdigit()) {
        decode_hex(value, &mut key)?;
        return Ok(key);
    }
    // 43 or 44 characters (4 padding at most) is all a 32-byte key can be.
    if value.len() > 44 {
        return Err(CryptoError::InvalidKey);
    }
    let normalised: Zeroizing<Vec<u8>> = Zeroizing::new(
        value
            .trim_end_matches('=')
            .bytes()
            .map(|c| match c {
                b'-' => b'+',
                b'_' => b'/',
                other => other,
            })
            .collect(),
    );
    // Room for the decoded length plus the engine's slack.
    let mut decoded = Zeroizing::new(vec![0u8; normalised.len() / 4 * 3 + 3]);
    let written = LENIENT_STANDARD
        .decode_slice(normalised.as_slice(), decoded.as_mut_slice())
        .map_err(|_| CryptoError::InvalidKey)?;
    if written != KEY_BYTES {
        return Err(CryptoError::InvalidKey);
    }
    key.copy_from_slice(&decoded[..KEY_BYTES]);
    Ok(key)
}

fn decode_hex(value: &str, out: &mut [u8; KEY_BYTES]) -> Result<(), CryptoError> {
    for (slot, pair) in out.iter_mut().zip(value.as_bytes().chunks(2)) {
        let text = std::str::from_utf8(pair).map_err(|_| CryptoError::InvalidKey)?;
        *slot = u8::from_str_radix(text, 16).map_err(|_| CryptoError::InvalidKey)?;
    }
    Ok(())
}

/// `HMAC-SHA256(key, "quesar:seal")`, as `subkey(key, "seal")` in the TS.
fn derive_seal_key(key: &[u8]) -> Result<SealKey, CryptoError> {
    // HMAC accepts keys of any length, so this does not fail in practice.
    // `hmac` 0.12 and `sha2` 0.10 offer no `zeroize` feature, so the ipad/opad
    // state inside `mac` is not wiped when it drops; only our own copies are.
    let mut mac =
        <Hmac<Sha256> as Mac>::new_from_slice(key).map_err(|_| CryptoError::InvalidKey)?;
    mac.update(SUBKEY_PURPOSE);
    Ok(Zeroizing::new(mac.finalize().into_bytes().into()))
}

fn seal_with(key: &SealKey, plaintext: &str, aad: &str) -> Result<String, CryptoError> {
    let cipher = Aes256Gcm::new(key.as_slice().into());
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let sealed = cipher
        .encrypt(
            &nonce,
            Payload {
                msg: plaintext.as_bytes(),
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| CryptoError::SealFailed)?;
    let split = sealed.len().saturating_sub(TAG_BYTES);
    let (ciphertext, tag) = sealed.split_at(split);
    Ok([
        VERSION.to_owned(),
        URL_SAFE_NO_PAD.encode(nonce),
        URL_SAFE_NO_PAD.encode(ciphertext),
        URL_SAFE_NO_PAD.encode(tag),
    ]
    .join("."))
}

fn open_with(key: &SealKey, envelope: &str, aad: &str) -> Result<String, CryptoError> {
    let parts: Vec<&str> = envelope.split('.').collect();
    let [version, iv_part, ct_part, tag_part] = parts[..] else {
        return Err(CryptoError::UnknownFormat);
    };
    if version != VERSION {
        return Err(CryptoError::UnknownFormat);
    }
    let decode = |part: &str| {
        URL_SAFE_NO_PAD
            .decode(part)
            .map_err(|_| CryptoError::Malformed)
    };
    let iv = decode(iv_part)?;
    let tag = decode(tag_part)?;
    if iv.len() != IV_BYTES || tag.len() != TAG_BYTES {
        return Err(CryptoError::Malformed);
    }
    let mut body = decode(ct_part)?;
    body.extend_from_slice(&tag);
    let cipher = Aes256Gcm::new(key.as_slice().into());
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(&iv),
            Payload {
                msg: &body,
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| CryptoError::Authentication)?;
    String::from_utf8(plaintext).map_err(|err| {
        zeroize::Zeroize::zeroize(&mut err.into_bytes());
        CryptoError::NotUtf8
    })
}
