//! Neither the password nor the session token reaches the logs. This is the
//! only test in the binary because it installs a global subscriber, which
//! also catches the hashing threads.

mod common;

use std::io::Write;
use std::sync::{Arc, Mutex};

use axum::http::StatusCode;
use common::{Harness, PASSWORD};
use quesar_server::trace::request_span;
use serde_json::json;
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
async fn sign_up_and_sign_in_log_neither_the_password_nor_the_token() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_span_events(FmtSpan::FULL)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let mut h = Harness::new().await;
    h.app = h
        .app
        .clone()
        .layer(TraceLayer::new_for_http().make_span_with(request_span));

    let up = h.sign_up("ada@example.com").await;
    let signed_in = h.sign_in("ada@example.com", PASSWORD).await;
    let wrong = h
        .sign_in("ada@example.com", "synthetic-wrong-password")
        .await;
    assert_eq!(wrong.status, StatusCode::UNAUTHORIZED);
    let short = h
        .post(
            "/sign-in",
            &json!({ "email": "ada@example.com", "password": "pw" }),
            &[],
        )
        .await;
    assert_eq!(short.status, StatusCode::UNAUTHORIZED);

    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        log.contains("/api/auth/sign-up"),
        "nothing was traced: {log}"
    );
    assert!(log.contains("/api/auth/sign-in"));
    let secrets = [
        PASSWORD.to_owned(),
        "synthetic-wrong-password".to_owned(),
        up.token().unwrap(),
        signed_in.token().unwrap(),
    ];
    for secret in &secrets {
        assert!(
            !log.contains(secret.as_str()),
            "the log contains a secret: {secret}"
        );
    }
    // The password's hash is not logged either.
    let stored: String = sqlx::query_scalar(r#"select password from "account""#)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert!(!log.contains(&stored));
    h.finish().await;
}
