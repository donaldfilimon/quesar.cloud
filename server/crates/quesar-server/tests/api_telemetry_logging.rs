//! A failing telemetry request logs one fixed line and nothing about the
//! visitor: no address, user agent, cookie or driver text. This is the only
//! test in the binary because it installs a global subscriber.

mod common;

use std::io::Write;
use std::sync::{Arc, Mutex};

use axum::http::{Method, StatusCode};
use common::{Harness, full_request};
use serde_json::{Value, json};
use tracing_subscriber::fmt::MakeWriter;

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl Captured {
    /// Everything logged since the last call, as text and parsed JSON lines.
    fn take(&self) -> (String, Vec<Value>) {
        let bytes = std::mem::take(&mut *self.0.lock().unwrap());
        let text = String::from_utf8(bytes).unwrap();
        let lines = text
            .lines()
            .map(|line| serde_json::from_str(line).unwrap())
            .collect();
        (text, lines)
    }
}

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

const ADDRESS: &str = "198.51.100.200";
const AGENT: &str = "PrivateAgent/1.0 (telemetry-log-probe)";

/// The messages logged at WARN or ERROR.
fn problems(lines: &[Value]) -> Vec<String> {
    lines
        .iter()
        .filter(|line| matches!(line["level"].as_str(), Some("ERROR" | "WARN")))
        .map(|line| line["fields"]["message"].as_str().unwrap_or("").to_owned())
        .collect()
}

/// `text` is everything logged, TRACE included: the visitor must not appear
/// anywhere. Driver text is judged on the warnings and errors, because sqlx's
/// own statement lines name the table by design (static SQL, no values).
fn assert_clean(text: &str, lines: &[Value], cookie_token: &str) {
    for secret in [ADDRESS, AGENT, cookie_token, "/private-referrer"] {
        assert!(!text.contains(secret), "the log contains {secret}");
    }
    let serious = lines
        .iter()
        .filter(|line| matches!(line["level"].as_str(), Some("ERROR" | "WARN")))
        .map(Value::to_string)
        .collect::<Vec<_>>()
        .join("\n");
    for driver in [
        "telemetry_events",
        "rate_limits",
        "does not exist",
        "42P01",
        "postgres://",
    ] {
        assert!(
            !serious.contains(driver),
            "a warning contains driver text {driver}: {serious}"
        );
    }
}

#[tokio::test]
async fn failures_log_one_fixed_line_and_nothing_about_the_visitor() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let h = Harness::new().await;
    let cookie = h.sign_up("log-probe@example.com").await.session_cookie();
    let cookie = cookie.unwrap();
    let token = cookie.split_once('=').unwrap().1.to_owned();
    let send = || {
        let request = full_request(
            Method::POST,
            "/api/telemetry",
            json!({ "event": "page_view", "path": "/about" }).to_string(),
            ADDRESS.to_owned(),
            &[
                ("cookie", cookie.as_str()),
                ("user-agent", AGENT),
                ("referer", "https://quesar.cloud/private-referrer"),
            ],
        );
        h.send(request)
    };

    // A stored event logs nothing at all about the visitor.
    captured.take();
    assert_eq!(send().await.status, StatusCode::NO_CONTENT);
    let (text, lines) = captured.take();
    assert!(problems(&lines).is_empty());
    assert_clean(&text, &lines, &token);

    // A missing table fails the insert: one fixed line, still a 204.
    sqlx::query("drop table telemetry_events")
        .execute(&h.db.pool)
        .await
        .unwrap();
    captured.take();
    assert_eq!(send().await.status, StatusCode::NO_CONTENT);
    let (text, lines) = captured.take();
    assert_eq!(
        problems(&lines),
        vec!["database error saving telemetry event"]
    );
    assert_clean(&text, &lines, &token);

    // A failing limiter has its own fixed line.
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    captured.take();
    assert_eq!(send().await.status, StatusCode::NO_CONTENT);
    let (text, lines) = captured.take();
    assert_eq!(problems(&lines), vec!["telemetry rate limit unavailable"]);
    assert_clean(&text, &lines, &token);

    h.finish().await;
}
