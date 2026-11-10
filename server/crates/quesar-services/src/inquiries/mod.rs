//! Contact inquiries: the rules (`rules`) and the insert.

pub mod rules;

use sqlx::PgConnection;

pub use rules::{InquiryInput, Refusal, ValidInquiry};

/// Stores `inquiry`, linked to `user_id` when that user still exists.
///
/// `inquiries.user_id` has no foreign key, so the link is guarded by a lock
/// instead: `select … for share` on the user row, held until the caller's
/// transaction ends, conflicts with the `for update` that account deletion
/// takes first. Either this transaction commits before the purge reads
/// `inquiries` (and the purge unlinks the row), or it runs after the user is
/// gone, finds no row and stores null. A missing user is not an error.
///
/// It takes a connection so the caller owns the transaction; outside one the
/// lock is released at once and guards nothing.
pub async fn insert(
    conn: &mut PgConnection,
    user_id: Option<&str>,
    inquiry: &ValidInquiry,
) -> Result<(), sqlx::Error> {
    let linked = match user_id {
        Some(id) => {
            sqlx::query_scalar::<_, String>(r#"select id from "user" where id = $1 for share"#)
                .bind(id)
                .fetch_optional(&mut *conn)
                .await?
        }
        None => None,
    };
    sqlx::query(
        "insert into inquiries (user_id, name, email, company, project_type, message)
         values ($1, $2, $3, $4, $5, $6)",
    )
    .bind(linked)
    .bind(&inquiry.name)
    .bind(&inquiry.email)
    .bind(&inquiry.company)
    .bind(inquiry.topic)
    .bind(&inquiry.message)
    .execute(&mut *conn)
    .await?;
    Ok(())
}
