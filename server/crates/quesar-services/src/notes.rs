//! Per-user field notes over the existing `field_notes` table.

use quesar_auth::{AuthError, user_lock};
use sqlx::{PgConnection, PgPool};
use time::OffsetDateTime;

pub struct Note {
    pub id: i32,
    pub node_id: String,
    pub body: String,
    pub created_at: OffsetDateTime,
}

pub async fn list(pool: &PgPool, user_id: &str) -> Result<Vec<Note>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (i32, String, String, OffsetDateTime)>(
        "select id, node_id, body, created_at from field_notes
         where user_id = $1 order by created_at desc, id desc",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|(id, node_id, body, created_at)| Note {
            id,
            node_id,
            body,
            created_at,
        })
        .collect())
}

/// Inserts a validated note inside the caller's transaction. Returns false
/// if the account was already deleted.
pub async fn add(
    conn: &mut PgConnection,
    user_id: &str,
    node_id: &str,
    body: &str,
    created_at: OffsetDateTime,
) -> Result<bool, AuthError> {
    if !user_lock::share(conn, user_id).await? {
        return Ok(false);
    }
    sqlx::query(
        "insert into field_notes (user_id, node_id, body, created_at) values ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(node_id)
    .bind(body)
    .bind(created_at)
    .execute(conn)
    .await?;
    Ok(true)
}

/// Deletes a note inside the caller's transaction. A missing note is a
/// successful no-op. Returns false if the account was already deleted.
pub async fn delete(conn: &mut PgConnection, user_id: &str, id: i64) -> Result<bool, AuthError> {
    if !user_lock::share(conn, user_id).await? {
        return Ok(false);
    }
    sqlx::query("delete from field_notes where id = $1::bigint and user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(conn)
        .await?;
    Ok(true)
}
