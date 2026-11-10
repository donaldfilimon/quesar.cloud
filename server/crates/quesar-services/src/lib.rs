//! Server-side services for the quesar.cloud server.
//!
//! `crypto` seals data at rest exactly as `src/lib/server/crypto.server.ts`
//! does, so a value sealed by the Node server opens here and the other way
//! round.

pub mod crypto;
