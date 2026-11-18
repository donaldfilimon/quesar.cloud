//! Signed-in field notes.

use std::sync::Arc;

use axum::extract::{Request, State};
use axum::response::Response;
use quesar_contract::ServerFunction;
use quesar_contract::workspace::{
    AddNote, AddNoteInput, DeleteNote, DeleteNoteInput, FieldNote, ListNotes,
};
use quesar_services::notes;
use quesar_services::text::{js_trim, utf16_len};

use super::admit;
use crate::api::body::{FN_BODY_MAX, read, read_value};
use crate::api::{ApiError, FnRouter, error::ok};
use crate::auth::{extract::AuthUser, view::iso};
use crate::router::AppState;

const NOTE_BODY_MAX: usize = 2000;

async fn list_notes(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    let services = admit(&state, &auth).await?;
    let rows = notes::list(&services.pool, &auth.user.id)
        .await
        .map_err(notes_store_error::<ListNotes>)?;
    let result: Vec<_> = rows
        .into_iter()
        .map(|row| FieldNote {
            id: row.id,
            node_id: row.node_id,
            body: row.body,
            created_at: iso(row.created_at),
        })
        .collect();
    Ok(ok(result))
}

async fn add_note(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    request: Request,
) -> Result<Response, ApiError> {
    let services = admit(&state, &auth).await?;
    let (parts, body) = request.into_parts();
    let value = read_value(&parts.headers, body, FN_BODY_MAX).await?;
    if !value.is_object() {
        return Err(ApiError::InvalidBody);
    }
    let input: AddNoteInput = serde_json::from_value(value).map_err(|_| ApiError::InvalidBody)?;
    let catalog = state
        .signed_in()
        .catalog
        .map_err(|cause| ApiError::internal(AddNote::NAME, cause))?;
    if !catalog.contains_id(&input.node_id) {
        return Err(ApiError::validation(
            "INVALID_NODE_ID",
            "Choose an architecture node.",
        ));
    }
    let body = js_trim(&input.body);
    if body.is_empty() {
        return Err(ApiError::validation("EMPTY_NOTE", "Write a note."));
    }
    if utf16_len(body) > NOTE_BODY_MAX {
        return Err(ApiError::validation(
            "NOTE_TOO_LONG",
            "Write a note of 2,000 characters or fewer.",
        ));
    }
    if body.contains('\0') {
        return Err(ApiError::validation(
            "INVALID_NOTE",
            "The note contains an unsupported character.",
        ));
    }

    let now = services.clock.now();
    let mut tx = services
        .pool
        .begin()
        .await
        .map_err(notes_store_error::<AddNote>)?;
    if !notes::add(&mut tx, &auth.user.id, &input.node_id, body, now)
        .await
        .map_err(notes_store_error::<AddNote>)?
    {
        return Err(ApiError::Unauthorized);
    }
    tx.commit().await.map_err(notes_store_error::<AddNote>)?;
    Ok(ok(()))
}

async fn delete_note(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    request: Request,
) -> Result<Response, ApiError> {
    let services = admit(&state, &auth).await?;
    let (parts, body) = request.into_parts();
    let DeleteNoteInput(id) = read(&parts.headers, body, FN_BODY_MAX).await?;
    if id <= 0 {
        return Err(ApiError::validation(
            "INVALID_NOTE_ID",
            "Choose a valid note.",
        ));
    }

    let mut tx = services
        .pool
        .begin()
        .await
        .map_err(notes_store_error::<DeleteNote>)?;
    if !notes::delete(&mut tx, &auth.user.id, id)
        .await
        .map_err(notes_store_error::<DeleteNote>)?
    {
        return Err(ApiError::Unauthorized);
    }
    tx.commit().await.map_err(notes_store_error::<DeleteNote>)?;
    Ok(ok(()))
}

fn notes_store_error<F: ServerFunction>(_: impl std::error::Error) -> ApiError {
    // Driver details can include column values.
    tracing::error!(function = F::NAME, "field notes store failure");
    ApiError::Unavailable
}

pub(super) fn register(router: FnRouter) -> FnRouter {
    router
        .function::<ListNotes, _, _>(list_notes)
        .function::<AddNote, _, _>(add_note)
        .function::<DeleteNote, _, _>(delete_note)
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use serde_json::{Value, json};

    use super::*;

    #[tokio::test]
    async fn notes_store_failure_returns_the_unavailable_envelope() {
        let response = notes_store_error::<ListNotes>(sqlx::Error::PoolClosed).into_response();
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        let bytes = to_bytes(response.into_body(), 1024).await.unwrap();
        assert_eq!(
            serde_json::from_slice::<Value>(&bytes).unwrap(),
            json!({
                "ok": false,
                "error": {
                    "name": "AuthUnavailableError",
                    "code": "AUTH_UNAVAILABLE",
                    "message": "Authentication is not available",
                },
            }),
        );
    }
}
