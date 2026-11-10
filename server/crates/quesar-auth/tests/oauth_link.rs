//! The account-linking rule. Runs against `TEST_DATABASE_URL`.

use std::path::{Path, PathBuf};

use quesar_auth::oauth::link::{self, Outcome, Refusal};
use quesar_auth::oauth::provider::{Identity, ProviderId};
use quesar_db::test_support::TestDatabase;
use quesar_db::{PgPool, migrate};
use sqlx::Row;
use time::OffsetDateTime;
use time::macros::datetime;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

fn identity(provider: ProviderId, sub: &str, email: Option<&str>, verified: bool) -> Identity {
    Identity {
        provider,
        subject: sub.to_owned(),
        email: email.map(str::to_owned),
        email_verified: verified,
        name: Some("Ada Lovelace".to_owned()),
        image: Some("https://example.com/ada.png".to_owned()),
    }
}

async fn resolve(pool: &PgPool, identity: &Identity, at: OffsetDateTime) -> Outcome {
    let mut tx = pool.begin().await.unwrap();
    let outcome = link::resolve(&mut tx, identity, at).await.unwrap();
    tx.commit().await.unwrap();
    outcome
}

fn user_of(outcome: Outcome) -> quesar_auth::UserRow {
    match outcome {
        Outcome::SignedIn(user) => user,
        Outcome::Refused(refusal) => panic!("refused: {refusal:?}"),
    }
}

fn refusal_of(outcome: Outcome) -> Refusal {
    match outcome {
        Outcome::Refused(refusal) => refusal,
        Outcome::SignedIn(user) => panic!("signed in as {}", user.id),
    }
}

async fn count(pool: &PgPool, table: &str) -> i64 {
    sqlx::query_scalar(&format!("select count(*) from {table}"))
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn local_user(pool: &PgPool, id: &str, email: &str, verified: bool) {
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ($1, 'Local', $2, $3)"#,
    )
    .bind(id)
    .bind(email)
    .bind(verified)
    .execute(pool)
    .await
    .unwrap();
}

async fn account_of(pool: &PgPool, id: &str, provider: &str, sub: &str, user: &str) {
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ($1, $2, $3, $4, now())"#,
    )
    .bind(id)
    .bind(sub)
    .bind(provider)
    .bind(user)
    .execute(pool)
    .await
    .unwrap();
}

#[tokio::test]
async fn a_new_google_user_gets_a_user_an_account_and_a_verification() {
    let db = migrated().await;
    let google = identity(ProviderId::Google, "sub-1", Some("Ada@Example.com"), true);
    let user = user_of(resolve(&db.pool, &google, T0).await);
    assert_eq!(user.email, "ada@example.com");
    assert_eq!(user.name, "Ada Lovelace");
    assert!(user.email_verified);
    assert_eq!(user.image.as_deref(), Some("https://example.com/ada.png"));
    assert_eq!(user.created_at, T0);

    let account = sqlx::query(
        r#"select id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
           from "account""#,
    )
    .fetch_one(&db.pool)
    .await
    .unwrap();
    assert_eq!(account.get::<String, _>("providerId"), "google");
    assert_eq!(account.get::<String, _>("accountId"), "sub-1");
    assert_eq!(account.get::<String, _>("userId"), user.id);
    assert_eq!(account.get::<Option<String>, _>("password"), None);
    assert_eq!(account.get::<OffsetDateTime, _>("updatedAt"), T0);

    let verification =
        sqlx::query("select account_id, email, verified_at from oauth_email_verifications")
            .fetch_one(&db.pool)
            .await
            .unwrap();
    assert_eq!(
        verification.get::<String, _>("account_id"),
        account.get::<String, _>("id")
    );
    assert_eq!(verification.get::<String, _>("email"), "ada@example.com");
    assert_eq!(verification.get::<OffsetDateTime, _>("verified_at"), T0);
    db.cleanup().await;
}

#[tokio::test]
async fn signing_in_again_is_the_same_user_and_refreshes_the_verification() {
    let db = migrated().await;
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    let first = user_of(resolve(&db.pool, &google, T0).await);
    let later = T0 + time::Duration::days(3);
    let second = user_of(resolve(&db.pool, &google, later).await);
    assert_eq!(first.id, second.id);
    assert_eq!(count(&db.pool, r#""user""#).await, 1);
    assert_eq!(count(&db.pool, r#""account""#).await, 1);
    let verified_at: OffsetDateTime =
        sqlx::query_scalar("select verified_at from oauth_email_verifications")
            .fetch_one(&db.pool)
            .await
            .unwrap();
    assert_eq!(verified_at, later);
    db.cleanup().await;
}

#[tokio::test]
async fn a_returning_user_may_have_a_different_provider_email_and_a_verified_one_is_marked() {
    let db = migrated().await;
    local_user(&db.pool, "u1", "ada@example.com", false).await;
    account_of(&db.pool, "a1", "google", "sub-1", "u1").await;
    // Same address, verified by the provider: the local flag is raised.
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    let user = user_of(resolve(&db.pool, &google, T0).await);
    assert_eq!(user.id, "u1");
    assert!(user.email_verified);
    // A different address does not change the stored one or the flag.
    local_user(&db.pool, "u2", "grace@example.com", false).await;
    account_of(&db.pool, "a2", "google", "sub-2", "u2").await;
    let moved = identity(ProviderId::Google, "sub-2", Some("other@example.com"), true);
    let user = user_of(resolve(&db.pool, &moved, T0).await);
    assert_eq!(user.id, "u2");
    assert_eq!(user.email, "grace@example.com");
    assert!(!user.email_verified);
    db.cleanup().await;
}

#[tokio::test]
async fn an_email_and_password_user_is_not_joined_by_google() {
    let db = migrated().await;
    // Email/password users are never verified (Contradiction 3).
    local_user(&db.pool, "u1", "ada@example.com", false).await;
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    assert_eq!(
        refusal_of(resolve(&db.pool, &google, T0).await),
        Refusal::AccountNotLinked
    );
    assert_eq!(count(&db.pool, r#""account""#).await, 0);
    assert_eq!(count(&db.pool, r#""user""#).await, 1);
    assert_eq!(count(&db.pool, "oauth_email_verifications").await, 0);
    db.cleanup().await;
}

#[tokio::test]
async fn a_user_verified_by_apple_is_linked_by_google() {
    let db = migrated().await;
    let apple = identity(
        ProviderId::Apple,
        "apple-sub",
        Some("ada@example.com"),
        true,
    );
    let created = user_of(resolve(&db.pool, &apple, T0).await);
    assert!(created.email_verified);
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    let linked = user_of(resolve(&db.pool, &google, T0).await);
    assert_eq!(linked.id, created.id);
    assert_eq!(count(&db.pool, r#""user""#).await, 1);
    let providers: Vec<String> =
        sqlx::query_scalar(r#"select "providerId" from "account" order by "providerId""#)
            .fetch_all(&db.pool)
            .await
            .unwrap();
    assert_eq!(providers, ["apple", "google"]);
    assert_eq!(count(&db.pool, "oauth_email_verifications").await, 2);
    db.cleanup().await;
}

#[tokio::test]
async fn x_never_links_by_email_and_never_records_a_verification() {
    let db = migrated().await;
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    user_of(resolve(&db.pool, &google, T0).await);
    // Even a verified X email does not join the existing, verified user.
    let x = identity(ProviderId::Twitter, "x-1", Some("ada@example.com"), true);
    assert_eq!(
        refusal_of(resolve(&db.pool, &x, T0).await),
        Refusal::AccountNotLinked
    );
    // A new address creates a user, with the flag as X reported it.
    let new = identity(ProviderId::Twitter, "x-2", Some("new@example.com"), false);
    let user = user_of(resolve(&db.pool, &new, T0).await);
    assert!(!user.email_verified);
    assert_eq!(
        count(&db.pool, "oauth_email_verifications").await,
        1,
        "only Google's"
    );
    // And signing in again as that X account works.
    assert_eq!(user_of(resolve(&db.pool, &new, T0).await).id, user.id);
    db.cleanup().await;
}

#[tokio::test]
async fn an_unverified_google_email_is_refused_in_every_case() {
    let db = migrated().await;
    // New user.
    let unverified = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), false);
    assert_eq!(
        refusal_of(resolve(&db.pool, &unverified, T0).await),
        Refusal::ProviderEmailUnverified
    );
    assert_eq!(count(&db.pool, r#""user""#).await, 0);
    // Existing user with that address (verified locally).
    local_user(&db.pool, "u1", "ada@example.com", true).await;
    assert_eq!(
        refusal_of(resolve(&db.pool, &unverified, T0).await),
        Refusal::ProviderEmailUnverified
    );
    assert_eq!(count(&db.pool, r#""account""#).await, 0);
    db.cleanup().await;
}

#[tokio::test]
async fn an_unverified_assertion_deletes_the_accounts_verification_row() {
    let db = migrated().await;
    let verified = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    user_of(resolve(&db.pool, &verified, T0).await);
    // Another account's row must survive.
    let other = identity(ProviderId::Google, "sub-2", Some("grace@example.com"), true);
    user_of(resolve(&db.pool, &other, T0).await);
    assert_eq!(count(&db.pool, "oauth_email_verifications").await, 2);

    let unverified = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), false);
    assert_eq!(
        refusal_of(resolve(&db.pool, &unverified, T0).await),
        Refusal::ProviderEmailUnverified
    );
    let remaining: Vec<String> = sqlx::query_scalar("select email from oauth_email_verifications")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(remaining, ["grace@example.com"]);
    // The account itself stays; only the evidence is gone.
    assert_eq!(count(&db.pool, r#""account""#).await, 2);
    db.cleanup().await;
}

#[tokio::test]
async fn no_email_is_refused() {
    let db = migrated().await;
    for email in [None, Some(""), Some("   ")] {
        let no_email = identity(ProviderId::Twitter, "x-1", email, false);
        assert_eq!(
            refusal_of(resolve(&db.pool, &no_email, T0).await),
            Refusal::EmailNotFound
        );
    }
    // Google with a verified flag but no address.
    let google = identity(ProviderId::Google, "sub-1", None, true);
    assert_eq!(
        refusal_of(resolve(&db.pool, &google, T0).await),
        Refusal::EmailNotFound
    );
    assert_eq!(count(&db.pool, r#""user""#).await, 0);
    db.cleanup().await;
}

#[tokio::test]
async fn a_name_that_fails_the_rule_falls_back_to_the_email_local_part() {
    let db = migrated().await;
    let mut hidden = identity(ProviderId::Google, "sub-1", Some("ada.l@example.com"), true);
    hidden.name = None;
    assert_eq!(user_of(resolve(&db.pool, &hidden, T0).await).name, "ada.l");

    let mut long = identity(ProviderId::Google, "sub-2", Some("grace@example.com"), true);
    long.name = Some("x".repeat(81));
    assert_eq!(user_of(resolve(&db.pool, &long, T0).await).name, "grace");

    let mut blank = identity(ProviderId::Google, "sub-3", Some("alan@example.com"), true);
    blank.name = Some("   ".to_owned());
    assert_eq!(user_of(resolve(&db.pool, &blank, T0).await).name, "alan");

    let mut huge_local = identity(
        ProviderId::Google,
        "sub-4",
        Some(&format!("{}@example.com", "y".repeat(120))),
        true,
    );
    huge_local.name = None;
    assert_eq!(
        user_of(resolve(&db.pool, &huge_local, T0).await).name,
        "y".repeat(80)
    );

    let mut padded = identity(ProviderId::Google, "sub-5", Some("kay@example.com"), true);
    padded.name = Some("  Kay  ".to_owned());
    assert_eq!(user_of(resolve(&db.pool, &padded, T0).await).name, "Kay");
    db.cleanup().await;
}

#[tokio::test]
async fn concurrent_first_sign_ins_create_one_user_and_one_account() {
    let db = migrated().await;
    let google = identity(ProviderId::Google, "sub-1", Some("ada@example.com"), true);
    let mut handles = Vec::new();
    for _ in 0..6 {
        let pool = db.pool.clone();
        let google = google.clone();
        handles.push(tokio::spawn(async move {
            user_of(resolve(&pool, &google, T0).await).id
        }));
    }
    let mut ids = Vec::new();
    for handle in handles {
        ids.push(handle.await.unwrap());
    }
    ids.dedup();
    assert_eq!(ids.len(), 1, "everyone signed in as the same user");
    assert_eq!(count(&db.pool, r#""user""#).await, 1);
    assert_eq!(count(&db.pool, r#""account""#).await, 1);
    db.cleanup().await;
}
