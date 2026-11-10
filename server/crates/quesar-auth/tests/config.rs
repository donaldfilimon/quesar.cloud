use std::collections::HashMap;

use quesar_auth::AuthConfig;

fn config(pairs: &[(&str, &str)], production: bool) -> AuthConfig {
    let map: HashMap<String, String> = pairs
        .iter()
        .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
        .collect();
    AuthConfig::from_lookup(|name| map.get(name).cloned(), production)
}

const DEV: [&str; 3] = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
];

#[test]
fn google_falls_back_to_the_drive_connector_per_variable() {
    let mixed = config(
        &[
            ("GOOGLE_SIGNIN_CLIENT_ID", "sign-id"),
            ("GOOGLE_OAUTH_CLIENT_ID", "drive-id"),
            ("GOOGLE_OAUTH_CLIENT_SECRET", "drive-secret"),
        ],
        true,
    );
    let google = mixed.providers.google.expect("google");
    assert_eq!(google.client_id, "sign-id");
    assert_eq!(google.client_secret.expose(), "drive-secret");

    let id_only = config(&[("GOOGLE_SIGNIN_CLIENT_ID", "x")], true);
    assert!(id_only.providers.google.is_none());
    let blank = config(
        &[
            ("GOOGLE_SIGNIN_CLIENT_ID", "  "),
            ("GOOGLE_SIGNIN_CLIENT_SECRET", "s"),
        ],
        true,
    );
    assert!(blank.providers.google.is_none());
}

#[test]
fn apple_needs_all_four_variables() {
    let all = [
        ("APPLE_CLIENT_ID", "svc"),
        ("APPLE_TEAM_ID", "team"),
        ("APPLE_KEY_ID", "key"),
        ("APPLE_PRIVATE_KEY", "pem"),
    ];
    assert!(config(&all, true).providers.apple.is_some());
    for skip in 0..all.len() {
        let partial: Vec<_> = all
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != skip)
            .map(|(_, pair)| *pair)
            .collect();
        assert!(
            config(&partial, true).providers.apple.is_none(),
            "missing #{skip}"
        );
    }
}

#[test]
fn x_needs_both_variables() {
    assert!(
        config(
            &[("TWITTER_CLIENT_ID", "a"), ("TWITTER_CLIENT_SECRET", "b")],
            true
        )
        .providers
        .twitter
        .is_some()
    );
    assert!(
        config(&[("TWITTER_CLIENT_ID", "a")], true)
            .providers
            .twitter
            .is_none()
    );
}

#[test]
fn the_origin_loses_trailing_slashes_and_paths() {
    let c = config(&[("PUBLIC_ORIGIN", "https://quesar.cloud//")], true);
    assert_eq!(c.public_origin.as_deref(), Some("https://quesar.cloud"));
    let c = config(
        &[("BETTER_AUTH_URL", "https://quesar.cloud/app/x?y=1")],
        true,
    );
    assert_eq!(c.public_origin.as_deref(), Some("https://quesar.cloud"));
    assert_eq!(c.rp_id, "quesar.cloud");
    assert_eq!(c.rp_origins, vec!["https://quesar.cloud"]);
    assert_eq!(c.rp_name, "Quesar");
    let c = config(
        &[
            ("PUBLIC_ORIGIN", "https://a.example"),
            ("BETTER_AUTH_URL", "https://b.example"),
        ],
        true,
    );
    assert_eq!(c.public_origin.as_deref(), Some("https://a.example"));
}

#[test]
fn an_invalid_origin_falls_back_to_the_dev_origins_and_localhost() {
    let c = config(&[("PUBLIC_ORIGIN", "not a url")], false);
    assert_eq!(c.public_origin, None);
    assert_eq!(c.rp_id, "localhost");
    assert_eq!(c.rp_origins, DEV);
    assert_eq!(c.trusted_origins, DEV);
}

#[test]
fn production_excludes_the_dev_origins_from_trust() {
    let c = config(&[("PUBLIC_ORIGIN", "https://quesar.cloud")], true);
    assert_eq!(c.trusted_origins, vec!["https://quesar.cloud"]);
    let c = config(&[("PUBLIC_ORIGIN", "https://quesar.cloud")], false);
    assert_eq!(c.trusted_origins.len(), 4);
    assert_eq!(c.trusted_origins[0], "https://quesar.cloud");
    assert!(config(&[], true).trusted_origins.is_empty());
}

#[test]
fn admin_emails_split_on_whitespace_and_commas() {
    let c = config(&[("ADMIN_EMAILS", " A@x.com,b@y.com\nc@z.com ")], true);
    assert_eq!(c.admin_emails.len(), 3);
    assert!(c.admin_emails.contains("a@x.com"));
    assert!(c.admin_emails.contains("B@Y.com"));
    assert!(c.admin_emails.contains("c@z.com"));
    assert!(config(&[], true).admin_emails.is_empty());
}

#[test]
fn debug_output_contains_no_secret() {
    let c = config(
        &[
            ("GOOGLE_SIGNIN_CLIENT_ID", "g-id"),
            ("GOOGLE_SIGNIN_CLIENT_SECRET", "g-sekret-1"),
            ("APPLE_CLIENT_ID", "svc"),
            ("APPLE_TEAM_ID", "team"),
            ("APPLE_KEY_ID", "key"),
            ("APPLE_PRIVATE_KEY", "pem-sekret-2"),
            ("TWITTER_CLIENT_ID", "x-id"),
            ("TWITTER_CLIENT_SECRET", "x-sekret-3"),
        ],
        true,
    );
    let debug = format!("{c:?}");
    for secret in ["g-sekret-1", "pem-sekret-2", "x-sekret-3"] {
        assert!(!debug.contains(secret), "{secret} leaked");
    }
    assert!(debug.contains("[redacted]"));
}
