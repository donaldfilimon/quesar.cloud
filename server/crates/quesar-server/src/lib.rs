//! The quesar.cloud server.
//!
//! One origin serves the site's static export and `/api/*`, so the `__Host-`
//! session cookies and the same-origin request checks hold without CORS.

pub mod config;
pub mod readiness;
pub mod router;
pub mod static_site;

pub use config::Config;
pub use router::router;
