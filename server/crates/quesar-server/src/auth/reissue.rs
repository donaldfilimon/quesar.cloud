//! Re-sends the session cookie on every authenticated response.
//!
//! When a request extends its session, the stored expiry moves but the
//! browser's cookie keeps its old `Max-Age`. The extractors cannot touch the
//! response, so the `auth` router's layer puts a [`ReissueSlot`] in the request
//! extensions, the extractor fills it, and the layer appends the `Set-Cookie`
//! once the handler has answered. No handler has to remember.

use std::sync::{Arc, Mutex};

use axum::extract::Request;
use axum::http::header::SET_COOKIE;
use axum::http::{HeaderMap, HeaderValue};
use axum::middleware::Next;
use axum::response::Response;
use quesar_auth::session::COOKIE_NAME;

/// Where an extractor leaves the cookie to re-send.
#[derive(Clone, Default)]
pub struct ReissueSlot(Arc<Mutex<Option<String>>>);

impl ReissueSlot {
    pub fn set(&self, cookie: String) {
        if let Ok(mut slot) = self.0.lock() {
            *slot = Some(cookie);
        }
    }

    fn take(&self) -> Option<String> {
        self.0.lock().ok().and_then(|mut slot| slot.take())
    }
}

/// Whether the response already sets or clears the session cookie (a sign-out
/// or an account deletion). That one wins: re-sending after it would undo it.
fn sets_session_cookie(headers: &HeaderMap) -> bool {
    headers.get_all(SET_COOKIE).iter().any(|value| {
        value
            .to_str()
            .is_ok_and(|value| value.starts_with(&format!("{COOKIE_NAME}=")))
    })
}

pub async fn reissue_cookie(mut request: Request, next: Next) -> Response {
    let slot = ReissueSlot::default();
    request.extensions_mut().insert(slot.clone());
    let mut response = next.run(request).await;
    if let Some(cookie) = slot.take()
        && !sets_session_cookie(response.headers())
        && let Ok(value) = HeaderValue::from_str(&cookie)
    {
        response.headers_mut().append(SET_COOKIE, value);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_existing_session_cookie_header_wins() {
        let mut headers = HeaderMap::new();
        assert!(!sets_session_cookie(&headers));
        headers.append(SET_COOKIE, HeaderValue::from_static("other=1; Path=/"));
        assert!(!sets_session_cookie(&headers));
        headers.append(
            SET_COOKIE,
            HeaderValue::from_str(&quesar_auth::session::clear_cookie()).unwrap(),
        );
        assert!(sets_session_cookie(&headers));
    }
}
