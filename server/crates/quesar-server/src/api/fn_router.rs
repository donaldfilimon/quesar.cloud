//! Mounting server functions: one `POST /{NAME}` route each.

use std::sync::Arc;

use axum::Router;
use axum::handler::Handler;
use axum::routing::post;
use quesar_contract::ServerFunction;

use crate::router::AppState;

/// The functions mounted so far, and their routes.
pub struct FnRouter {
    router: Router<Arc<AppState>>,
    names: Vec<&'static str>,
}

impl Default for FnRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl FnRouter {
    pub fn new() -> Self {
        Self {
            router: Router::new(),
            names: Vec::new(),
        }
    }

    /// Mounts `handler` at `POST /{F::NAME}`. Registering a name twice is a
    /// programming error that axum refuses when the router is built.
    #[must_use]
    pub fn function<F, H, T>(mut self, handler: H) -> Self
    where
        F: ServerFunction,
        H: Handler<T, Arc<AppState>>,
        T: 'static,
    {
        self.router = self.router.route(&format!("/{}", F::NAME), post(handler));
        self.names.push(F::NAME);
        self
    }

    /// The routes, and the registered names in registration order.
    pub fn finish(self) -> (Router<Arc<AppState>>, Vec<&'static str>) {
        (self.router, self.names)
    }
}
