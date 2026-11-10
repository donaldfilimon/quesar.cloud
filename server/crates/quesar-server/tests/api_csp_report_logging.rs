//! What a CSP report writes to the log: one escaped, truncated `warn` event
//! for a non-empty report, nothing for a refused, empty or rate-limited one,
//! and nothing about the visitor. This is the only test in the binary because
//! it installs a global subscriber.

mod common;

use std::io::Write;
use std::sync::{Arc, Mutex};

use axum::http::{Method, StatusCode};
use common::{Harness, full_request};
use serde_json::Value;
use tracing_subscriber::fmt::MakeWriter;

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl Captured {
    /// Everything logged since the last call: the raw text and the JSON lines.
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

const ADDRESS: &str = "198.51.100.77";
const AGENT: &str = "PrivateAgent/1.0 (csp-log-probe)";

async fn send(h: &Harness, ip: &str, body: Vec<u8>) -> StatusCode {
    let mut request = full_request(
        Method::POST,
        "/api/csp-report",
        String::new(),
        ip.to_owned(),
        &[
            ("user-agent", AGENT),
            ("cookie", "__Host-quesar.session_token=probe"),
        ],
    );
    *request.body_mut() = axum::body::Body::from(body);
    h.send(request).await.status
}

/// The WARN and ERROR events: (message, report field).
fn problems(lines: &[Value]) -> Vec<(String, Option<String>)> {
    lines
        .iter()
        .filter(|line| matches!(line["level"].as_str(), Some("ERROR" | "WARN")))
        .map(|line| {
            (
                line["fields"]["message"].as_str().unwrap_or("").to_owned(),
                line["fields"]["report"].as_str().map(str::to_owned),
            )
        })
        .collect()
}

fn reports(lines: &[Value]) -> Vec<String> {
    problems(lines)
        .into_iter()
        .filter(|(message, _)| message == "CSP violation report")
        .filter_map(|(_, report)| report)
        .collect()
}

#[tokio::test]
async fn reports_are_logged_escaped_truncated_and_only_when_present() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::TRACE)
        .with_writer(captured.clone())
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();
    let h = Harness::new().await;

    // A legacy body is logged whole, as one event.
    let body =
        r#"{"csp-report":{"violated-directive":"script-src","blocked-uri":"https://x.test"}}"#;
    captured.take();
    assert_eq!(
        send(&h, &h.fresh_ip(), body.as_bytes().to_vec()).await,
        StatusCode::NO_CONTENT
    );
    let (text, lines) = captured.take();
    let logged = reports(&lines);
    assert_eq!(logged.len(), 1);
    // `Debug` quotes the text, so the quotes inside it are escaped.
    assert_eq!(logged[0], format!("{body:?}"));
    // Nothing about the visitor.
    for secret in [ADDRESS, AGENT, "session_token=probe"] {
        assert!(!text.contains(secret), "the log contains {secret}");
    }

    // A Reporting API array is cut to the limit.
    let batch = format!(
        r#"[{{"type":"csp-violation","body":{{"blockedURL":"{}"}}}}]"#,
        "x".repeat(5000)
    );
    send(&h, &h.fresh_ip(), batch.clone().into_bytes()).await;
    let (_, lines) = captured.take();
    let logged = reports(&lines);
    assert_eq!(logged.len(), 1);
    let expected: String = batch.chars().take(2000).collect();
    assert_eq!(logged[0], format!("{expected:?}"));

    // Newlines and ANSI escapes cannot forge or repaint a log line.
    let hostile = "line one\nWARN forged line\r\u{1b}[31mred\u{1b}[0m";
    send(&h, &h.fresh_ip(), hostile.as_bytes().to_vec()).await;
    let (text, lines) = captured.take();
    // Every event is one physical line, so the hostile text forged no extra
    // one; and exactly one of them is the report.
    assert!(text.lines().all(|line| line.starts_with('{')));
    assert_eq!(lines.len(), text.lines().count());
    assert!(!text.contains('\u{1b}'));
    assert!(!text.contains("\r"));
    let logged = reports(&lines);
    assert_eq!(logged, vec![format!("{hostile:?}")]);
    assert!(logged[0].contains(r"\n") && logged[0].contains(r"\u{1b}"));

    // Invalid UTF-8 is logged with replacement characters, and does not fail.
    assert_eq!(
        send(&h, &h.fresh_ip(), vec![b'a', 0xff, b'b']).await,
        StatusCode::NO_CONTENT
    );
    let (_, lines) = captured.take();
    assert_eq!(reports(&lines), vec![format!("{:?}", "a\u{fffd}b")]);

    // An empty body logs nothing.
    assert_eq!(
        send(&h, &h.fresh_ip(), Vec::new()).await,
        StatusCode::NO_CONTENT
    );
    let (_, lines) = captured.take();
    assert!(problems(&lines).is_empty());

    // An oversize body is refused and its content is not logged.
    assert_eq!(
        send(&h, &h.fresh_ip(), vec![b'z'; 64 * 1024 + 1]).await,
        StatusCode::PAYLOAD_TOO_LARGE
    );
    let (text, lines) = captured.take();
    assert!(problems(&lines).is_empty());
    assert!(!text.contains("zzzz"));

    // Sixty are logged; the sixty-first is 429 and logs nothing.
    let ip = h.fresh_ip();
    for i in 0..60 {
        assert_eq!(
            send(&h, &ip, b"{}".to_vec()).await,
            StatusCode::NO_CONTENT,
            "{i}"
        );
    }
    let (_, lines) = captured.take();
    assert_eq!(reports(&lines).len(), 60);
    assert_eq!(
        send(&h, &ip, b"{\"secret\":1}".to_vec()).await,
        StatusCode::TOO_MANY_REQUESTS
    );
    let (text, lines) = captured.take();
    assert!(problems(&lines).is_empty());
    assert!(!text.contains("secret"));

    // A failing limiter logs one fixed line, never the report.
    sqlx::query("drop table rate_limits")
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(
        send(&h, &h.fresh_ip(), b"{\"secret\":2}".to_vec()).await,
        StatusCode::NO_CONTENT
    );
    let (text, lines) = captured.take();
    assert_eq!(
        problems(&lines),
        vec![("csp report rate limit unavailable".to_owned(), None)]
    );
    assert!(!text.contains("secret"));
    let serious = lines
        .iter()
        .filter(|line| matches!(line["level"].as_str(), Some("ERROR" | "WARN")))
        .map(Value::to_string)
        .collect::<String>();
    assert!(!serious.contains("rate_limits") && !serious.contains("42P01"));

    h.finish().await;
}
