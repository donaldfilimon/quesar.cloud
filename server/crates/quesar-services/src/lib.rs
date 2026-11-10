//! Server-side services for the quesar.cloud server.
//!
//! `crypto` seals data at rest exactly as `src/lib/server/crypto.server.ts`
//! does, so a value sealed by the Node server opens here and the other way
//! round.
//!
//! `rate_limit` is the database-backed fixed-window limiter of
//! `src/lib/server/rate-limit.server.ts`, over the same `rate_limits` table.
//!
//! `text` holds the string helpers that measure and trim as ECMAScript does.
//! `turnstile`, `quasar` and `commerce` are the configuration reads behind the
//! public functions: they take the environment as plain values and return their
//! own types, not wire types.

pub mod commerce;
pub mod crypto;
pub mod quasar;
pub mod rate_limit;
pub mod text;
pub mod turnstile;
