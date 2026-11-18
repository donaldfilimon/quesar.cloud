//! User-row lock shared by per-user writes and account deletion.

use sqlx::PgConnection;

use crate::AuthError;

/// Locks the user row for the caller's transaction so deletion cannot purge
/// this user's data while a writer is adding to it.
pub async fn share(conn: &mut PgConnection, user_id: &str) -> Result<bool, AuthError> {
    let user = sqlx::query_scalar::<_, i32>(r#"select 1 from "user" where id = $1 for share"#)
        .bind(user_id)
        .fetch_optional(conn)
        .await?;
    Ok(user.is_some())
}
