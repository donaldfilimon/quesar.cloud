//! `quesar_services::turnstile::Verifier` against an in-process siteverify.
//! The mock records the form it received; nothing leaves the machine.

use std::io::Write;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use quesar_server::api::remote_ip;
use quesar_server::auth::extract::ClientIp;
use quesar_services::turnstile::{TurnstileConfig, Verifier};
use serde_json::{Value, json};
use tokio::net::TcpListener;
use tracing_subscriber::fmt::MakeWriter;

const SECRET: &str = "turnstile-secret-must-not-leak";
const TOKEN: &str = "valid-token-0123456789";

type Form = Vec<(String, String)>;

#[derive(Clone)]
enum Answer {
    Json(StatusCode, Vec<u8>),
    Redirect(String),
}

struct Mock {
    url: String,
    forms: Arc<Mutex<Vec<Form>>>,
}

impl Mock {
    async fn start(answer: Answer) -> Self {
        #[derive(Clone)]
        struct Shared {
            answer: Answer,
            forms: Arc<Mutex<Vec<Form>>>,
        }
        async fn handle(State(shared): State<Shared>, body: Bytes) -> Response {
            let form = url::form_urlencoded::parse(&body)
                .map(|(k, v)| (k.into_owned(), v.into_owned()))
                .collect();
            shared.forms.lock().unwrap().push(form);
            match shared.answer {
                Answer::Json(status, body) => {
                    (status, [(header::CONTENT_TYPE, "application/json")], body).into_response()
                }
                Answer::Redirect(to) => {
                    (StatusCode::FOUND, [(header::LOCATION, to)]).into_response()
                }
            }
        }
        let forms = Arc::new(Mutex::new(Vec::new()));
        let app = Router::new()
            .route("/siteverify", post(handle))
            .with_state(Shared {
                answer,
                forms: Arc::clone(&forms),
            });
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address: SocketAddr = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        Self {
            url: format!("http://{address}/siteverify"),
            forms,
        }
    }

    async fn says(body: Value) -> Self {
        Self::start(Answer::Json(StatusCode::OK, body.to_string().into_bytes())).await
    }

    fn calls(&self) -> usize {
        self.forms.lock().unwrap().len()
    }

    fn last(&self) -> Form {
        self.forms.lock().unwrap().last().cloned().unwrap()
    }
}

fn good() -> Value {
    json!({"success": true, "action": "inquiry", "hostname": "quesar.cloud"})
}

fn config(url: &str, pairs: &[(&str, &str)]) -> TurnstileConfig {
    let pairs: Vec<(String, String)> = pairs
        .iter()
        .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
        .collect();
    let mut config = TurnstileConfig::from_lookup(move |name| {
        pairs
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
    });
    config.siteverify_url = url.to_owned();
    config
}

fn ready(url: &str) -> TurnstileConfig {
    config(
        url,
        &[
            ("TURNSTILE_SITE_KEY", "site-key"),
            ("TURNSTILE_SECRET", SECRET),
            ("TURNSTILE_HOSTNAMES", "quesar.cloud, WWW.quesar.cloud"),
        ],
    )
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap()
}

async fn verify(config: &TurnstileConfig, token: &str, ip: Option<&str>) -> bool {
    Verifier::new(&client(), config)
        .verify(token, "inquiry", ip)
        .await
}

#[tokio::test]
async fn fails_closed_without_a_secret_or_hostnames() {
    let mock = Mock::says(good()).await;
    let no_secret = config(
        &mock.url,
        &[
            ("TURNSTILE_SITE_KEY", "site-key"),
            ("TURNSTILE_HOSTNAMES", "quesar.cloud"),
        ],
    );
    assert!(!verify(&no_secret, TOKEN, None).await);
    let no_hosts = config(
        &mock.url,
        &[
            ("TURNSTILE_SITE_KEY", "site-key"),
            ("TURNSTILE_SECRET", SECRET),
        ],
    );
    assert!(!verify(&no_hosts, TOKEN, None).await);
    assert_eq!(mock.calls(), 0, "neither configuration calls out");
}

#[tokio::test]
async fn accepts_only_success_action_and_hostname_together() {
    let mock = Mock::says(good()).await;
    let config = ready(&mock.url);
    assert!(verify(&config, TOKEN, None).await);
    let form = mock.last();
    assert!(form.contains(&("secret".into(), SECRET.into())));
    assert!(form.contains(&("response".into(), TOKEN.into())));
    assert!(!form.iter().any(|(k, _)| k == "remoteip"));

    for (case, body) in [
        (
            "success false",
            json!({"success": false, "action": "inquiry", "hostname": "quesar.cloud"}),
        ),
        (
            "wrong action",
            json!({"success": true, "action": "login", "hostname": "quesar.cloud"}),
        ),
        (
            "no action",
            json!({"success": true, "hostname": "quesar.cloud"}),
        ),
        (
            "wrong hostname",
            json!({"success": true, "action": "inquiry", "hostname": "evil.example"}),
        ),
        (
            "success as a string",
            json!({"success": "true", "action": "inquiry", "hostname": "quesar.cloud"}),
        ),
        (
            "missing hostname",
            json!({"success": true, "action": "inquiry"}),
        ),
        (
            "hostname not a string",
            json!({"success": true, "action": "inquiry", "hostname": 7}),
        ),
    ] {
        let mock = Mock::says(body).await;
        assert!(!verify(&ready(&mock.url), TOKEN, None).await, "{case}");
        assert_eq!(mock.calls(), 1, "{case}");
    }
}

#[tokio::test]
async fn hostname_case_is_ignored() {
    let mock =
        Mock::says(json!({"success": true, "action": "inquiry", "hostname": "WWW.Quesar.Cloud"}))
            .await;
    assert!(verify(&ready(&mock.url), TOKEN, None).await);
}

#[tokio::test]
async fn token_length_is_measured_in_utf16_units_and_never_reaches_the_mock_out_of_range() {
    let mock = Mock::says(good()).await;
    let config = ready(&mock.url);
    assert!(!verify(&config, "123456789", None).await, "9 units");
    assert!(
        !verify(&config, &"x".repeat(4097), None).await,
        "4097 units"
    );
    // Five astral characters are 10 UTF-16 units but 5 chars.
    assert!(
        !verify(&config, &"\u{1F600}".repeat(4), None).await,
        "8 units"
    );
    assert_eq!(mock.calls(), 0);
    assert!(
        verify(&config, &"\u{1F600}".repeat(5), None).await,
        "10 units"
    );
    assert!(verify(&config, &"x".repeat(4096), None).await, "4096 units");
    assert_eq!(mock.calls(), 2);
}

#[tokio::test]
async fn an_unreachable_endpoint_is_false() {
    let closed = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/siteverify", closed.local_addr().unwrap());
    drop(closed);
    assert!(!verify(&ready(&url), TOKEN, None).await);
}

#[tokio::test]
async fn an_http_error_status_is_false() {
    let mock = Mock::start(Answer::Json(
        StatusCode::INTERNAL_SERVER_ERROR,
        good().to_string().into_bytes(),
    ))
    .await;
    assert!(!verify(&ready(&mock.url), TOKEN, None).await);
    assert_eq!(mock.calls(), 1);
}

#[tokio::test]
async fn unparsable_json_is_false() {
    let mock = Mock::start(Answer::Json(StatusCode::OK, b"not json".to_vec())).await;
    assert!(!verify(&ready(&mock.url), TOKEN, None).await);
}

#[tokio::test]
async fn a_redirect_is_not_followed() {
    let second = Mock::says(good()).await;
    let first = Mock::start(Answer::Redirect(second.url.clone())).await;
    assert!(!verify(&ready(&first.url), TOKEN, None).await);
    assert_eq!(first.calls(), 1);
    assert_eq!(second.calls(), 0, "the redirect target is never called");
}

#[tokio::test]
async fn a_response_over_64_kib_is_false_even_if_it_would_say_yes() {
    let mut body = good().to_string().into_bytes();
    // Valid JSON with 65 KiB of padding inside a string.
    body.truncate(body.len() - 1);
    body.extend_from_slice(b",\"pad\":\"");
    body.extend(std::iter::repeat_n(b'a', 65 * 1024));
    body.extend_from_slice(b"\"}");
    let mock = Mock::start(Answer::Json(StatusCode::OK, body)).await;
    assert!(!verify(&ready(&mock.url), TOKEN, None).await);
    assert_eq!(mock.calls(), 1);
}

#[tokio::test]
async fn a_slow_endpoint_times_out_to_false() {
    // Accepts the connection and never answers.
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/siteverify", listener.local_addr().unwrap());
    tokio::spawn(async move {
        let mut held = Vec::new();
        while let Ok(connection) = listener.accept().await {
            held.push(connection);
        }
    });
    tokio::time::pause();
    assert!(!verify(&ready(&url), TOKEN, None).await);
}

#[tokio::test]
async fn remote_ip_is_forwarded_only_for_a_real_client_address() {
    let mock = Mock::says(good()).await;
    let config = ready(&mock.url);

    let sent = remote_ip(&ClientIp("203.0.113.7".into()));
    assert_eq!(sent.as_deref(), Some("203.0.113.7"));
    assert!(verify(&config, TOKEN, sent.as_deref()).await);
    assert!(
        mock.last()
            .contains(&("remoteip".into(), "203.0.113.7".into()))
    );

    for value in [
        "127.0.0.1",
        "::1",
        "0.0.0.0",
        "::",
        "::ffff:127.0.0.1",
        "unknown",
        "1.2.3.4, evil",
        "",
    ] {
        let sent = remote_ip(&ClientIp(value.into()));
        assert_eq!(sent, None, "{value:?}");
        assert!(verify(&config, TOKEN, sent.as_deref()).await);
        assert!(
            !mock.last().iter().any(|(k, _)| k == "remoteip"),
            "{value:?} must not be forwarded"
        );
    }
    let ipv6 = remote_ip(&ClientIp("2001:db8::7".into()));
    assert_eq!(ipv6.as_deref(), Some("2001:db8::7"));
}

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
async fn failures_log_neither_the_token_nor_the_secret() {
    let captured = Captured::default();
    let subscriber = tracing_subscriber::fmt()
        // Our own events only: hyper's trace lines name the peer address,
        // which no production filter enables.
        .with_env_filter("quesar_services=trace")
        .with_writer(captured.clone())
        .finish();
    // Global, not thread-scoped: a scoped default races with other tests'
    // threads over tracing's callsite cache. The other tests' failures log into
    // the same buffer, which the assertions below hold to the same rule.
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let closed = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let dead = format!("http://{}/siteverify", closed.local_addr().unwrap());
    drop(closed);
    let body_with_secrets = format!("{{\"leak\":\"{SECRET} {TOKEN}\"");
    let broken = Mock::start(Answer::Json(StatusCode::OK, body_with_secrets.into_bytes())).await;
    let server_error = Mock::start(Answer::Json(
        StatusCode::INTERNAL_SERVER_ERROR,
        format!("{SECRET} {TOKEN}").into_bytes(),
    ))
    .await;
    for url in [&dead, &broken.url, &server_error.url] {
        assert!(!verify(&ready(url), TOKEN, None).await);
    }

    let logged = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
    assert!(
        logged.contains("turnstile verification failed closed"),
        "{logged}"
    );
    assert!(!logged.contains(TOKEN), "{logged}");
    assert!(!logged.contains(SECRET), "{logged}");
    assert!(!logged.contains("siteverify"), "no URL: {logged}");
    assert!(!logged.contains("127.0.0.1"), "no address: {logged}");
}
