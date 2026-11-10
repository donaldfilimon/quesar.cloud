//! An in-process mock identity provider, for tests only.
//!
//! It serves `/token`, `/jwks` and `/userinfo` on `127.0.0.1:<random port>`,
//! records every request it receives and signs ID tokens with the FAKE RSA key
//! in `tests/fixtures/` (see the README there). Claims are whatever the test
//! sets. Compiled into `quesar-auth` under the `test-support` feature so that
//! `quesar-server`'s tests can use it too.
#![allow(clippy::missing_panics_doc)]

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde_json::{Value, json};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;

const PRIMARY_PEM: &str = include_str!("../fixtures/fake-rsa-primary.pem");
const OTHER_PEM: &str = include_str!("../fixtures/fake-rsa-other.pem");
const PRIMARY_JWKS: &str = include_str!("../fixtures/fake-jwks.json");
const OTHER_JWKS: &str = include_str!("../fixtures/fake-jwks-other.json");
pub const PRIMARY_KID: &str = "fake-primary";
pub const OTHER_KID: &str = "fake-other";

/// How an ID token is signed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Signing {
    /// RS256 with the key the JWKS publishes.
    Primary,
    /// RS256 with a key the JWKS does not publish, under its own `kid`.
    UnknownKey,
    /// RS256 with the unpublished key but claiming the published `kid`.
    ForgedAsPrimary,
    /// HS256 (the algorithm-confusion attack), claiming the published `kid`.
    Hs256,
    /// `alg: none`, no signature.
    NoneAlg,
}

/// One request the mock received.
#[derive(Debug, Clone)]
pub struct Recorded {
    pub method: String,
    pub path: String,
    pub query: String,
    pub authorization: Option<String>,
    /// The form-encoded body, decoded.
    pub form: Vec<(String, String)>,
}

impl Recorded {
    pub fn field(&self, name: &str) -> Option<&str> {
        self.form
            .iter()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.as_str())
    }
}

enum TokenBehavior {
    Respond { status: u16, body: String },
    Redirect(String),
}

struct State_ {
    token: TokenBehavior,
    jwks: String,
    userinfo: String,
    requests: Vec<Recorded>,
}

struct Shared {
    state: Mutex<State_>,
}

impl Shared {
    fn lock(&self) -> std::sync::MutexGuard<'_, State_> {
        self.state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub struct MockIdp {
    addr: SocketAddr,
    shared: Arc<Shared>,
    task: JoinHandle<()>,
}

impl Drop for MockIdp {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn b64(value: &Value) -> String {
    URL_SAFE_NO_PAD.encode(value.to_string())
}

/// Signs `claims` as an ID token.
pub fn sign(claims: &Value, signing: Signing) -> String {
    let encode = |alg: Algorithm, kid: &str, key: &EncodingKey| {
        let mut header = Header::new(alg);
        header.kid = Some(kid.to_owned());
        jsonwebtoken::encode(&header, claims, key).expect("sign the test token")
    };
    let primary = || EncodingKey::from_rsa_pem(PRIMARY_PEM.as_bytes()).expect("fixture key");
    let other = || EncodingKey::from_rsa_pem(OTHER_PEM.as_bytes()).expect("fixture key");
    match signing {
        Signing::Primary => encode(Algorithm::RS256, PRIMARY_KID, &primary()),
        Signing::UnknownKey => encode(Algorithm::RS256, OTHER_KID, &other()),
        Signing::ForgedAsPrimary => encode(Algorithm::RS256, PRIMARY_KID, &other()),
        Signing::Hs256 => encode(
            Algorithm::HS256,
            PRIMARY_KID,
            &EncodingKey::from_secret(b"not-a-real-secret"),
        ),
        Signing::NoneAlg => format!(
            "{}.{}.",
            b64(&json!({ "alg": "none", "typ": "JWT", "kid": PRIMARY_KID })),
            b64(claims)
        ),
    }
}

fn token_json(id_token: &str) -> String {
    json!({
        "access_token": "mock-access-token",
        "token_type": "Bearer",
        "expires_in": 3600,
        "id_token": id_token,
    })
    .to_string()
}

async fn handle(State(shared): State<Arc<Shared>>, request: Request) -> Response {
    let (parts, body) = request.into_parts();
    let bytes = to_bytes(Body::new(body), 1024 * 1024)
        .await
        .unwrap_or_default();
    let recorded = Recorded {
        method: parts.method.to_string(),
        path: parts.uri.path().to_owned(),
        query: parts.uri.query().unwrap_or_default().to_owned(),
        authorization: parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        form: url::form_urlencoded::parse(&bytes)
            .map(|(key, value)| (key.into_owned(), value.into_owned()))
            .collect(),
    };
    let path = recorded.path.clone();
    let mut state = shared.lock();
    state.requests.push(recorded);
    let json_response = |status: u16, body: String| {
        let mut response = (
            StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            body,
        )
            .into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
        response
    };
    match path.as_str() {
        "/token" => match &state.token {
            TokenBehavior::Respond { status, body } => json_response(*status, body.clone()),
            TokenBehavior::Redirect(location) => {
                let mut response = StatusCode::FOUND.into_response();
                if let Ok(value) = HeaderValue::from_str(location) {
                    response.headers_mut().insert(header::LOCATION, value);
                }
                response
            }
        },
        "/jwks" => json_response(200, state.jwks.clone()),
        "/userinfo" => json_response(200, state.userinfo.clone()),
        _ => StatusCode::NOT_FOUND.into_response(),
    }
}

impl MockIdp {
    pub async fn start() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind mock");
        let addr = listener.local_addr().expect("mock address");
        let shared = Arc::new(Shared {
            state: Mutex::new(State_ {
                token: TokenBehavior::Respond {
                    status: 400,
                    body: json!({ "error": "invalid_grant" }).to_string(),
                },
                jwks: PRIMARY_JWKS.to_owned(),
                userinfo: "{}".to_owned(),
                requests: Vec::new(),
            }),
        });
        let app = Router::new().fallback(handle).with_state(shared.clone());
        let task = tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });
        Self { addr, shared, task }
    }

    pub fn base_url(&self) -> String {
        format!("http://{}", self.addr)
    }

    pub fn token_url(&self) -> String {
        format!("{}/token", self.base_url())
    }

    pub fn jwks_url(&self) -> String {
        format!("{}/jwks", self.base_url())
    }

    pub fn userinfo_url(&self) -> String {
        format!("{}/userinfo", self.base_url())
    }

    /// `/token` answers 200 with an ID token for `claims`.
    pub fn respond_with_id_token(&self, claims: &Value, signing: Signing) {
        self.respond_with_token_body(200, token_json(&sign(claims, signing)));
    }

    /// `/token` answers with this status and body.
    pub fn respond_with_token_body(&self, status: u16, body: String) {
        self.shared.lock().token = TokenBehavior::Respond { status, body };
    }

    /// `/token` answers 302 to `location`.
    pub fn redirect_token_to(&self, location: &str) {
        self.shared.lock().token = TokenBehavior::Redirect(location.to_owned());
    }

    /// `/jwks` publishes this key set.
    pub fn set_jwks(&self, jwks: &Value) {
        self.shared.lock().jwks = jwks.to_string();
    }

    /// `/jwks` publishes only the key behind [`Signing::UnknownKey`].
    pub fn publish_only_the_other_key(&self) {
        self.shared.lock().jwks = OTHER_JWKS.to_owned();
    }

    /// `/jwks` publishes both keys.
    pub fn publish_both_keys(&self) {
        let primary: Value = serde_json::from_str(PRIMARY_JWKS).expect("fixture");
        let other: Value = serde_json::from_str(OTHER_JWKS).expect("fixture");
        let mut keys = primary["keys"].as_array().cloned().unwrap_or_default();
        keys.extend(other["keys"].as_array().cloned().unwrap_or_default());
        self.shared.lock().jwks = json!({ "keys": keys }).to_string();
    }

    /// `/userinfo` answers with this JSON.
    pub fn set_userinfo(&self, body: &Value) {
        self.shared.lock().userinfo = body.to_string();
    }

    /// Every request so far, oldest first.
    pub fn requests(&self) -> Vec<Recorded> {
        self.shared.lock().requests.clone()
    }

    /// The requests to one path.
    pub fn requests_to(&self, path: &str) -> Vec<Recorded> {
        self.requests()
            .into_iter()
            .filter(|request| request.path == path)
            .collect()
    }
}
