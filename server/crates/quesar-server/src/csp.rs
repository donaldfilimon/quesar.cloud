//! The Content-Security-Policy the site ships on HTML pages.
//!
//! Mirrors `src/lib/server/csp.ts` (`buildCsp`, `CSP_HEADER`,
//! `REPORTING_ENDPOINTS`) directive for directive. It is report-only today, as
//! in TypeScript; reports go to `/api/csp-report`. The header comment of the
//! TypeScript module is the rule for adding an origin: extend the specific
//! directive, never widen to a bare `https:`.

use axum::http::{HeaderName, HeaderValue};

/// `CSP_HEADER` in `csp.ts`.
pub const CSP_HEADER: HeaderName = HeaderName::from_static("content-security-policy-report-only");
/// The header name of `REPORTING_ENDPOINTS` in `csp.ts` (the TypeScript sets it by this name in `proxy.server.ts`).
pub const REPORTING_ENDPOINTS_HEADER: HeaderName = HeaderName::from_static("reporting-endpoints");
/// `REPORTING_ENDPOINTS` in `csp.ts`.
pub const REPORTING_ENDPOINTS: HeaderValue =
    HeaderValue::from_static(r#"csp-endpoint="/api/csp-report""#);

const TURNSTILE: &str = "https://challenges.cloudflare.com";

/// `buildCsp({ dev })`. Development additionally allows `'unsafe-eval'` in
/// `script-src` and `ws:`/`wss:` in `connect-src` (dev-server HMR).
pub fn build_csp(dev: bool) -> String {
    let mut script_src = vec![
        "script-src",
        "'self'",
        "'unsafe-inline'",
        "'wasm-unsafe-eval'",
        "blob:",
        "https://cdn.jsdelivr.net",
        TURNSTILE,
    ];
    if dev {
        script_src.push("'unsafe-eval'");
    }
    let mut connect_src = vec![
        "connect-src",
        "'self'",
        "data:",
        "blob:",
        "https://cdn.jsdelivr.net",
        "https://huggingface.co",
        "https://*.huggingface.co",
        "https://*.hf.co",
        "https://storage.googleapis.com",
        TURNSTILE,
    ];
    if dev {
        connect_src.extend(["ws:", "wss:"]);
    }
    [
        "default-src 'self'".to_owned(),
        script_src.join(" "),
        "style-src 'self' 'unsafe-inline'".to_owned(),
        "font-src 'self' data:".to_owned(),
        "img-src 'self' data: blob: https://avatars.githubusercontent.com".to_owned(),
        connect_src.join(" "),
        "media-src 'self' blob: https://github.com https://release-assets.githubusercontent.com"
            .to_owned(),
        "worker-src 'self' blob:".to_owned(),
        format!("frame-src {TURNSTILE}"),
        "object-src 'none'".to_owned(),
        "base-uri 'self'".to_owned(),
        "form-action 'self'".to_owned(),
        "frame-ancestors 'self'".to_owned(),
        "report-to csp-endpoint".to_owned(),
        "report-uri /api/csp-report".to_owned(),
    ]
    .join("; ")
}

/// The two header values for one environment, built once at startup.
#[derive(Debug, Clone)]
pub struct PageHeaders {
    csp: HeaderValue,
}

impl PageHeaders {
    /// `production` selects the production policy; anything else gets the development one.
    pub fn new(production: bool) -> Self {
        // The policy is ASCII with no control characters, so this cannot fail;
        // an empty value would only weaken a report-only header.
        let csp =
            HeaderValue::from_str(&build_csp(!production)).unwrap_or(HeaderValue::from_static(""));
        Self { csp }
    }

    /// Adds `Content-Security-Policy-Report-Only` and `Reporting-Endpoints`.
    pub fn apply(&self, headers: &mut axum::http::HeaderMap) {
        headers.insert(CSP_HEADER, self.csp.clone());
        headers.insert(REPORTING_ENDPOINTS_HEADER, REPORTING_ENDPOINTS);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Expected strings were produced by running `buildCsp({ dev: false })`,
    // `buildCsp({ dev: true })`, `CSP_HEADER` and `REPORTING_ENDPOINTS` from
    // `src/lib/server/csp.ts` under vitest (which resolves the `@/` alias) and
    // pasting the printed values here.
    const PRODUCTION: &str = r#"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://avatars.githubusercontent.com; connect-src 'self' data: blob: https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://storage.googleapis.com https://challenges.cloudflare.com; media-src 'self' blob: https://github.com https://release-assets.githubusercontent.com; worker-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; report-to csp-endpoint; report-uri /api/csp-report"#;
    const DEVELOPMENT: &str = r#"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://challenges.cloudflare.com 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://avatars.githubusercontent.com; connect-src 'self' data: blob: https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://storage.googleapis.com https://challenges.cloudflare.com ws: wss:; media-src 'self' blob: https://github.com https://release-assets.githubusercontent.com; worker-src 'self' blob:; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; report-to csp-endpoint; report-uri /api/csp-report"#;

    #[test]
    fn production_policy_equals_the_typescript_string() {
        assert_eq!(build_csp(false), PRODUCTION);
    }

    #[test]
    fn development_policy_equals_the_typescript_string() {
        assert_eq!(build_csp(true), DEVELOPMENT);
    }

    #[test]
    fn header_names_and_reporting_endpoint_equal_the_typescript_values() {
        assert_eq!(
            CSP_HEADER.as_str(),
            "Content-Security-Policy-Report-Only".to_lowercase()
        );
        assert_eq!(REPORTING_ENDPOINTS, r#"csp-endpoint="/api/csp-report""#);
    }

    #[test]
    fn page_headers_pick_the_policy_by_environment() {
        let mut headers = axum::http::HeaderMap::new();
        PageHeaders::new(true).apply(&mut headers);
        assert_eq!(headers[CSP_HEADER], PRODUCTION);
        assert_eq!(headers[REPORTING_ENDPOINTS_HEADER], REPORTING_ENDPOINTS);
        PageHeaders::new(false).apply(&mut headers);
        assert_eq!(headers[CSP_HEADER], DEVELOPMENT);
    }
}
