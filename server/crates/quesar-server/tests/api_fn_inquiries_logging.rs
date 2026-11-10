//! A failing inquiry logs one fixed line: no database driver text, no name,
//! email or message. This is the only test in the binary because it installs
//! a global subscriber (the rule of `inquiry-logging.server.test.ts`).

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
    /// Everything logged since the last call, as parsed JSON lines.
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

const PRIVATE: [&str; 3] = [
    "Synthetic Sender",
    "private-sender@example.invalid",
    "private-inquiry-body",
];

fn body(name: &str) -> String {
    json!({
        "name": name,
        "email": "private-sender@example.invalid",
        "company": "",
        "topic": "Services",
        "message": "private-inquiry-body, long enough to pass",
        "turnstileToken": "",
    })
    .to_string()
}

/// The messages logged at WARN or ERROR.
fn problems(lines: &[Value]) -> Vec<String> {
    lines
        .iter()
        .filter(|line| matches!(line["level"].as_str(), Some("ERROR" | "WARN")))
        .map(|line| line["fields"]["message"].as_str().unwrap_or("").to_owned())
        .collect()
}

fn assert_clean(text: &str) {
    for secret in PRIVATE {
        assert!(!text.contains(secret), "the log contains {secret}");
    }
    for driver in [
        "invalid byte sequence",
        "22021",
        "does not exist",
        "42P01",
        "postgres://",
    ] {
        assert!(
            !text.contains(driver),
            "the log contains driver text {driver}: {}",
            text.lines()
                .filter(|l| l.contains(driver))
                .collect::<Vec<_>>()
                .join("\n")
        );
    }
}

#[tokio::test]
async fn failures_log_one_fixed_line_and_no_content() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let h = Harness::new().await;
    let send = |name: &str| {
        let request = full_request(
            Method::POST,
            "/api/fn/inquiries.sendInquiry",
            body(name),
            h.fresh_ip(),
            &[],
        );
        h.send(request)
    };
    let unavailable = |reply: &common::Reply| {
        assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
        assert_eq!(reply.result()["code"], "unavailable");
    };

    // A NUL passes the rules and fails the insert; the answer is a result,
    // not a 500.
    captured.take();
    unavailable(&send("Synthetic\u{0}Sender").await);
    let (text, lines) = captured.take();
    assert_eq!(problems(&lines), vec!["database error saving inquiry"]);
    assert_clean(&text);

    // A missing table fails the insert the same way.
    sqlx::query("drop table inquiries")
        .execute(&h.db.pool)
        .await
        .unwrap();
    captured.take();
    unavailable(&send("Synthetic Sender").await);
    let (text, lines) = captured.take();
    assert_eq!(problems(&lines), vec!["database error saving inquiry"]);
    assert_clean(&text);

    // A failing limiter has its own fixed line, and nothing is inserted.
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    captured.take();
    unavailable(&send("Synthetic Sender").await);
    let (text, lines) = captured.take();
    assert_eq!(problems(&lines), vec!["inquiry rate limit unavailable"]);
    assert_clean(&text);

    h.finish().await;
}
