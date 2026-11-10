//! The error envelope moved to [`crate::api::error`]; this keeps the paths
//! M2's code and tests use.

pub use crate::api::error::{ApiError, ok};
