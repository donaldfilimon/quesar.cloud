//! Serves the Next.js static export.
//!
//! `scripts/next-export.ts` lays every page out as `<path>/index.html`, so
//! `/docs` and `/docs/` both resolve to `docs/index.html`. A path that
//! resolves to nothing gets the export's own `404.html` with status 404.

use std::path::{Path, PathBuf};

use axum::body::Body;
use axum::http::header::{ALLOW, CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, Method, Request, Response, StatusCode};
use percent_encoding::percent_decode_str;
use tower::ServiceExt;
use tower_http::services::ServeFile;

/// Hashed build assets: the file name changes whenever the content does.
const IMMUTABLE: HeaderValue = HeaderValue::from_static("public, max-age=31536000, immutable");
/// Pages carry the build id, so a browser must revalidate before reusing one.
const REVALIDATE: HeaderValue = HeaderValue::from_static("no-cache");
/// Everything else (media, icons, the feed): an hour, then revalidate.
const SHORT: HeaderValue = HeaderValue::from_static("public, max-age=3600");

/// Maps a request path onto the export, or `None` when the path must not be served.
///
/// Rejected: traversal (`..`), NUL and backslashes, and dotfiles other than
/// `.well-known` (the export carries `.nojekyll`, which is not a page).
fn relative_path(request_path: &str) -> Option<PathBuf> {
    let decoded = percent_decode_str(request_path).decode_utf8().ok()?;
    if decoded.contains(['\0', '\\']) {
        return None;
    }
    let mut relative = PathBuf::new();
    for segment in decoded.split('/').filter(|segment| !segment.is_empty()) {
        if segment == ".." || (segment.starts_with('.') && segment != ".well-known") {
            return None;
        }
        relative.push(segment);
    }
    Some(relative)
}

/// The file a request path names: the path itself, or its `index.html`.
async fn resolve(site_dir: &Path, request_path: &str) -> Option<PathBuf> {
    let candidate = site_dir.join(relative_path(request_path)?);
    let metadata = tokio::fs::metadata(&candidate).await.ok()?;
    if metadata.is_file() {
        return Some(candidate);
    }
    let index = candidate.join("index.html");
    match tokio::fs::metadata(&index).await {
        Ok(metadata) if metadata.is_file() => Some(index),
        _ => None,
    }
}

fn cache_policy(request_path: &str, file: &Path) -> HeaderValue {
    if request_path.starts_with("/_next/static/") {
        IMMUTABLE
    } else if file
        .extension()
        .is_some_and(|extension| extension == "html")
    {
        REVALIDATE
    } else {
        SHORT
    }
}

async fn serve_file(file: &Path, request: Request<Body>) -> Response<Body> {
    match ServeFile::new(file).oneshot(request).await {
        Ok(response) => response.map(Body::new),
        Err(never) => match never {},
    }
}

fn plain(status: StatusCode, text: &'static str) -> Response<Body> {
    let mut response = Response::new(Body::from(text));
    *response.status_mut() = status;
    response.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    response
}

/// The export's `404.html` with status 404, or a plain 404 if the export has none.
async fn not_found(site_dir: &Path, method: &Method) -> Response<Body> {
    let page = site_dir.join("404.html");
    if !tokio::fs::metadata(&page)
        .await
        .is_ok_and(|metadata| metadata.is_file())
    {
        return plain(StatusCode::NOT_FOUND, "Not found");
    }
    // A fresh request: the original's Range or If-None-Match headers describe
    // a different resource and must not turn this into a 206 or a 304.
    let mut request = Request::new(Body::empty());
    *request.method_mut() = method.clone();
    let mut response = serve_file(&page, request).await;
    if response.status() == StatusCode::OK {
        *response.status_mut() = StatusCode::NOT_FOUND;
    }
    response.headers_mut().insert(CACHE_CONTROL, REVALIDATE);
    response
}

pub async fn serve(site_dir: &Path, request: Request<Body>) -> Response<Body> {
    if !matches!(*request.method(), Method::GET | Method::HEAD) {
        let mut response = plain(StatusCode::METHOD_NOT_ALLOWED, "Method not allowed");
        response
            .headers_mut()
            .insert(ALLOW, HeaderValue::from_static("GET, HEAD"));
        return response;
    }
    let request_path = request.uri().path().to_owned();
    let Some(file) = resolve(site_dir, &request_path).await else {
        return not_found(site_dir, request.method()).await;
    };
    let policy = cache_policy(&request_path, &file);
    let mut response = serve_file(&file, request).await;
    if response.status().is_success() || response.status() == StatusCode::NOT_MODIFIED {
        response.headers_mut().insert(CACHE_CONTROL, policy);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_pages_and_assets_onto_the_export() {
        assert_eq!(relative_path("/"), Some(PathBuf::new()));
        assert_eq!(relative_path("/docs/"), Some(PathBuf::from("docs")));
        assert_eq!(
            relative_path("/_next/static/chunks/a%20b.js"),
            Some(PathBuf::from("_next/static/chunks/a b.js"))
        );
        assert_eq!(
            relative_path("/.well-known/security.txt"),
            Some(PathBuf::from(".well-known/security.txt"))
        );
    }

    #[test]
    fn refuses_traversal_dotfiles_and_malformed_paths() {
        for path in [
            "/../etc/passwd",
            "/docs/../../etc/passwd",
            "/%2e%2e/secret",
            "/docs/%2E%2E/%2E%2E/secret",
            "/.nojekyll",
            "/.git/config",
            "/docs/.env",
            "/a\\b",
            "/a%00b",
            "/%ff",
        ] {
            assert_eq!(relative_path(path), None, "{path}");
        }
    }
}
