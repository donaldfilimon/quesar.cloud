//! The first M4 admission contract, exercised through the real function mount.

mod common;

use std::sync::Arc;

use axum::extract::State;
use axum::http::{Method, StatusCode};
use axum::response::Response;
use common::{Harness, test_config};
use quesar_contract::{NoInput, ServerFunction};
use quesar_server::AppState;
use quesar_server::api::{ApiError, FnRouter, error::ok, functions::admit};
use quesar_server::auth::extract::AuthUser;
use quesar_services::crypto::SealingKeys;

const PATH: &str = "/api/fn/fixture.signedIn";

struct SignedInFixture;

impl ServerFunction for SignedInFixture {
    const NAME: &str = "fixture.signedIn";
    type Input = NoInput;
    type Output = NoInput;
}

async fn fixture(State(state): State<Arc<AppState>>, auth: AuthUser) -> Result<Response, ApiError> {
    admit(&state, &auth).await?;
    Ok(ok(NoInput))
}

#[tokio::test]
async fn admission_rates_are_per_user_and_signed_out_requests_cost_nothing() {
    let functions = FnRouter::new().function::<SignedInFixture, _, _>(fixture);
    let harness = Harness::with_functions(&[], functions).await;

    let reply = harness.request(Method::POST, PATH, "", &[]).await;
    assert_eq!(reply.status, StatusCode::UNAUTHORIZED);
    let rows: i64 =
        sqlx::query_scalar("select count(*) from rate_limits where bucket = 'auth-general'")
            .fetch_one(&harness.db.pool)
            .await
            .unwrap();
    assert_eq!(rows, 0);

    let first = harness.sign_up("first-signed-in@example.test").await;
    let first_cookie = first.session_cookie().unwrap();
    for _ in 0..100 {
        let reply = harness
            .request(Method::POST, PATH, "", &[("cookie", &first_cookie)])
            .await;
        assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    }
    let reply = harness
        .request(Method::POST, PATH, "", &[("cookie", &first_cookie)])
        .await;
    assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(reply.headers["retry-after"], "10");

    let second = harness.sign_up("second-signed-in@example.test").await;
    let second_cookie = second.session_cookie().unwrap();
    let reply = harness
        .request(Method::POST, PATH, "", &[("cookie", &second_cookie)])
        .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text());
    harness.finish().await;
}

#[test]
fn sealing_is_configured_even_without_a_database_and_accepts_the_previous_key() {
    let current = "01".repeat(32);
    let previous = "02".repeat(32);
    let config = test_config(&[
        ("APP_ENCRYPTION_KEY", &current),
        ("APP_ENCRYPTION_KEY_PREVIOUS", &previous),
    ]);
    let state = AppState::new(&config, None);
    let sealed = SealingKeys::new(Some(&previous), None)
        .seal("fixture", "signed-in")
        .unwrap();
    let opened = state
        .signed_in()
        .sealing
        .open_with_rotation(&sealed, "signed-in")
        .unwrap();
    assert_eq!(opened.plaintext, "fixture");
    assert!(opened.rotated);
}
