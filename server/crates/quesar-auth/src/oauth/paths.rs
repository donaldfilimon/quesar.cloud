//! Return paths after sign-in: same-site relative paths only.
//!
//! A port of `safeInternalPath` (`src/lib/internal.ts`). The WHATWG URL parser
//! of the `url` crate normalizes dot segments and separators like the one the
//! TypeScript uses, so the same inputs give the same answers.

use url::Url;

const BASE: &str = "https://quesar.cloud";
/// Where a successful sign-in goes by default.
pub const DEFAULT_CALLBACK: &str = "/console";
/// Where a failed sign-in goes by default.
pub const DEFAULT_ERROR_CALLBACK: &str = "/login";
/// Route families a return path may not enter. The error return path is
/// allowed `/login` (the client sends `/login?next=...`).
const DENIED: [&str; 4] = ["/api", "/auth", "/login", "/signup"];

/// `decodeURIComponent`: `None` for a `%` not followed by two hex digits or
/// for bytes that are not UTF-8 (where JavaScript throws).
fn decode_component(input: &str) -> Option<String> {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = bytes.get(i + 1..i + 3)?;
            let value = u8::from_str_radix(std::str::from_utf8(hex).ok()?, 16).ok()?;
            out.push(value);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// `/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i`: encoded separators and controls.
fn has_encoded_separator_or_control(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.windows(3).any(|w| {
        w[0] == b'%'
            && matches!(
                (w[1].to_ascii_lowercase(), w[2].to_ascii_lowercase()),
                (b'2', b'f') | (b'5', b'c') | (b'0' | b'1', b'0'..=b'9' | b'a'..=b'f') | (b'7', b'f')
            )
    })
}

fn checked(path: &str, deny_login: bool) -> Option<String> {
    if !path.starts_with('/')
        || path.starts_with("//")
        || path.contains('\\')
        || path
            .chars()
            .any(|c| u32::from(c) < 32 || u32::from(c) == 127)
    {
        return None;
    }
    let base = Url::parse(BASE).ok()?;
    let url = base.join(path).ok()?;
    if url.origin() != base.origin() || url.path().starts_with("//") {
        return None;
    }
    if has_encoded_separator_or_control(url.path()) {
        return None;
    }
    let decoded = decode_component(url.path())?.to_lowercase();
    let denied = DENIED
        .iter()
        .filter(|entry| deny_login || **entry != "/login")
        .any(|entry| decoded == *entry || decoded.starts_with(&format!("{entry}/")));
    if denied {
        return None;
    }
    let mut target = url.path().to_owned();
    if let Some(query) = url.query().filter(|q| !q.is_empty()) {
        target.push('?');
        target.push_str(query);
    }
    if let Some(fragment) = url.fragment().filter(|f| !f.is_empty()) {
        target.push('#');
        target.push_str(fragment);
    }
    // The target is parsed again by navigation: it must stay on this origin.
    if base.join(&target).ok()?.origin() != base.origin() {
        return None;
    }
    Some(target)
}

/// `safeInternalPath(path, fallback)`: `path` if it is a safe same-site path,
/// else `fallback`. `/login` is refused (a sign-in must not return to it).
pub fn safe_callback(path: Option<&str>) -> String {
    path.and_then(|path| checked(path, true))
        .unwrap_or_else(|| DEFAULT_CALLBACK.to_owned())
}

/// The same checks for the error return path, except that `/login` is allowed.
pub fn safe_error_callback(path: Option<&str>) -> String {
    path.and_then(|path| checked(path, false))
        .unwrap_or_else(|| DEFAULT_ERROR_CALLBACK.to_owned())
}

/// `path` with `error=<code>` added to its query. `path` must already have
/// passed [`safe_error_callback`]; `code` is one of the fixed error codes.
pub fn with_error(path: &str, code: &str) -> String {
    let (before_fragment, fragment) = match path.split_once('#') {
        Some((head, tail)) => (head, Some(tail)),
        None => (path, None),
    };
    let mut out = before_fragment.to_owned();
    out.push(if before_fragment.contains('?') {
        '&'
    } else {
        '?'
    });
    out.push_str("error=");
    out.push_str(code);
    if let Some(fragment) = fragment {
        out.push('#');
        out.push_str(fragment);
    }
    out
}
