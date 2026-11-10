//! Account deletion. Runs against `TEST_DATABASE_URL` (`scripts/dev-postgres.sh start`).
//! Ports `account-deletion.server.test.ts` and adds the user row and the
//! external-cleanup hooks.

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};

use quesar_auth::deletion::{
    BoxFuture, CommerceUnlinkError, CommerceUnlinker, DeletedCounts, DeletionError, DeletionHooks,
    WdbxConfigGuard, WorkspaceOutcome, WorkspaceRevoker, purge_and_delete,
};
use quesar_auth::session;
use quesar_db::test_support::TestDatabase;
use quesar_db::{PgPool, migrate};
use std::sync::Arc;
use time::macros::datetime;

async fn migrated() -> TestDatabase {
    let db = TestDatabase::create().await;
    let dir: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../migrations");
    migrate(&db.pool, &dir).await.expect("migrate");
    db
}

/// Records its calls and answers a fixed value.
struct Revoker {
    answer: bool,
    calls: Mutex<Vec<(String, String)>>,
}

impl Revoker {
    fn new(answer: bool) -> Arc<Self> {
        Arc::new(Self {
            answer,
            calls: Mutex::new(Vec::new()),
        })
    }

    fn calls(&self) -> Vec<(String, String)> {
        self.calls.lock().unwrap().clone()
    }
}

impl WorkspaceRevoker for Revoker {
    fn revoke<'a>(&'a self, user_id: &'a str, provider: &'a str) -> BoxFuture<'a, bool> {
        self.calls
            .lock()
            .unwrap()
            .push((user_id.to_owned(), provider.to_owned()));
        let answer = self.answer;
        Box::pin(async move { answer })
    }
}

/// A commerce hook that counts calls and says what it was told to.
struct Commerce {
    result: Result<u64, CommerceUnlinkError>,
    calls: AtomicUsize,
}

impl CommerceUnlinker for Commerce {
    fn unlink_account<'a>(
        &'a self,
        _user_id: &'a str,
    ) -> BoxFuture<'a, Result<u64, CommerceUnlinkError>> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        let result = self.result;
        Box::pin(async move { result })
    }
}

fn hooks(workspace: Arc<Revoker>) -> DeletionHooks {
    DeletionHooks {
        commerce: Arc::new(WdbxConfigGuard::default()),
        workspace,
    }
}

fn guard_hooks(variables: &[(&str, &str)], workspace: Arc<Revoker>) -> DeletionHooks {
    DeletionHooks {
        commerce: Arc::new(WdbxConfigGuard::new(variables.iter().copied())),
        workspace,
    }
}

/// A user with a row in every table the purge or the cascade touches.
async fn seed(pool: &PgPool, id: &str) {
    let now = datetime!(2026-11-10 12:00 UTC);
    let q = |sql: &'static str| sqlx::query(sql).bind(id.to_owned());
    q(r#"insert into "user" (id, name, email, "emailVerified") values ($1, 'N', $1 || '@example.com', true)"#)
        .execute(pool).await.unwrap();
    q(
        r#"insert into "account" (id, "accountId", "providerId", "userId", password, "updatedAt")
         values ($1 || '-cred', $1, 'credential', $1, 'hash', now()),
                ($1 || '-g', 'g-' || $1, 'google', $1, null, now())"#,
    )
    .execute(pool)
    .await
    .unwrap();
    q(r#"insert into oauth_email_verifications (account_id, email) values ($1 || '-g', 'a@example.com')"#)
        .execute(pool).await.unwrap();
    q(
        r#"insert into "session" (id, "expiresAt", token, "updatedAt", "userId")
         values ($1 || '-ba', now() + interval '1 day', $1 || '-tok', now(), $1)"#,
    )
    .execute(pool)
    .await
    .unwrap();
    q(r#"insert into "passkey" (id, "publicKey", "userId", "credentialID", counter, "deviceType", "backedUp")
         values ($1 || '-pk', 'k', $1, 'c' || $1, 0, 'singleDevice', false)"#)
        .execute(pool).await.unwrap();
    let mut conn = pool.acquire().await.unwrap();
    session::create(&mut conn, id, None, None, now)
        .await
        .unwrap();
    drop(conn);
    q(r#"insert into auth_passkeys (id, user_id, user_handle, credential_id, credential, device_type, backed_up, created_at)
         values ($1 || '-ap', $1, gen_random_uuid(), convert_to($1, 'UTF8'), '{}'::jsonb, 'singleDevice', false, now())"#)
        .execute(pool).await.unwrap();
    q(r#"insert into auth_flows (id, kind, user_id, payload, created_at, expires_at)
         values ($1 || '-fl', 'passkey_register', $1, '{}'::jsonb, now(), now() + interval '1 hour')"#)
        .execute(pool).await.unwrap();

    q("insert into field_notes (user_id, node_id, body) values ($1, 'quesar', 'note')")
        .execute(pool)
        .await
        .unwrap();
    q("insert into chat_consents (user_id, policy_version, consented_at) values ($1, 'v', now())")
        .execute(pool)
        .await
        .unwrap();
    q(r#"insert into conversation_audits (id, user_id, provider, model, policy_version, sealed, content_digest, expires_at)
         values ($1 || '-audit', $1, 'xai', 'm', 'v', 'v1.x.y.z', 'd', now() + interval '1 day')"#)
        .execute(pool).await.unwrap();
    // One event the user acted in, and one by an admin on the user's audit.
    q(
        r#"insert into audit_access_events (audit_id, actor_user_id, actor_type, action, outcome)
         values ($1 || '-audit', $1, 'user', 'read', 'succeeded'),
                ($1 || '-audit', 'some-admin', 'admin', 'read', 'succeeded')"#,
    )
    .execute(pool)
    .await
    .unwrap();
    q("insert into workspace_connections (user_id, provider, sealed) values ($1, 'google', 'v1.x.y.z')")
        .execute(pool).await.unwrap();
    q("insert into rate_limits (bucket, subject, window_start, count) values ('llm', $1, now(), 1)")
        .execute(pool).await.unwrap();
    q("insert into inquiries (user_id, name, email, message) values ($1, 'n', 'e@example.com', 'hello there')")
        .execute(pool).await.unwrap();
}

/// Row counts that belong to `id`, by table.
async fn rows(pool: &PgPool, id: &str) -> Vec<(&'static str, i64)> {
    let queries: [(&str, &str); 17] = [
        ("user", r#"select count(*) from "user" where id = $1"#),
        (
            "account",
            r#"select count(*) from "account" where "userId" = $1"#,
        ),
        (
            "oauth_email_verifications",
            "select count(*) from oauth_email_verifications where account_id like $1 || '-%'",
        ),
        (
            "ba session",
            r#"select count(*) from "session" where "userId" = $1"#,
        ),
        (
            "ba passkey",
            r#"select count(*) from "passkey" where "userId" = $1"#,
        ),
        (
            "auth_sessions",
            "select count(*) from auth_sessions where user_id = $1",
        ),
        (
            "auth_passkeys",
            "select count(*) from auth_passkeys where user_id = $1",
        ),
        (
            "auth_flows",
            "select count(*) from auth_flows where user_id = $1",
        ),
        (
            "field_notes",
            "select count(*) from field_notes where user_id = $1",
        ),
        (
            "chat_consents",
            "select count(*) from chat_consents where user_id = $1",
        ),
        (
            "conversation_audits",
            "select count(*) from conversation_audits where user_id = $1",
        ),
        (
            "audit events (actor)",
            "select count(*) from audit_access_events where actor_user_id = $1",
        ),
        (
            "audit events (on audit)",
            "select count(*) from audit_access_events where audit_id like $1 || '-%'",
        ),
        (
            "workspace_connections",
            "select count(*) from workspace_connections where user_id = $1",
        ),
        (
            "rate_limits",
            "select count(*) from rate_limits where subject = $1",
        ),
        (
            "inquiries (linked)",
            "select count(*) from inquiries where user_id = $1",
        ),
        (
            "inquiries (kept)",
            "select count(*) from inquiries where email = 'e@example.com'",
        ),
    ];
    let mut out = Vec::new();
    for (name, sql) in queries {
        let n: i64 = sqlx::query_scalar(sql)
            .bind(id)
            .fetch_one(pool)
            .await
            .unwrap();
        out.push((name, n));
    }
    out
}

fn counts(rows: &[(&str, i64)], name: &str) -> i64 {
    rows.iter().find(|(n, _)| *n == name).unwrap().1
}

/// What a fully seeded user looks like, with `kept` inquiries in the table.
fn intact(kept: i64) -> Vec<(&'static str, i64)> {
    vec![
        ("user", 1),
        ("account", 2),
        ("oauth_email_verifications", 1),
        ("ba session", 1),
        ("ba passkey", 1),
        ("auth_sessions", 1),
        ("auth_passkeys", 1),
        ("auth_flows", 1),
        ("field_notes", 1),
        ("chat_consents", 1),
        ("conversation_audits", 1),
        ("audit events (actor)", 1),
        ("audit events (on audit)", 2),
        ("workspace_connections", 1),
        ("rate_limits", 1),
        ("inquiries (linked)", 1),
        ("inquiries (kept)", kept),
    ]
}

#[tokio::test]
async fn removes_every_per_user_row_keeps_the_bystander_and_unlinks_inquiries() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    seed(&db.pool, "bystander").await;
    let revoker = Revoker::new(true);

    let report = purge_and_delete(&db.pool, "victim", &hooks(revoker.clone()))
        .await
        .unwrap();

    assert_eq!(
        revoker.calls(),
        vec![("victim".to_owned(), "google".to_owned())]
    );
    assert_eq!(
        report.workspace,
        vec![WorkspaceOutcome {
            provider: "google".into(),
            revoked: true
        }]
    );
    assert_eq!(
        report.deleted,
        DeletedCounts {
            workspace_connections: 1,
            audit_access_events: 2,
            conversation_audits: 1,
            chat_consents: 1,
            field_notes: 1,
            rate_limits: 1,
        }
    );
    assert_eq!(report.inquiries_unlinked, 1);

    let victim = rows(&db.pool, "victim").await;
    for (name, n) in &victim {
        // Both inquiries stay, one of them now unlinked.
        let expected = if *name == "inquiries (kept)" { 2 } else { 0 };
        assert_eq!(*n, expected, "{name} for the deleted user");
    }
    assert_eq!(rows(&db.pool, "bystander").await, intact(2));
    let unlinked: i64 = sqlx::query_scalar(
        "select count(*) from inquiries where user_id is null and email = 'e@example.com'",
    )
    .fetch_one(&db.pool)
    .await
    .unwrap();
    assert_eq!(unlinked, 1);
    db.cleanup().await;
}

#[tokio::test]
async fn a_failed_revoke_still_deletes_the_connection() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    let revoker = Revoker::new(false);

    let report = purge_and_delete(&db.pool, "victim", &hooks(revoker))
        .await
        .unwrap();

    assert_eq!(
        report.workspace,
        vec![WorkspaceOutcome {
            provider: "google".into(),
            revoked: false
        }]
    );
    let after = rows(&db.pool, "victim").await;
    assert_eq!(counts(&after, "workspace_connections"), 0);
    assert_eq!(counts(&after, "user"), 0);
    db.cleanup().await;
}

#[tokio::test]
async fn a_late_sql_fault_rolls_back_everything_including_the_user_and_sessions() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    // A trigger reproduces a real late failure: field_notes is deleted after
    // the connections and audits, and before the user.
    for statement in [
        "create function acceptance_purge_fault() returns trigger language plpgsql as $$ begin raise exception 'synthetic purge fault'; end $$",
        "create trigger acceptance_purge_fault before delete on field_notes for each row execute function acceptance_purge_fault()",
    ] {
        sqlx::query(statement).execute(&db.pool).await.unwrap();
    }
    let revoker = Revoker::new(true);

    let error = purge_and_delete(&db.pool, "victim", &hooks(revoker.clone()))
        .await
        .unwrap_err();

    assert!(matches!(error, DeletionError::Database(_)), "{error}");
    // The provider call is outside the transaction: made once, not undone.
    assert_eq!(revoker.calls().len(), 1);
    assert_eq!(rows(&db.pool, "victim").await, intact(1));
    db.cleanup().await;
}

#[tokio::test]
async fn partial_wdbx_configuration_refuses_and_changes_nothing() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    let revoker = Revoker::new(true);

    for variables in [
        // One commerce variable is enough.
        vec![("WDBX_COMMERCE_DIRECTORY", "/srv/wdbx/commerce")],
        // All four, but one is not absolute: the store is not usable, and
        // something is set.
        vec![
            ("WDBX_BINARY", "/usr/bin/wdbx"),
            ("WDBX_COMMERCE_DIRECTORY", "/srv/wdbx/commerce"),
            ("WDBX_COMMERCE_CONFIG", "relative/config.toml"),
            ("WDBX_COMMERCE_HOST_KEY", "/srv/wdbx/key"),
        ],
        // A whitespace-only value counts as set, as in process.env.
        vec![("WDBX_COMMERCE_HOST_KEY", " ")],
    ] {
        let error = purge_and_delete(
            &db.pool,
            "victim",
            &guard_hooks(&variables, revoker.clone()),
        )
        .await
        .unwrap_err();
        assert!(
            matches!(
                error,
                DeletionError::Commerce(CommerceUnlinkError::PartialConfiguration)
            ),
            "{variables:?}: {error}"
        );
        assert_eq!(rows(&db.pool, "victim").await, intact(1), "{variables:?}");
    }
    // Nothing external was touched either.
    assert!(revoker.calls().is_empty());
    db.cleanup().await;
}

#[tokio::test]
async fn complete_wdbx_configuration_refuses_as_unavailable_and_changes_nothing() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    let revoker = Revoker::new(true);
    let complete = [
        ("WDBX_BINARY", "/usr/bin/wdbx"),
        ("WDBX_COMMERCE_DIRECTORY", "/srv/wdbx/commerce"),
        ("WDBX_COMMERCE_CONFIG", "/srv/wdbx/config.toml"),
        ("WDBX_COMMERCE_HOST_KEY", "/srv/wdbx/key"),
        ("UNRELATED", "x"),
    ];

    let error = purge_and_delete(&db.pool, "victim", &guard_hooks(&complete, revoker.clone()))
        .await
        .unwrap_err();

    assert!(
        matches!(
            error,
            DeletionError::Commerce(CommerceUnlinkError::Unavailable)
        ),
        "{error}"
    );
    assert_eq!(rows(&db.pool, "victim").await, intact(1));
    assert!(revoker.calls().is_empty());
    db.cleanup().await;
}

#[tokio::test]
async fn without_wdbx_variables_deletion_proceeds() {
    let db = migrated().await;
    for (label, variables) in [
        ("none", vec![]),
        // WDBX_BINARY alone is not commerce configuration (wdbxOptions needs all four).
        ("binary only", vec![("WDBX_BINARY", "/usr/bin/wdbx")]),
        // Empty values are unset.
        (
            "blank",
            vec![("WDBX_COMMERCE_DIRECTORY", ""), ("WDBX_BINARY", "")],
        ),
        ("unrelated", vec![("WDBX_OTHER", "x"), ("PATH", "/usr/bin")]),
    ] {
        let id = format!("user-{}", label.replace(' ', "-"));
        seed(&db.pool, &id).await;
        purge_and_delete(&db.pool, &id, &guard_hooks(&variables, Revoker::new(false)))
            .await
            .unwrap_or_else(|error| panic!("{label}: {error}"));
        assert_eq!(counts(&rows(&db.pool, &id).await, "user"), 0, "{label}");
    }
    db.cleanup().await;
}

#[tokio::test]
async fn a_commerce_hook_that_refuses_aborts_before_anything_else() {
    let db = migrated().await;
    seed(&db.pool, "victim").await;
    let revoker = Revoker::new(true);
    let commerce = Arc::new(Commerce {
        result: Err(CommerceUnlinkError::Unavailable),
        calls: AtomicUsize::new(0),
    });
    let hooks = DeletionHooks {
        commerce: commerce.clone(),
        workspace: revoker.clone(),
    };

    assert!(matches!(
        purge_and_delete(&db.pool, "victim", &hooks).await,
        Err(DeletionError::Commerce(CommerceUnlinkError::Unavailable))
    ));
    assert_eq!(commerce.calls.load(Ordering::SeqCst), 1);
    assert!(revoker.calls().is_empty());
    assert_eq!(rows(&db.pool, "victim").await, intact(1));

    // And one that succeeds lets it through.
    let ok = DeletionHooks {
        commerce: Arc::new(Commerce {
            result: Ok(3),
            calls: AtomicUsize::new(0),
        }),
        workspace: revoker,
    };
    purge_and_delete(&db.pool, "victim", &ok).await.unwrap();
    assert_eq!(counts(&rows(&db.pool, "victim").await, "user"), 0);
    db.cleanup().await;
}
