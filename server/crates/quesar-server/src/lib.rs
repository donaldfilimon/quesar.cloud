//! The quesar.cloud server.
//!
//! One origin serves the site's static export and `/api/*`, so the `__Host-`
//! session cookies and the same-origin request checks hold without CORS.

pub mod api;
pub mod auth;
pub mod body_limit;
pub mod config;
pub mod csp;
pub mod readiness;
pub mod router;
pub mod static_site;
pub mod trace;

pub use config::Config;
pub use router::{AppState, router, router_with, router_with_functions, router_with_public};
