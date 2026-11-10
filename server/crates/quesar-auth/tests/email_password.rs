//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};

use quesar_auth::email_password::{self, NewUser};
use quesar_auth::password::PhcString;
use quesar_auth::validate::ValidationError;
use quesar_db::migrate;
use quesar_db::test_support::TestDatabase;
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

#[test]
fn sign_up_validates_email_then_password_then_name() {
    let ok = email_password::validate_sign_up("  Ada  ", " Ada@Example.COM ", "long-enough-1");
    assert_eq!(ok, Ok(("Ada".to_owned(), "ada@example.com".to_owned())));
    // Everything wrong: the email is reported first.
    assert_eq!(
        email_password::validate_sign_up("   ", "nope", "short"),
        Err(ValidationError::InvalidEmail)
    );
    // Email fine, password and name wrong: the password.
    assert_eq!(
        email_password::validate_sign_up("   ", "a@example.com", "short"),
        Err(ValidationError::PasswordTooShort)
    );
    assert_eq!(
        email_password::validate_sign_up("   ", "a@example.com", &"x".repeat(129)),
        Err(ValidationError::PasswordTooLong)
    );
    // Only the name wrong.
    assert_eq!(
        email_password::validate_sign_up("   ", "a@example.com", "long-enough-1"),
        Err(ValidationError::DisplayNameEmpty)
    );
    assert_eq!(
        email_password::validate_sign_up(&"x".repeat(81), "a@example.com", "long-enough-1"),
        Err(ValidationError::DisplayNameTooLong)
    );
}

#[tokio::test]
async fn creating_a_user_writes_the_user_and_a_credential_account() {
    let db = migrated().await;
    let hash = PhcString::new("$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaA");
    let mut tx = db.pool.begin().await.unwrap();
    let NewUser::Created(user) =
        email_password::create_user_with_password(&mut tx, "Ada", "ada@example.com", &hash, T0)
            .await
            .unwrap()
    else {
        panic!("expected a new user");
    };
    tx.commit().await.unwrap();
    assert_eq!(user.name, "Ada");
    assert_eq!(user.email, "ada@example.com");
    assert!(!user.email_verified);
    assert_eq!(user.image, None);
    assert_eq!(user.created_at, T0);

    let account = sqlx::query(
        r#"select "accountId", "providerId", "userId", password, "updatedAt" from "account""#,
    )
    .fetch_one(&db.pool)
    .await
    .unwrap();
    assert_eq!(account.get::<String, _>("accountId"), user.id);
    assert_eq!(account.get::<String, _>("providerId"), "credential");
    assert_eq!(account.get::<String, _>("userId"), user.id);
    assert_eq!(account.get::<String, _>("password"), hash.as_str());
    assert_eq!(account.get::<OffsetDateTime, _>("updatedAt"), T0);

    assert!(
        email_password::email_exists(&db.pool, "ada@example.com")
            .await
            .unwrap()
    );
    assert!(
        !email_password::email_exists(&db.pool, "other@example.com")
            .await
            .unwrap()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn a_taken_email_changes_nothing() {
    let db = migrated().await;
    let hash = PhcString::new("hash-one");
    let mut tx = db.pool.begin().await.unwrap();
    email_password::create_user_with_password(&mut tx, "Ada", "ada@example.com", &hash, T0)
        .await
        .unwrap();
    tx.commit().await.unwrap();

    let mut tx = db.pool.begin().await.unwrap();
    let again = email_password::create_user_with_password(
        &mut tx,
        "Other",
        "ada@example.com",
        &PhcString::new("hash-two"),
        T0,
    )
    .await
    .unwrap();
    assert!(matches!(again, NewUser::EmailTaken));
    tx.commit().await.unwrap();

    let users: i64 = sqlx::query_scalar(r#"select count(*) from "user""#)
        .fetch_one(&db.pool)
        .await
        .unwrap();
    let accounts: i64 = sqlx::query_scalar(r#"select count(*) from "account""#)
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!((users, accounts), (1, 1));
    db.cleanup().await;
}

#[tokio::test]
async fn credentials_are_found_by_email_with_or_without_a_password() {
    let db = migrated().await;
    let mut tx = db.pool.begin().await.unwrap();
    email_password::create_user_with_password(
        &mut tx,
        "Ada",
        "ada@example.com",
        &PhcString::new("the-hash"),
        T0,
    )
    .await
    .unwrap();
    tx.commit().await.unwrap();
    // A user with only a provider account.
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ('g1', 'G', 'g@example.com', true)"#,
    )
    .execute(&db.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"insert into "account" (id, "accountId", "providerId", "userId", "updatedAt")
           values ('a1', 'sub', 'google', 'g1', now())"#,
    )
    .execute(&db.pool)
    .await
    .unwrap();

    let ada = email_password::find_credentials(&db.pool, "ada@example.com")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(ada.user.name, "Ada");
    assert_eq!(ada.password.as_ref().unwrap().as_str(), "the-hash");
    let google = email_password::find_credentials(&db.pool, "g@example.com")
        .await
        .unwrap()
        .unwrap();
    assert!(google.password.is_none());
    assert!(
        email_password::find_credentials(&db.pool, "nobody@example.com")
            .await
            .unwrap()
            .is_none()
    );
    // Credentials never print the hash.
    assert!(!format!("{ada:?}").contains("the-hash"));
    db.cleanup().await;
}

#[tokio::test]
async fn rename_sets_the_name_and_updated_at() {
    let db = migrated().await;
    let mut tx = db.pool.begin().await.unwrap();
    let NewUser::Created(user) = email_password::create_user_with_password(
        &mut tx,
        "Ada",
        "ada@example.com",
        &PhcString::new("h"),
        T0,
    )
    .await
    .unwrap() else {
        panic!("expected a new user");
    };
    tx.commit().await.unwrap();

    let later = T0 + time::Duration::hours(2);
    let renamed = email_password::rename(&db.pool, &user.id, "Ada L", later)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(renamed.name, "Ada L");
    assert_eq!(renamed.created_at, T0);
    assert_eq!(renamed.updated_at, later);
    assert!(
        email_password::rename(&db.pool, "missing", "X", later)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}
