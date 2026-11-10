//! `inquiries.sendInquiry` over HTTP, against a throwaway database and an
//! in-process Turnstile. Mirrors `src/lib/server/inquiries.server.test.ts`.
//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

mod common;

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{Method, StatusCode, header};
use axum::response::IntoResponse;
use axum::routing::post;
use common::{Harness, NoDatabase, Reply, full_request};
use quesar_auth::deletion::{DeletionHooks, NoWorkspaceRevoker, WdbxConfigGuard, purge_and_delete};
use serde_json::{Value, json};
use sqlx::{PgPool, Row};
use tokio::net::TcpListener;

const PATH: &str = "/api/fn/inquiries.sendInquiry";

fn inquiry(email: &str) -> Value {
    json!({
        "name": "Ada Lovelace",
        "email": email,
        "company": "",
        "topic": "Quesar",
        "message": "I would like to talk about WDBX provenance.",
        "turnstileToken": "",
    })
}

async fn send_raw(h: &Harness, ip: &str, body: String, headers: &[(&str, &str)]) -> Reply {
    h.send(full_request(
        Method::POST,
        PATH,
        body,
        ip.to_owned(),
        headers,
    ))
    .await
}

async fn send(h: &Harness, body: &Value) -> Reply {
    let ip = h.fresh_ip();
    send_raw(h, &ip, body.to_string(), &[]).await
}

async fn send_as(h: &Harness, body: &Value, cookie: &str) -> Reply {
    let ip = h.fresh_ip();
    send_raw(h, &ip, body.to_string(), &[("cookie", cookie)]).await
}

fn assert_sent(reply: &Reply) {
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(reply.result(), json!({ "ok": true }), "{}", reply.text());
}

fn code(reply: &Reply) -> String {
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    reply.result()["code"].as_str().unwrap_or("").to_owned()
}

async fn stored(pool: &PgPool) -> Vec<(Option<String>, String, String)> {
    sqlx::query("select user_id, email, project_type from inquiries order by id")
        .fetch_all(pool)
        .await
        .unwrap()
        .iter()
        .map(|r| (r.get(0), r.get(1), r.get(2)))
        .collect()
}

async fn count(pool: &PgPool) -> i64 {
    sqlx::query_scalar("select count(*) from inquiries")
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn limiter_hits(pool: &PgPool) -> i64 {
    sqlx::query_scalar(
        "select coalesce(sum(count), 0)::bigint from rate_limits where bucket = 'inquiry'",
    )
    .fetch_one(pool)
    .await
    .unwrap()
}

async fn signed_in(h: &Harness, email: &str) -> (String, String) {
    let cookie = h.sign_up(email).await.session_cookie().unwrap();
    let id: String = sqlx::query_scalar(r#"select id from "user" where email = $1"#)
        .bind(email)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    (cookie, id)
}

#[tokio::test]
async fn an_anonymous_inquiry_stores_a_null_user_id() {
    let h = Harness::new().await;
    let mut body = inquiry("anon@example.com");
    body["topic"] = json!("Services");
    assert_sent(&send(&h, &body).await);
    assert_eq!(
        stored(&h.db.pool).await,
        vec![(None, "anon@example.com".into(), "Services".into())]
    );
    h.finish().await;
}

#[tokio::test]
async fn a_signed_in_sender_is_linked() {
    let h = Harness::new().await;
    let (cookie, id) = signed_in(&h, "ada@example.com").await;
    assert_sent(&send_as(&h, &inquiry("ada@example.com"), &cookie).await);
    assert_eq!(stored(&h.db.pool).await[0].0.as_deref(), Some(id.as_str()));
    h.finish().await;
}

#[tokio::test]
async fn an_invalid_inquiry_names_the_field_and_stores_nothing() {
    let h = Harness::new().await;
    let mut body = inquiry("bad@example.com");
    body["message"] = json!("short");
    let reply = send(&h, &body).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(
        reply.result(),
        json!({
            "ok": false, "code": "invalid", "field": "message",
            "error": "Add a bit more detail: at least 10 characters."
        })
    );
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn five_per_window_then_rate_limited_and_the_clock_reopens_it() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    for i in 0..5 {
        let body = inquiry(&format!("rl-{i}@example.com"));
        assert_sent(&send_raw(&h, &ip, body.to_string(), &[]).await);
    }
    let sixth = send_raw(&h, &ip, inquiry("rl-5@example.com").to_string(), &[]).await;
    // A result, never a 429.
    assert_eq!(sixth.status, StatusCode::OK);
    assert_eq!(
        sixth.result(),
        json!({
            "ok": false, "code": "rate_limited",
            "error": "Too many inquiries from here. Try again in a few minutes."
        })
    );
    assert_eq!(count(&h.db.pool).await, 5);

    h.clock.advance(Duration::from_secs(10 * 60));
    assert_sent(&send_raw(&h, &ip, inquiry("rl-6@example.com").to_string(), &[]).await);
    assert_eq!(count(&h.db.pool).await, 6);
    h.finish().await;
}

#[tokio::test]
async fn invalid_submissions_count_against_the_limit() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let mut bad = inquiry("bad@example.com");
    bad["name"] = json!("");
    for _ in 0..5 {
        assert_eq!(
            code(&send_raw(&h, &ip, bad.to_string(), &[]).await),
            "invalid"
        );
    }
    let sixth = send_raw(&h, &ip, inquiry("ok@example.com").to_string(), &[]).await;
    assert_eq!(code(&sixth), "rate_limited");
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

// ---- Turnstile -------------------------------------------------------------

type Form = Vec<(String, String)>;

struct Mock {
    url: String,
    forms: Arc<Mutex<Vec<Form>>>,
}

impl Mock {
    async fn start() -> Self {
        async fn handle(
            State(forms): State<Arc<Mutex<Vec<Form>>>>,
            body: Bytes,
        ) -> impl IntoResponse {
            forms.lock().unwrap().push(
                url::form_urlencoded::parse(&body)
                    .map(|(k, v)| (k.into_owned(), v.into_owned()))
                    .collect(),
            );
            (
                [(header::CONTENT_TYPE, "application/json")],
                json!({"success": true, "action": "inquiry", "hostname": "quesar.cloud"})
                    .to_string(),
            )
        }
        let forms = Arc::new(Mutex::new(Vec::new()));
        let app = Router::new()
            .route("/siteverify", post(handle))
            .with_state(Arc::clone(&forms));
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address: SocketAddr = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        Self {
            url: format!("http://{address}/siteverify"),
            forms,
        }
    }

    fn calls(&self) -> usize {
        self.forms.lock().unwrap().len()
    }
}

const TURNSTILE_READY: [(&str, &str); 3] = [
    ("TURNSTILE_SITE_KEY", "site-key"),
    ("TURNSTILE_SECRET", "turnstile-secret"),
    ("TURNSTILE_HOSTNAMES", "quesar.cloud"),
];

async fn with_mock(extra: &[(&str, &str)], mock: &Mock) -> Harness {
    let url = mock.url.clone();
    Harness::with_public(extra, move |public| {
        public.turnstile.siteverify_url = url;
        public.http = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap();
    })
    .await
}

#[tokio::test]
async fn turnstile_ready_requires_a_verified_token() {
    let mock = Mock::start().await;
    let h = with_mock(&TURNSTILE_READY, &mock).await;

    let reply = send(&h, &inquiry("ts@example.com")).await;
    assert_eq!(
        reply.result(),
        json!({
            "ok": false, "code": "verification",
            "error": "We couldn't confirm you're not a bot. Complete the check and try again."
        })
    );
    assert_eq!(mock.calls(), 0, "an empty token never reaches Cloudflare");
    assert_eq!(count(&h.db.pool).await, 0);

    let mut body = inquiry("ts@example.com");
    body["turnstileToken"] = json!("  good-token-0123456789  ");
    assert_sent(&send(&h, &body).await);
    assert_eq!(mock.calls(), 1);
    assert_eq!(count(&h.db.pool).await, 1);
    let form = mock.forms.lock().unwrap()[0].clone();
    assert!(form.contains(&("response".to_owned(), "good-token-0123456789".to_owned())));
    assert!(form.iter().any(|(k, _)| k == "remoteip"));
    h.finish().await;
}

#[tokio::test]
async fn an_invalid_inquiry_never_reaches_turnstile() {
    let mock = Mock::start().await;
    let h = with_mock(&TURNSTILE_READY, &mock).await;
    let mut body = inquiry("ts@example.com");
    body["name"] = json!("");
    body["turnstileToken"] = json!("good-token-0123456789");
    assert_eq!(code(&send(&h, &body).await), "invalid");
    assert_eq!(mock.calls(), 0);
    h.finish().await;
}

#[tokio::test]
async fn misconfigured_turnstile_refuses_and_never_calls_out() {
    let mock = Mock::start().await;
    let h = with_mock(
        &[
            ("TURNSTILE_SITE_KEY", "site-key"),
            ("TURNSTILE_SECRET", "turnstile-secret"),
        ],
        &mock,
    )
    .await;
    let mut body = inquiry("ts@example.com");
    body["turnstileToken"] = json!("good-token-0123456789");
    let reply = send(&h, &body).await;
    assert_eq!(
        reply.result(),
        json!({
            "ok": false, "code": "misconfigured",
            "error": "Bot verification is misconfigured on this site, so inquiries cannot be accepted right now."
        })
    );
    assert_eq!(mock.calls(), 0);
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

// ---- abuse ------------------------------------------------------------------

#[tokio::test]
async fn user_id_fields_in_the_body_are_ignored() {
    let h = Harness::new().await;
    let (cookie, id) = signed_in(&h, "ada@example.com").await;
    let (_, victim) = signed_in(&h, "victim@example.com").await;
    let mut body = inquiry("a@example.com");
    body["userId"] = json!(victim);
    body["user_id"] = json!(victim);
    assert_sent(&send(&h, &body).await);
    assert_sent(&send_as(&h, &body, &cookie).await);
    let rows = stored(&h.db.pool).await;
    assert_eq!(rows[0].0, None);
    assert_eq!(rows[1].0.as_deref(), Some(id.as_str()));
    h.finish().await;
}

#[tokio::test]
async fn a_non_object_body_is_empty_fields() {
    let h = Harness::new().await;
    for body in [
        "[]",
        "\"x\"",
        "null",
        "5",
        "true",
        "[{\"name\":\"Ada Lovelace\"}]",
    ] {
        let ip = h.fresh_ip();
        let reply = send_raw(&h, &ip, body.to_owned(), &[]).await;
        assert_eq!(reply.status, StatusCode::OK, "{body}");
        let result = reply.result();
        assert_eq!(result["code"], "invalid", "{body}");
        assert_eq!(result["field"], "name", "{body}");
    }
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn the_last_duplicate_key_wins_as_in_json_parse() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let body = r#"{"name":"x","name":"Ada Lovelace","email":"a@example.com","topic":"Other","message":"A message that is long enough."}"#;
    assert_sent(&send_raw(&h, &ip, body.to_owned(), &[]).await);
    h.finish().await;
}

#[tokio::test]
async fn malformed_json_and_a_lone_surrogate_are_400_and_still_count_a_hit() {
    let h = Harness::new().await;
    for (i, body) in ["{not json", "", "{\"name\":\"\\ud800\"}"]
        .iter()
        .enumerate()
    {
        let ip = h.fresh_ip();
        let reply = send_raw(&h, &ip, (*body).to_owned(), &[]).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(reply.error_code(), "INVALID_BODY");
        assert_eq!(reply.json()["error"]["name"], "ValidationError");
        let hits = limiter_hits(&h.db.pool).await;
        assert_eq!(
            hits,
            i64::try_from(i).unwrap() + 1,
            "one hit per refused body"
        );
    }
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn the_body_cap_is_32_kib() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let huge = json!({ "message": "m".repeat(33 * 1024) }).to_string();
    let reply = send_raw(&h, &ip, huge, &[]).await;
    assert_eq!(reply.status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(reply.error_code(), "PAYLOAD_TOO_LARGE");

    // Under the cap, a long message is an ordinary refusal.
    let mut body = inquiry("big@example.com");
    body["message"] = json!("m".repeat(30 * 1024));
    let reply = send(&h, &body).await;
    assert_eq!(code(&reply), "invalid");
    assert_eq!(reply.result()["field"], "message");
    h.finish().await;
}

#[tokio::test]
async fn a_cross_site_post_is_403_and_costs_no_limiter_hit() {
    let h = Harness::new().await;
    let ip = h.fresh_ip();
    let reply = send_raw(
        &h,
        &ip,
        inquiry("x@example.com").to_string(),
        &[("origin", "https://evil.example")],
    )
    .await;
    assert_eq!(reply.status, StatusCode::FORBIDDEN);
    assert_eq!(reply.json()["error"]["name"], "CrossSiteRequestError");
    assert_eq!(limiter_hits(&h.db.pool).await, 0);
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn sign_in_switched_off_stores_null_whatever_the_cookie() {
    let h = Harness::new().await;
    let (cookie, _) = signed_in(&h, "ada@example.com").await;
    let config = common::test_config(&[("VITE_AUTH_ENABLED", "false")]);
    let services =
        quesar_server::auth::AuthServices::build(h.db.pool.clone(), &config, h.clock.clone())
            .unwrap();
    let public = quesar_server::api::PublicServices::build(&config).unwrap();
    let off = quesar_server::router_with_functions(
        &config,
        Some(services),
        public,
        quesar_server::api::functions(),
    );
    let request = full_request(
        Method::POST,
        PATH,
        inquiry("off@example.com").to_string(),
        h.fresh_ip(),
        &[("cookie", &cookie)],
    );
    let response = tower::ServiceExt::oneshot(off, request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        stored(&h.db.pool).await,
        vec![(None, "off@example.com".into(), "Quesar".into())]
    );
    h.finish().await;
}

#[tokio::test]
async fn an_expired_or_revoked_session_stores_null() {
    let h = Harness::new().await;
    let (cookie, id) = signed_in(&h, "ada@example.com").await;

    // Revoked: the session row is gone.
    sqlx::query("delete from auth_sessions where user_id = $1")
        .bind(&id)
        .execute(&h.db.pool)
        .await
        .unwrap();
    assert_sent(&send_as(&h, &inquiry("revoked@example.com"), &cookie).await);

    // Expired: a fresh session, then the clock passes its lifetime.
    let again = h.sign_in("ada@example.com", common::PASSWORD).await;
    let fresh = again.session_cookie().unwrap();
    h.clock.advance(Duration::from_secs(8 * 24 * 3600));
    assert_sent(&send_as(&h, &inquiry("expired@example.com"), &fresh).await);

    let rows = stored(&h.db.pool).await;
    assert_eq!(rows.len(), 2);
    assert!(rows.iter().all(|row| row.0.is_none()), "{rows:?}");
    h.finish().await;
}

#[tokio::test]
async fn a_nul_in_a_field_passes_the_rules_and_fails_the_insert_as_unavailable() {
    let h = Harness::new().await;
    let mut body = inquiry("nul@example.com");
    body["name"] = json!("Ada\u{0}Lovelace");
    let reply = send(&h, &body).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(
        reply.result(),
        json!({
            "ok": false, "code": "unavailable",
            "error": "We couldn't save that. Try again in a moment."
        })
    );
    assert_eq!(count(&h.db.pool).await, 0);
    h.finish().await;
}

#[tokio::test]
async fn a_dropped_table_is_unavailable() {
    let h = Harness::new().await;
    sqlx::query("drop table inquiries")
        .execute(&h.db.pool)
        .await
        .unwrap();
    let reply = send(&h, &inquiry("gone@example.com")).await;
    assert_eq!(code(&reply), "unavailable");
    h.finish().await;
}

#[tokio::test]
async fn without_a_database_the_answer_is_unavailable() {
    let app = NoDatabase::new(&[], quesar_server::api::functions(), |_| {});
    let reply = app
        .request(
            Method::POST,
            PATH,
            &inquiry("x@example.com").to_string(),
            &[],
        )
        .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    assert_eq!(code(&reply), "unavailable");
}

// ---- concurrency with account deletion -------------------------------------

fn hooks() -> DeletionHooks {
    DeletionHooks {
        commerce: Arc::new(WdbxConfigGuard::default()),
        workspace: Arc::new(NoWorkspaceRevoker),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn twenty_senders_racing_one_account_deletion_leave_no_dangling_user_id() {
    let h = Harness::new().await;
    let (cookie, id) = signed_in(&h, "racer@example.com").await;

    let mut senders = Vec::new();
    for i in 0..20 {
        let app = h.app.clone();
        let cookie = cookie.clone();
        // Its own client address: the `inquiry` bucket allows five per address.
        let ip = h.fresh_ip();
        senders.push(tokio::spawn(async move {
            let request = full_request(
                Method::POST,
                PATH,
                inquiry(&format!("racer-{i}@example.com")).to_string(),
                ip,
                &[("cookie", &cookie)],
            );
            let response = tower::ServiceExt::oneshot(app, request).await.unwrap();
            let status = response.status();
            let bytes = http_body_util::BodyExt::collect(response.into_body())
                .await
                .unwrap()
                .to_bytes();
            (status, serde_json::from_slice::<Value>(&bytes).unwrap())
        }));
    }
    let pool = h.db.pool.clone();
    let victim = id.clone();
    let purge = tokio::spawn(async move { purge_and_delete(&pool, &victim, &hooks()).await });

    let mut sent = 0;
    for sender in senders {
        let (status, body) = sender.await.unwrap();
        assert_eq!(status, StatusCode::OK, "{body}");
        let result = &body["result"];
        if result["ok"] == true {
            sent += 1;
        } else {
            assert_eq!(result["code"], "unavailable", "{body}");
        }
    }
    purge.await.unwrap().unwrap();

    let dangling: i64 = sqlx::query_scalar("select count(*) from inquiries where user_id = $1")
        .bind(&id)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(dangling, 0, "a writer committed the deleted id");
    assert_eq!(count(&h.db.pool).await, sent, "one row per answered ok");
    let users: i64 = sqlx::query_scalar(r#"select count(*) from "user" where id = $1"#)
        .bind(&id)
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
    assert_eq!(users, 0);
    h.finish().await;
}

/// Deterministic version of the race: the purge is started while a writer
/// holds its share lock and is seen waiting on a lock before the writer
/// commits. The row the writer stored is then unlinked by the purge.
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn the_purge_waits_for_an_open_writer_and_then_unlinks_its_row() {
    let h = Harness::new().await;
    let (_, id) = signed_in(&h, "waiter@example.com").await;

    let mut writer = h.db.pool.begin().await.unwrap();
    let valid = quesar_services::inquiries::ValidInquiry {
        name: "Ada".into(),
        email: "waiter@example.com".into(),
        company: String::new(),
        topic: "Other",
        message: "A message that is long enough.".into(),
    };
    quesar_services::inquiries::insert(&mut writer, Some(&id), &valid)
        .await
        .unwrap();

    let pool = h.db.pool.clone();
    let victim = id.clone();
    let purge = tokio::spawn(async move { purge_and_delete(&pool, &victim, &hooks()).await });

    // No sleep: poll the server until a backend is blocked on the user row.
    let mut waiting = false;
    for _ in 0..20_000 {
        let blocked: i64 = sqlx::query_scalar(
            "select count(*) from pg_stat_activity
             where wait_event_type = 'Lock' and query like '%for update%'
               and datname = current_database()",
        )
        .fetch_one(&h.db.pool)
        .await
        .unwrap();
        if blocked > 0 {
            waiting = true;
            break;
        }
        assert!(
            !purge.is_finished(),
            "the purge finished past an open writer"
        );
        tokio::task::yield_now().await;
    }
    assert!(waiting, "the purge never blocked on the writer's lock");

    writer.commit().await.unwrap();
    purge.await.unwrap().unwrap();
    assert_eq!(
        stored(&h.db.pool).await,
        vec![(None, "waiter@example.com".into(), "Other".into())]
    );
    h.finish().await;
}
