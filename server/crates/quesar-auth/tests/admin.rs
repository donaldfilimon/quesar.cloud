//! The admin decision, one Rust test per case of `admin.server.test.ts`.
//! No database needed.

use std::collections::HashSet;

use quesar_auth::admin::{AdminCandidate, AdminDecision, VerifiedLink, decide_admin};

fn allowlist() -> HashSet<String> {
    HashSet::from(["donald@example.com".to_owned()])
}

fn candidate(email: &str, verified: bool, providers: &[&str]) -> AdminCandidate {
    AdminCandidate {
        email: email.to_owned(),
        email_verified: verified,
        providers: providers.iter().map(|p| (*p).to_owned()).collect(),
        verified_links: Vec::new(),
    }
}

fn link(provider: &str, email: &str) -> VerifiedLink {
    VerifiedLink {
        provider: provider.to_owned(),
        email: email.to_owned(),
    }
}

#[test]
fn refuses_historical_provider_names_and_evidence_for_a_different_email() {
    let user = candidate("donald@example.com", true, &["google"]);
    assert!(!decide_admin(&user, &allowlist()).is_admin());
    let other = AdminCandidate {
        verified_links: vec![link("google", "other@example.com")],
        ..user
    };
    assert!(!decide_admin(&other, &allowlist()).is_admin());
}

#[test]
fn rejects_an_allowlisted_email_password_account_anyone_can_register_that_address() {
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", false, &["credential"]),
            &allowlist()
        ),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn rejects_an_allowlisted_credential_account_even_if_email_verified_is_set() {
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", true, &["credential"]),
            &allowlist()
        ),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn accepts_an_allowlisted_account_with_a_linked_google_or_apple_identity_case_insensitively() {
    let google = AdminCandidate {
        verified_links: vec![link("google", "donald@example.com")],
        ..candidate("Donald@Example.com", true, &["google"])
    };
    assert_eq!(decide_admin(&google, &allowlist()), AdminDecision::Admin);
    let apple = AdminCandidate {
        verified_links: vec![link("apple", "donald@example.com")],
        ..candidate("donald@example.com", false, &["credential", "apple"])
    };
    assert_eq!(decide_admin(&apple, &allowlist()), AdminDecision::Admin);
}

#[test]
fn does_not_count_x_or_a_passkey_as_proof_of_the_email_address() {
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", true, &["twitter"]),
            &allowlist()
        ),
        AdminDecision::UnverifiedIdentity
    );
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", true, &["credential", "passkey"]),
            &allowlist()
        ),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn no_longer_honours_the_retired_grok_broker_provider_ids() {
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", true, &["grok-google", "grok-x"]),
            &allowlist()
        ),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn rejects_a_verified_account_that_is_not_on_the_allowlist() {
    assert_eq!(
        decide_admin(
            &candidate("someone@example.com", true, &["google"]),
            &allowlist()
        ),
        AdminDecision::NotAllowlisted
    );
}

#[test]
fn grants_nobody_when_the_allowlist_is_empty() {
    assert_eq!(
        decide_admin(
            &candidate("donald@example.com", true, &["google"]),
            &HashSet::new()
        ),
        AdminDecision::NoAllowlist
    );
}

// Beyond the TypeScript cases: the other two refusal edges of the rule.

#[test]
fn a_verification_row_for_a_provider_not_linked_to_the_user_does_not_count() {
    let user = AdminCandidate {
        verified_links: vec![link("google", "donald@example.com")],
        ..candidate("donald@example.com", true, &["credential"])
    };
    assert_eq!(
        decide_admin(&user, &allowlist()),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn a_verification_by_x_or_another_provider_never_counts() {
    let user = AdminCandidate {
        verified_links: vec![link("twitter", "donald@example.com")],
        ..candidate("donald@example.com", true, &["twitter"])
    };
    assert_eq!(
        decide_admin(&user, &allowlist()),
        AdminDecision::UnverifiedIdentity
    );
}

#[test]
fn reasons_serialise_as_the_typescript_strings() {
    let cases = [
        (AdminDecision::Admin, "admin", None),
        (
            AdminDecision::NoAllowlist,
            "no_allowlist",
            Some("no_allowlist"),
        ),
        (
            AdminDecision::NotAllowlisted,
            "not_allowlisted",
            Some("not_allowlisted"),
        ),
        (
            AdminDecision::UnverifiedIdentity,
            "unverified_identity",
            Some("unverified_identity"),
        ),
    ];
    for (decision, json, reason) in cases {
        assert_eq!(serde_json::to_value(decision).unwrap(), json);
        assert_eq!(decision.reason(), reason);
    }
}
