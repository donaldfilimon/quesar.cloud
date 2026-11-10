//! The checked contract with `@simplewebauthn/browser` (M7): responses the
//! browser library produced (`server/contract/passkey/`, see its generator)
//! are deserialized into the types the routes use and then accepted by the
//! real registration and sign-in code. Runs against `TEST_DATABASE_URL`.

use std::path::{Path, PathBuf};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use quesar_auth::passkey::flow::{self, Ceremony};
use quesar_auth::passkey::{
    Passkeys, PublicKeyCredential, RegisterPublicKeyCredential, authenticate, register, store,
};
use quesar_auth::{AuthConfig, new_id};
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
use serde_json::{Value, json};
use time::OffsetDateTime;
use time::macros::datetime;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);

fn fixture(name: &str) -> Value {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../contract/passkey")
        .join(name);
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path:?}: {e}"));
    serde_json::from_str(&text).unwrap()
}

fn b64(text: &str) -> Vec<u8> {
    URL_SAFE_NO_PAD.decode(text).unwrap()
}

#[test]
fn the_browser_libraries_json_deserializes_into_the_route_types() {
    let registration = fixture("registration-response.json");
    let credential: RegisterPublicKeyCredential =
        serde_json::from_value(registration["response"].clone()).unwrap();
    assert_eq!(credential.id, registration["response"]["id"]);
    assert_eq!(
        credential.raw_id.as_ref(),
        b64(credential.id.as_str()).as_slice()
    );
    assert_eq!(credential.type_, "public-key");
    assert_eq!(credential.response.transports.as_ref().unwrap().len(), 2);
    assert!(!credential.response.attestation_object.is_empty());

    let authentication = fixture("authentication-response.json");
    let assertion: PublicKeyCredential =
        serde_json::from_value(authentication["response"].clone()).unwrap();
    assert_eq!(assertion.id, credential.id);
    assert_eq!(assertion.get_user_unique_id().map(<[u8]>::len), Some(16));
    assert_eq!(assertion.get_credential_id(), credential.raw_id.as_ref());
    assert_eq!(assertion.type_, "public-key");
}

fn config() -> AuthConfig {
    AuthConfig::from_lookup(
        |name| (name == "PUBLIC_ORIGIN").then(|| "https://quesar.cloud".to_owned()),
        true,
    )
}

/// Swaps the challenge a started flow holds for the one the fixture signed,
/// at whatever depth the library keeps it.
async fn pin_challenge(pool: &sqlx::PgPool, flow_id: &str, challenge: &str) {
    let mut payload: Value = sqlx::query_scalar("select payload from auth_flows where id = $1")
        .bind(flow_id)
        .fetch_one(pool)
        .await
        .unwrap();
    fn swap(value: &mut Value, challenge: &str) -> usize {
        match value {
            Value::Object(map) => {
                let mut swapped = 0;
                if let Some(slot) = map.get_mut("challenge") {
                    *slot = json!(challenge);
                    swapped += 1;
                }
                swapped + map.values_mut().map(|v| swap(v, challenge)).sum::<usize>()
            }
            _ => 0,
        }
    }
    assert_eq!(
        swap(&mut payload, challenge),
        1,
        "one challenge in the state"
    );
    sqlx::query("update auth_flows set payload = $2 where id = $1")
        .bind(flow_id)
        .bind(payload)
        .execute(pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn the_browser_libraries_responses_register_and_sign_in() {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.unwrap();
    let user_id = new_id();
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
           values ($1, 'Fixture', 'fixture@example.com', false, $2, $2)"#,
    )
    .bind(&user_id)
    .bind(T0)
    .execute(&db.pool)
    .await
    .unwrap();
    let user: quesar_auth::UserRow = sqlx::query_as(
        r#"select id, name, email, "emailVerified", image, "createdAt", "updatedAt"
           from "user" where id = $1"#,
    )
    .bind(&user_id)
    .fetch_one(&db.pool)
    .await
    .unwrap();
    let passkeys = Passkeys::new(&config()).unwrap();

    // Registration, with the challenge the fixture was made against.
    let registration = fixture("registration-response.json");
    let begun = register::begin(&passkeys, &db.pool, &user, T0)
        .await
        .unwrap();
    pin_challenge(
        &db.pool,
        &begun.started.flow_id,
        registration["challenge"].as_str().unwrap(),
    )
    .await;
    let taken = flow::consume(
        &db.pool,
        Ceremony::Register,
        &begun.started.flow_id,
        Some(&user_id),
        T0,
    )
    .await
    .unwrap()
    .unwrap();
    let credential: RegisterPublicKeyCredential =
        serde_json::from_value(registration["response"].clone()).unwrap();
    let created = register::finish(
        &passkeys,
        &db.pool,
        &user_id,
        &taken,
        &credential,
        Some("Fixture"),
        T0,
    )
    .await
    .unwrap()
    .expect("the browser library's registration verifies");
    assert_eq!(created.credential_id, b64(&credential.id));
    // The fixture is a synced passkey: backup eligible and backed up.
    assert_eq!(created.device_type, "multiDevice");
    assert!(created.backed_up);

    // Sign-in with the same key: counter 5, user handle from the assertion.
    let authentication = fixture("authentication-response.json");
    let begun = authenticate::begin(&passkeys, &db.pool, T0).await.unwrap();
    pin_challenge(
        &db.pool,
        &begun.started.flow_id,
        authentication["challenge"].as_str().unwrap(),
    )
    .await;
    let taken = flow::consume(
        &db.pool,
        Ceremony::Authenticate,
        &begun.started.flow_id,
        None,
        T0,
    )
    .await
    .unwrap()
    .unwrap();
    let assertion: PublicKeyCredential =
        serde_json::from_value(authentication["response"].clone()).unwrap();
    // The fixture's user handle is the one `generate.mjs` made up; the server
    // stored its own for this user, so the handle check must refuse it...
    let mut tx = db.pool.begin().await.unwrap();
    let refused = authenticate::verify(&passkeys, &mut tx, &taken, &assertion, T0).await;
    assert!(matches!(refused, Err(authenticate::VerifyError::Rejected)));
    drop(tx);
    // ...until the stored handle is the fixture's, as it would be had the
    // browser registered with the handle this server issued.
    let handle = uuid::Uuid::from_slice(assertion.get_user_unique_id().unwrap()).unwrap();
    sqlx::query("update auth_passkeys set user_handle = $1")
        .bind(handle)
        .execute(&db.pool)
        .await
        .unwrap();
    let begun = authenticate::begin(&passkeys, &db.pool, T0).await.unwrap();
    pin_challenge(
        &db.pool,
        &begun.started.flow_id,
        authentication["challenge"].as_str().unwrap(),
    )
    .await;
    let taken = flow::consume(
        &db.pool,
        Ceremony::Authenticate,
        &begun.started.flow_id,
        None,
        T0,
    )
    .await
    .unwrap()
    .unwrap();
    let mut tx = db.pool.begin().await.unwrap();
    let signed_in = authenticate::verify(&passkeys, &mut tx, &taken, &assertion, T0)
        .await
        .expect("the browser library's assertion verifies");
    tx.commit().await.unwrap();
    assert_eq!(signed_in.id, user_id);
    let stored = &store::list(&db.pool, &user_id).await.unwrap()[0];
    assert_eq!(stored.credential["cred"]["counter"], 5);
    assert_eq!(stored.last_used_at, Some(T0));
    db.cleanup().await;
}
