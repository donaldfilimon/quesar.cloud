//! No authorization code, state, binding, PKCE verifier, nonce, ID token,
//! client secret or session token reaches the logs. This is the only test in
//! the binary because it installs a global subscriber, which also catches
//! background tasks.

mod common;
mod oauth_support;

use std::io::Write;
use std::sync::{Arc, Mutex};

use oauth_support::{CLIENT_SECRET, CODE, OAuth};
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
async fn oauth_sign_in_logs_none_of_its_secrets() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_span_events(FmtSpan::FULL)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let mut h = OAuth::new().await;
    h.app = h
        .app
        .clone()
        .layer(TraceLayer::new_for_http().make_span_with(request_span));

    let mut secrets: Vec<(&str, String)> = vec![
        ("authorization code", CODE.to_owned()),
        ("client secret", CLIENT_SECRET.to_owned()),
    ];

    // A good sign-in.
    let started = h.start(&json!({})).await;
    let claims = h.claims(&started.nonce);
    h.idp.respond_with_id_token(&claims, Signing::Primary);
    let reply = h.finish(&started).await;
    assert_eq!(reply.status, axum::http::StatusCode::SEE_OTHER);
    secrets.push(("state", started.state.clone()));
    secrets.push(("nonce", started.nonce.clone()));
    secrets.push((
        "binding",
        started.binding.split_once('=').unwrap().1.to_owned(),
    ));
    secrets.push(("id token", sign(&claims, Signing::Primary)));
    secrets.push(("session token", reply.token().expect("session")));
    let token_request = h.idp.requests_to("/token").remove(0);
    secrets.push((
        "verifier",
        token_request.field("code_verifier").unwrap().to_owned(),
    ));

    // Failures that log: a bad token, a token endpoint error, a replay.
    let failing = h.start(&json!({})).await;
    let mut bad = h.claims(&failing.nonce);
    bad["aud"] = json!("someone-else");
    let bad_token = sign(&bad, Signing::Primary);
    h.idp.respond_with_id_token(&bad, Signing::Primary);
    h.finish(&failing).await;
    secrets.push(("rejected id token", bad_token));
    secrets.push(("state", failing.state.clone()));
    secrets.push((
        "binding",
        failing.binding.split_once('=').unwrap().1.to_owned(),
    ));
    let failing = h.start(&json!({})).await;
    h.idp
        .respond_with_token_body(400, "{\"error\":\"invalid_grant\"}".to_owned());
    h.finish(&failing).await;
    secrets.push(("state", failing.state.clone()));
    h.finish(&failing).await; // replay
    h.callback(
        &format!("code={CODE}&state=attacker-chosen-state-value"),
        None,
    )
    .await;
    secrets.push(("unknown state", "attacker-chosen-state-value".to_owned()));

    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        log.contains("/api/auth/callback/google"),
        "nothing was traced: {log}"
    );
    assert!(log.contains("/api/auth/oauth/google/start"));
    assert!(
        log.contains("oauth code exchange failed"),
        "the failure path logged nothing"
    );
    for (what, secret) in secrets {
        assert!(!secret.is_empty(), "{what} is empty");
        assert!(!log.contains(&secret), "the log holds the {what}");
    }
    h.cleanup().await;
}
