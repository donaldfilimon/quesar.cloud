//! Return paths and PKCE: pure functions, no database.

use quesar_auth::oauth::paths::{
    DEFAULT_CALLBACK, DEFAULT_ERROR_CALLBACK, safe_callback, safe_error_callback, with_error,
};
use quesar_auth::oauth::pkce::{self, VERIFIER_LEN, Verifier};

#[test]
fn safe_callbacks_pass_through() {
    for (input, expected) in [
        ("/console", "/console"),
        ("/console/projects?tab=2", "/console/projects?tab=2"),
        ("/console#section", "/console#section"),
        ("/", "/"),
        ("/research/abi", "/research/abi"),
        ("/a/b/../c", "/a/c"),
        ("/docs?q=a%20b", "/docs?q=a%20b"),
    ] {
        assert_eq!(safe_callback(Some(input)), expected, "{input}");
    }
}

#[test]
fn unsafe_callbacks_fall_back_to_the_console() {
    for path in [
        "//evil",
        "//evil.example/x",
        "/\\evil",
        "/\\\\evil",
        "https://evil.example",
        "http://quesar.cloud/console",
        "evil",
        "",
        "%2f",
        "%2fevil",
        "/%2fevil",
        "/foo%2fbar",
        "/foo%5cbar",
        "/foo%00bar",
        "/foo%0abar",
        "/foo%7fbar",
        "/api/x",
        "/api",
        "/API/x",
        "/%61pi/x",
        "/auth/callback",
        "/login",
        "/login?next=/console",
        "/signup",
        "/a/../api/x",
        "/foo%zz",
        "/foo%c3",
        "/line\nbreak",
        "/tab\there",
        "/bell\u{7}",
        "/del\u{7f}",
        "javascript:alert(1)",
    ] {
        assert_eq!(safe_callback(Some(path)), DEFAULT_CALLBACK, "{path:?}");
    }
    assert_eq!(safe_callback(None), DEFAULT_CALLBACK);
}

#[test]
fn the_error_path_may_be_the_login_page_but_nothing_else_unsafe() {
    assert_eq!(
        safe_error_callback(Some("/login?next=%2Fconsole")),
        "/login?next=%2Fconsole"
    );
    assert_eq!(safe_error_callback(Some("/login")), "/login");
    for path in [
        "//evil",
        "/\\evil",
        "https://evil.example",
        "/api/x",
        "/signup",
        "/auth/x",
    ] {
        assert_eq!(
            safe_error_callback(Some(path)),
            DEFAULT_ERROR_CALLBACK,
            "{path:?}"
        );
    }
    assert_eq!(safe_error_callback(None), DEFAULT_ERROR_CALLBACK);
}

#[test]
fn an_error_code_is_appended_to_the_query() {
    assert_eq!(with_error("/login", "expired"), "/login?error=expired");
    assert_eq!(
        with_error("/login?next=%2Fconsole", "expired"),
        "/login?next=%2Fconsole&error=expired"
    );
    assert_eq!(with_error("/login#x", "failed"), "/login?error=failed#x");
}

#[test]
fn the_verifier_is_128_unreserved_characters_and_the_challenge_is_s256() {
    let verifier = Verifier::generate();
    assert_eq!(verifier.expose().len(), VERIFIER_LEN);
    assert_eq!(VERIFIER_LEN, 128);
    assert!(
        verifier
            .expose()
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-._~".contains(&b))
    );
    assert_ne!(verifier.expose(), Verifier::generate().expose());
    assert_eq!(format!("{verifier:?}"), "Verifier([redacted])");
    assert_eq!(verifier.challenge(), pkce::challenge_for(verifier.expose()));
    // RFC 7636 appendix B.
    assert_eq!(
        pkce::challenge_for("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
        "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
}
