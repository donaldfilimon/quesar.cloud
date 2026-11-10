//! The Quasar service origin rule of `normalizeOrigin`
//! (`src/lib/quasar/connection.ts`), used for `QUASAR_SERVICE_ORIGIN`.

use url::Url;

use crate::text::js_trim;

/// The authority part of the TypeScript's pre-check
/// `/^https?:\/\/[^/?#@\\]+\/?$/i`: at least one character, none of
/// `/ ? # @ \`, and at most one trailing slash.
fn plausible_origin(text: &str) -> bool {
    let rest = text
        .get(..7)
        .filter(|head| head.eq_ignore_ascii_case("http://"))
        .map(|_| &text[7..])
        .or_else(|| {
            text.get(..8)
                .filter(|head| head.eq_ignore_ascii_case("https://"))
                .map(|_| &text[8..])
        });
    let Some(rest) = rest else {
        return false;
    };
    let authority = rest.strip_suffix('/').unwrap_or(rest);
    !authority.is_empty() && !authority.contains(['/', '?', '#', '@', '\\'])
}

/// `normalizeOrigin`: the canonical `scheme://host[:port]` of an HTTP(S)
/// origin, or `None` where the TypeScript throws (credentials, a path, a
/// query, a fragment, another scheme, an unparsable host). The URL is parsed
/// by the WHATWG-conforming `url` crate, as `new URL` does.
pub fn normalize_origin(input: &str) -> Option<String> {
    let text = js_trim(input);
    if !plausible_origin(text) {
        return None;
    }
    let url = Url::parse(text).ok()?;
    let usable = matches!(url.scheme(), "http" | "https")
        && url.host_str().is_some_and(|host| !host.is_empty())
        && url.username().is_empty()
        && url.password().is_none()
        && url.query().is_none()
        && url.fragment().is_none()
        && url.path() == "/";
    usable.then(|| url.origin().ascii_serialization())
}
