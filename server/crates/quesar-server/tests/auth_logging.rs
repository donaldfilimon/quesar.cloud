//! The request trace records the method and path, never the query string:
//! OAuth callbacks carry `code` and `state` there.

use std::io::Write;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Method, Request};
use quesar_server::config::Environment;
use quesar_server::trace::request_span;
use quesar_server::{Config, router};
use tower::ServiceExt;
use tower_http::trace::TraceLayer;
use tracing_subscriber::fmt::MakeWriter;
use tracing_subscriber::fmt::format::FmtSpan;

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl Write for Captured {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl<'a> MakeWriter<'a> for Captured {
    type Writer = Captured;

    fn make_writer(&'a self) -> Self::Writer {
        self.clone()
    }
}

#[tokio::test]
async fn an_oauth_callback_logs_neither_code_nor_state() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_span_events(FmtSpan::FULL)
        .with_writer(captured.clone())
        .finish();
    let guard = tracing::subscriber::set_default(subscriber);

    let config = Config::from_env(Environment::from_pairs([(
        "PUBLIC_ORIGIN",
        "https://quesar.cloud",
    )]))
    .unwrap();
    let app = router(&config).layer(TraceLayer::new_for_http().make_span_with(request_span));
    let request = Request::builder()
        .method(Method::GET)
        .uri("/api/auth/callback/google?code=SECRETCODE&state=SECRETSTATE")
        .body(Body::empty())
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    drop(guard);

    // The request was handled (503 without a database) and traced.
    assert_eq!(response.status(), 503);
    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        log.contains("/api/auth/callback/google"),
        "nothing was traced: {log}"
    );
    for secret in ["SECRETCODE", "SECRETSTATE", "code=", "state="] {
        assert!(!log.contains(secret), "the log contains {secret}: {log}");
    }
}
