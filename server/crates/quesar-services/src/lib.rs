//! Server-side services for the quesar.cloud server.
//!
//! `crypto` seals data at rest exactly as `src/lib/server/crypto.server.ts`
//! does, so a value sealed by the Node server opens here and the other way
//! round.
//!
//! `rate_limit` is the database-backed fixed-window limiter of
//! `src/lib/server/rate-limit.server.ts`, over the same `rate_limits` table.

pub mod crypto;
pub mod rate_limit;
