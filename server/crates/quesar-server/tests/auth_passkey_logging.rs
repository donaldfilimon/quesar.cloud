//! No challenge, binding cookie, session token, signature or attestation
//! reaches the logs, and a possible clone is logged. The only test in the
//! binary because it installs a global subscriber.

mod common;
mod passkey_support;

use std::io::Write;
use std::sync::{Arc, Mutex};

use common::{Harness, ORIGIN};
use passkey_support::SoftBrowser;
use quesar_server::trace::request_span;
use serde_json::{Value, json};
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

fn text(value: &Value) -> String {
    value.as_str().unwrap().to_owned()
}

#[tokio::test]
async fn passkey_ceremonies_log_none_of_their_secrets() {
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
    let up = h.sign_up("logs@example.com").await;
    let session = up.session_cookie().unwrap();
    let mut secrets: Vec<(&str, String)> = vec![("session token", up.token().unwrap())];
    let mut browser = SoftBrowser::new();

    // A registration from the wrong origin (logs why), then a good one.
    let bad = h
        .post(
            "/passkey/register/options",
            &json!({}),
            &[("cookie", &session)],
        )
        .await;
    let options = bad.result()["options"].clone();
    let binding = bad.set_cookies()[0].split(';').next().unwrap().to_owned();
    secrets.push(("registration challenge", text(&options["challenge"])));
    secrets.push((
        "registration binding",
        binding.split_once('=').unwrap().1.to_owned(),
    ));
    let credential = browser.create("https://evil.quesar.cloud", &options);
    secrets.push((
        "attestation",
        text(&credential["response"]["attestationObject"]),
    ));
    h.post(
        "/passkey/register/verify",
        &json!({ "flowId": bad.result()["flowId"], "credential": credential }),
        &[("cookie", &format!("{session}; {binding}"))],
    )
    .await;

    let good = h
        .post(
            "/passkey/register/options",
            &json!({}),
            &[("cookie", &session)],
        )
        .await;
    let binding = good.set_cookies()[0].split(';').next().unwrap().to_owned();
    let credential = browser.create(ORIGIN, &good.result()["options"]);
    let verified = h
        .post(
            "/passkey/register/verify",
            &json!({ "flowId": good.result()["flowId"], "credential": credential }),
            &[("cookie", &format!("{session}; {binding}"))],
        )
        .await;
    assert_eq!(verified.status, axum::http::StatusCode::OK);
    let credential_id = text(&credential["id"]);

    // A good sign-in, then one the clone check refuses.
    for clone in [false, true] {
        if clone {
            sqlx::query(
                "update auth_passkeys set credential = jsonb_set(credential, '{cred,counter}', '1000')",
            )
            .execute(&h.db.pool)
            .await
            .unwrap();
        }
        let started = h
            .post("/passkey/authenticate/options", &json!({}), &[])
            .await;
        let binding = started.set_cookies()[0]
            .split(';')
            .next()
            .unwrap()
            .to_owned();
        let assertion = browser.get(ORIGIN, &started.result()["options"], &credential_id);
        secrets.push((
            "sign-in challenge",
            text(&started.result()["options"]["challenge"]),
        ));
        secrets.push((
            "sign-in binding",
            binding.split_once('=').unwrap().1.to_owned(),
        ));
        secrets.push(("signature", text(&assertion["response"]["signature"])));
        secrets.push((
            "client data",
            text(&assertion["response"]["clientDataJSON"]),
        ));
        let reply = h
            .post(
                "/passkey/authenticate/verify",
                &json!({ "flowId": started.result()["flowId"], "credential": assertion }),
                &[("cookie", &binding)],
            )
            .await;
        if clone {
            assert_eq!(reply.status, axum::http::StatusCode::UNAUTHORIZED);
        } else {
            assert_eq!(reply.status, axum::http::StatusCode::OK);
            secrets.push(("sign-in session token", reply.token().unwrap()));
        }
    }

    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        log.contains("/api/auth/passkey/register/options"),
        "nothing was traced"
    );
    assert!(
        log.contains("passkey registration did not verify"),
        "the wrong-origin failure logged nothing: {log}"
    );
    assert!(
        log.contains("possible cloned authenticator"),
        "the clone check logged nothing"
    );
    for (what, secret) in secrets {
        assert!(!secret.is_empty(), "{what} is empty");
        assert!(!log.contains(&secret), "the log holds the {what}");
    }
    h.finish().await;
}
