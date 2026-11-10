//! The public server functions: callable without a session.

pub mod config;
pub mod inquiries;

use super::FnRouter;

/// Mounts every function of this module.
pub fn register(router: FnRouter) -> FnRouter {
    inquiries::register(config::register(router))
}
