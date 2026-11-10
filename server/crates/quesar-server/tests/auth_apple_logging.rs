//! No Apple private key, client secret, authorization code, state, binding,
//! nonce, ID token, `user` name or session token reaches the logs, and a key
//! that cannot be used is warned about without being shown. This is the only
//! test in the binary because it installs a global subscriber.

mod apple_support;
mod common;

use std::io::Write;
use std::sync::{Arc, Mutex};

use apple_support::{Apple, CODE, form};
use quesar_auth::mock_idp::{Signing, sign};
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
async fn apple_sign_in_logs_none_of_its_secrets() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_span_events(FmtSpan::FULL)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    // A key that cannot be used: warned about, never shown.
    let bad = Apple::with_key(
        "-----BEGIN PRIVATE KEY-----\nGARBAGEKEYMATERIAL\n-----END PRIVATE KEY-----",
    )
    .await;
    bad.cleanup().await;

    let mut h = Apple::new().await;
    h.app = h
        .app
        .clone()
        .layer(TraceLayer::new_for_http().make_span_with(request_span));
    let mut secrets: Vec<(&str, String)> = vec![
        ("authorization code", CODE.to_owned()),
        (
            "private key body",
            h.key.pem.lines().nth(1).unwrap().to_owned(),
        ),
        ("user name", "Lovelace".to_owned()),
    ];

    // A good sign-in with a first-sign-in `user`.
    let started = h.start().await;
    let claims = h.claims(&started.nonce);
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let post = h
        .post_code(
            &started,
            Some(r#"{"name":{"firstName":"Ada","lastName":"Lovelace"},"email":"ada@example.com"}"#),
        )
        .await;
    let get = h.follow(&post, &started).await;
    assert_eq!(get.status, axum::http::StatusCode::SEE_OTHER);
    secrets.push(("state", started.state.clone()));
    secrets.push(("nonce", started.nonce.clone()));
    secrets.push((
        "binding",
        started.binding.split_once('=').unwrap().1.to_owned(),
    ));
    secrets.push(("id token", sign(&claims, Signing::Primary)));
    secrets.push(("session token", get.token().expect("session")));
    let token_request = h.idp.requests_to("/token").remove(0);
    secrets.push((
        "verifier",
        token_request.field("code_verifier").unwrap().to_owned(),
    ));
    secrets.push((
        "client secret",
        token_request.field("client_secret").unwrap().to_owned(),
    ));

    // Failures that log: a rejected token, a replayed POST, an unknown state.
    let failing = h.start().await;
    let mut bad_claims = h.claims(&failing.nonce);
    bad_claims["aud"] = json!("someone-else");
    h.idp.respond_with_id_token(&bad_claims, Signing::Primary);
    let post = h.post_code(&failing, None).await;
    h.post_callback(form(&[
        ("code", "replayed-code-value"),
        ("state", &failing.state),
    ]))
    .await;
    h.follow(&post, &failing).await;
    secrets.push(("state", failing.state.clone()));
    secrets.push(("replayed code", "replayed-code-value".to_owned()));
    secrets.push(("rejected id token", sign(&bad_claims, Signing::Primary)));
    h.post_callback(form(&[
        ("code", CODE),
        ("state", "attacker-chosen-state-value"),
    ]))
    .await;
    secrets.push(("unknown state", "attacker-chosen-state-value".to_owned()));

    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        log.contains("/api/auth/callback/apple"),
        "nothing was traced: {log}"
    );
    assert!(
        log.contains("Apple sign-in is off"),
        "the unusable key was not warned about"
    );
    assert!(
        log.contains("oauth code exchange failed"),
        "the failure path logged nothing"
    );
    assert!(
        !log.contains("GARBAGEKEYMATERIAL"),
        "the log shows the bad key"
    );
    for (what, secret) in secrets {
        assert!(!secret.is_empty(), "{what} is empty");
        assert!(!log.contains(&secret), "the log holds the {what}");
    }
    h.cleanup().await;
}
