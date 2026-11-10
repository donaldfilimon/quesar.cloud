//! OAuth sign-in: the parts every provider shares.
//!
//! - [`flow`]: the single-use `auth_flows` row (state, PKCE verifier, nonce,
//!   return paths) and the binding cookie that ties it to one browser.
//! - [`pkce`]: the S256 verifier and challenge.
//! - [`paths`]: the open-redirect rules for the return paths.
//! - [`jwks`] and [`id_token`]: signing keys and ID-token verification.
//! - [`link`]: which local user a provider identity signs in as.
//! - [`provider`]: provider names, the identity a provider asserts and the
//!   errors a provider exchange can end in.
//! - [`http`]: the outbound calls to a provider (size cap, HTTPS rule).

pub mod flow;
pub mod http;
pub mod id_token;
pub mod jwks;
pub mod link;
pub mod paths;
pub mod pkce;
pub mod provider;
