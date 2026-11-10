//! The public server functions: callable without a session.

pub mod config;

use super::FnRouter;

/// Mounts every function of this module.
pub fn register(router: FnRouter) -> FnRouter {
    config::register(router)
}
