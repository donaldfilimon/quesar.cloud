//! Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).

use std::path::{Path, PathBuf};
use std::time::Duration;

use http::{HeaderMap, HeaderValue, header};
use quesar_auth::SecretToken;
use quesar_auth::session::{self, COOKIE_NAME, SESSION_TTL};
use quesar_db::test_support::TestDatabase;
use quesar_db::{PgPool, migrate};
use sqlx::Row;
use time::OffsetDateTime;
use time::macros::datetime;

const T0: OffsetDateTime = datetime!(2026-11-10 12:00 UTC);

fn hours(h: u64) -> Duration {
    Duration::from_secs(h * 3600)
}

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

async fn insert_user(pool: &PgPool, id: &str) {
    sqlx::query(
        r#"insert into "user" (id, name, email, "emailVerified") values ($1, 'N', $2, false)"#,
    )
    .bind(id)
    .bind(format!("{id}@example.com"))
    .execute(pool)
    .await
    .unwrap();
}

async fn make(
    pool: &PgPool,
    user: &str,
    at: OffsetDateTime,
) -> (quesar_auth::SessionRow, SecretToken) {
    let mut conn = pool.acquire().await.unwrap();
    session::create(&mut conn, user, Some("203.0.113.9"), Some("agent"), at)
        .await
        .unwrap()
}

#[tokio::test]
async fn create_then_resolve() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (row, token) = make(&db.pool, "u1", T0).await;
    assert_eq!(row.expires_at, T0 + SESSION_TTL);
    assert_eq!(row.ip_address.as_deref(), Some("203.0.113.9"));
    let (found, user, refreshed) = session::resolve(&db.pool, token.expose(), T0)
        .await
        .unwrap()
        .expect("resolves");
    assert_eq!(found.id, row.id);
    assert_eq!(user.id, "u1");
    assert!(!refreshed);
    assert!(
        session::resolve(&db.pool, SecretToken::generate().expose(), T0)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn raw_token_is_never_stored() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;
    let rows = sqlx::query("select (auth_sessions.*)::text as everything from auth_sessions")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(rows.len(), 1);
    let text: String = rows[0].get("everything");
    assert!(!text.contains(token.expose()));
    // Column by column, including the hash read back as text and as bytes.
    let columns = sqlx::query(
        "select id, user_id, encode(token_hash, 'escape') as h, ip_address, user_agent from auth_sessions",
    )
    .fetch_one(&db.pool)
    .await
    .unwrap();
    for name in ["id", "user_id", "h", "ip_address", "user_agent"] {
        let value: Option<String> = columns.get(name);
        assert!(
            !value.unwrap_or_default().contains(token.expose()),
            "{name}"
        );
    }
    let stored: Vec<u8> = sqlx::query_scalar("select token_hash from auth_sessions")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(stored, token.hash().to_vec());
    assert_ne!(stored, token.expose().as_bytes());
    db.cleanup().await;
}

#[tokio::test]
async fn long_user_agent_is_cut_on_a_char_boundary() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    // 511 ASCII bytes then a 3-byte char straddling the 512 limit.
    let agent = format!("{}€€", "a".repeat(511));
    let mut conn = db.pool.acquire().await.unwrap();
    let (row, _) = session::create(&mut conn, "u1", None, Some(&agent), T0)
        .await
        .unwrap();
    assert_eq!(row.user_agent.as_deref(), Some("a".repeat(511).as_str()));
    db.cleanup().await;
}

#[tokio::test]
async fn expired_session_resolves_to_none_and_is_deleted() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;
    let late = T0 + SESSION_TTL;
    assert!(
        session::resolve(&db.pool, token.expose(), late)
            .await
            .unwrap()
            .is_none()
    );
    let count: i64 = sqlx::query_scalar("select count(*) from auth_sessions")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
    db.cleanup().await;
}

#[tokio::test]
async fn refresh_happens_after_a_day_and_not_before() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;

    let early = T0 + Duration::from_secs(12 * 3600);
    let (row, _, refreshed) = session::resolve(&db.pool, token.expose(), early)
        .await
        .unwrap()
        .unwrap();
    assert!(!refreshed);
    assert_eq!(row.expires_at, T0 + SESSION_TTL);

    let later = T0 + Duration::from_secs(26 * 3600 + 24 * 60); // day 1.1
    let (row, _, refreshed) = session::resolve(&db.pool, token.expose(), later)
        .await
        .unwrap()
        .unwrap();
    assert!(refreshed);
    assert_eq!(row.expires_at, later + SESSION_TTL);
    assert_eq!(row.updated_at, later);
    // The refresh is stored: a second resolve right after does not refresh again.
    let (_, _, again) = session::resolve(&db.pool, token.expose(), later)
        .await
        .unwrap()
        .unwrap();
    assert!(!again);
    db.cleanup().await;
}

#[tokio::test]
async fn refresh_racing_a_revoke_gives_none() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;
    // The row as a concurrent request read it before the revoke.
    let (stale, _, _) = session::resolve(&db.pool, token.expose(), T0)
        .await
        .unwrap()
        .unwrap();
    assert!(session::revoke(&db.pool, "u1", &stale.id).await.unwrap());
    let due = T0 + hours(30);
    assert!(
        session::refresh_if_due(&db.pool, stale, due)
            .await
            .unwrap()
            .is_none()
    );
    assert!(
        session::resolve(&db.pool, token.expose(), due)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn revoke_is_scoped_to_the_user() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    insert_user(&db.pool, "u2").await;
    let (row, token) = make(&db.pool, "u1", T0).await;
    assert!(!session::revoke(&db.pool, "u2", &row.id).await.unwrap());
    assert!(
        session::resolve(&db.pool, token.expose(), T0)
            .await
            .unwrap()
            .is_some()
    );
    assert!(session::revoke(&db.pool, "u1", &row.id).await.unwrap());
    db.cleanup().await;
}

#[tokio::test]
async fn revoke_others_keeps_the_current_session_and_list_is_newest_first() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    insert_user(&db.pool, "u2").await;
    let (a, _) = make(&db.pool, "u1", T0).await;
    let (b, _) = make(&db.pool, "u1", T0 + hours(1)).await;
    let (c, tc) = make(&db.pool, "u1", T0 + hours(2)).await;
    let (_, other) = make(&db.pool, "u2", T0).await;

    let now = T0 + hours(3);
    let ids: Vec<String> = session::list(&db.pool, "u1", now)
        .await
        .unwrap()
        .into_iter()
        .map(|r| r.id)
        .collect();
    assert_eq!(ids, vec![c.id.clone(), b.id.clone(), a.id.clone()]);

    assert_eq!(
        session::revoke_others(&db.pool, "u1", &c.id).await.unwrap(),
        2
    );
    assert!(
        session::resolve(&db.pool, tc.expose(), now)
            .await
            .unwrap()
            .is_some()
    );
    assert!(
        session::resolve(&db.pool, other.expose(), now)
            .await
            .unwrap()
            .is_some()
    );
    assert_eq!(session::list(&db.pool, "u1", now).await.unwrap().len(), 1);

    // Unexpired only.
    assert!(
        session::list(&db.pool, "u1", T0 + hours(2) + SESSION_TTL)
            .await
            .unwrap()
            .is_empty()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn delete_by_token_signs_out() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;
    assert!(
        session::delete_by_token(&db.pool, token.expose())
            .await
            .unwrap()
    );
    assert!(
        !session::delete_by_token(&db.pool, token.expose())
            .await
            .unwrap()
    );
    assert!(
        session::resolve(&db.pool, token.expose(), T0)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn prune_removes_expired_sessions_and_flows() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    make(&db.pool, "u1", T0).await;
    let (keep, _) = make(&db.pool, "u1", T0 + hours(48)).await;
    for (id, at) in [("old", T0), ("new", T0 + SESSION_TTL + hours(1))] {
        sqlx::query(
            "insert into auth_flows (id, kind, payload, created_at, expires_at)
             values ($1, 'passkey_authenticate', '{}'::jsonb, $2, $2 + interval '5 minutes')",
        )
        .bind(id)
        .bind(at)
        .execute(&db.pool)
        .await
        .unwrap();
    }
    let now = T0 + SESSION_TTL + hours(1);
    assert_eq!(session::prune_expired(&db.pool, now).await.unwrap(), 2);
    let ids: Vec<String> = sqlx::query_scalar("select id from auth_sessions")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(ids, vec![keep.id]);
    let flows: Vec<String> = sqlx::query_scalar("select id from auth_flows")
        .fetch_all(&db.pool)
        .await
        .unwrap();
    assert_eq!(flows, vec!["new".to_owned()]);
    db.cleanup().await;
}

#[tokio::test]
async fn is_fresh_boundary() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (row, _) = make(&db.pool, "u1", T0).await;
    assert!(session::is_fresh(
        &row,
        T0 + Duration::from_secs(23 * 3600 + 59 * 60)
    ));
    assert!(!session::is_fresh(&row, T0 + hours(24)));
    db.cleanup().await;
}

#[test]
fn cookie_strings() {
    let token = SecretToken::generate();
    let set = session::set_cookie(&token);
    assert_eq!(
        set,
        format!(
            "__Host-quesar.session_token={}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax",
            token.expose()
        )
    );
    assert!(!set.contains("Domain"));
    let clear = session::clear_cookie();
    assert_eq!(
        clear,
        "__Host-quesar.session_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    );
    assert!(!clear.contains("Domain"));
}

fn headers(values: &[&str]) -> HeaderMap {
    let mut map = HeaderMap::new();
    for value in values {
        map.append(header::COOKIE, HeaderValue::from_str(value).unwrap());
    }
    map
}

#[test]
fn read_cookie_cases() {
    let good = "A".repeat(43);
    let other = "B".repeat(43);

    // Two cookies in one header.
    let one = headers(&[&format!("theme=dark; {COOKIE_NAME}={good}")]);
    assert_eq!(session::read_cookie(&one), Some(good.clone()));

    // Across separate headers; a duplicate name takes the first occurrence.
    let two = headers(&[
        "a=1",
        &format!("{COOKIE_NAME}={good}; {COOKIE_NAME}={other}"),
    ]);
    assert_eq!(session::read_cookie(&two), Some(good.clone()));
    let split = headers(&[
        &format!("{COOKIE_NAME}={other}"),
        &format!("{COOKIE_NAME}={good}"),
    ]);
    assert_eq!(session::read_cookie(&split), Some(other.clone()));

    // A malformed first value is absent; it does not fall through to the second.
    let bad = headers(&[&format!("{COOKIE_NAME}=not*valid; {COOKIE_NAME}={good}")]);
    assert_eq!(session::read_cookie(&bad), None);

    // 42, 44 and non-alphabet characters.
    for value in [
        "A".repeat(42),
        "A".repeat(44),
        format!("{}+", "A".repeat(42)),
    ] {
        let h = headers(&[&format!("{COOKIE_NAME}={value}")]);
        assert_eq!(session::read_cookie(&h), None, "{value}");
    }

    // A similarly named cookie is not the session cookie; none at all is None.
    assert_eq!(
        session::read_cookie(&headers(&[&format!("x{COOKIE_NAME}={good}")])),
        None
    );
    assert_eq!(session::read_cookie(&HeaderMap::new()), None);
    // base64url alphabet is accepted.
    let url = format!("{}-_", "a".repeat(41));
    assert_eq!(
        session::read_cookie(&headers(&[&format!("{COOKIE_NAME}={url}")])),
        Some(url)
    );
}

#[tokio::test]
async fn refresh_never_revives_an_expired_row() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (row, token) = make(&db.pool, "u1", T0).await;
    let dead = T0 + SESSION_TTL + hours(1);
    assert!(
        session::refresh_if_due(&db.pool, row.clone(), dead)
            .await
            .unwrap()
            .is_none()
    );
    let stored: OffsetDateTime = sqlx::query_scalar("select expires_at from auth_sessions")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(stored, row.expires_at);
    assert!(
        session::resolve(&db.pool, token.expose(), dead)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}

#[tokio::test]
async fn two_refreshes_from_the_same_row_report_one_refresh() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (row, _) = make(&db.pool, "u1", T0).await;
    let first_at = T0 + hours(30);
    let second_at = T0 + hours(29); // an older request finishing later
    let (a, a_refreshed) = session::refresh_if_due(&db.pool, row.clone(), first_at)
        .await
        .unwrap()
        .unwrap();
    let (b, b_refreshed) = session::refresh_if_due(&db.pool, row, second_at)
        .await
        .unwrap()
        .unwrap();
    assert!(a_refreshed);
    assert!(!b_refreshed);
    // The loser sees the winner's row and does not shorten it.
    assert_eq!(b.expires_at, a.expires_at);
    let stored: OffsetDateTime = sqlx::query_scalar("select expires_at from auth_sessions")
        .fetch_one(&db.pool)
        .await
        .unwrap();
    assert_eq!(stored, first_at + SESSION_TTL);
    db.cleanup().await;
}

#[tokio::test]
async fn refreshed_session_reissues_the_cookie() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let (_, token) = make(&db.pool, "u1", T0).await;
    let mut request = HeaderMap::new();
    request.insert(
        header::COOKIE,
        HeaderValue::from_str(&format!("{COOKIE_NAME}={}", token.expose())).unwrap(),
    );
    let presented = session::read_cookie(&request).unwrap();
    let later = T0 + hours(30);
    let (_, _, refreshed) = session::resolve(&db.pool, &presented, later)
        .await
        .unwrap()
        .unwrap();
    assert!(refreshed);
    assert_eq!(
        session::set_cookie_for_presented(&presented).unwrap(),
        format!(
            "{COOKIE_NAME}={}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax",
            token.expose()
        )
    );
    assert!(session::set_cookie_for_presented("short").is_none());
    assert!(session::set_cookie_for_presented(&format!("{}; Domain=x", "A".repeat(31))).is_none());
    db.cleanup().await;
}

#[tokio::test]
async fn a_rolled_back_creation_does_not_resolve() {
    let db = migrated().await;
    insert_user(&db.pool, "u1").await;
    let mut tx = db.pool.begin().await.unwrap();
    let (_, token) = session::create(&mut tx, "u1", None, None, T0)
        .await
        .unwrap();
    tx.rollback().await.unwrap();
    assert!(
        session::resolve(&db.pool, token.expose(), T0)
            .await
            .unwrap()
            .is_none()
    );
    db.cleanup().await;
}
