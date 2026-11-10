//! Input validation ported from the TypeScript server.

use std::fmt;

/// Longest display name, in characters (`DISPLAY_NAME_MAX` in `profile-name.ts`).
pub const DISPLAY_NAME_MAX: usize = 80;
/// Better Auth's `minPasswordLength` and `maxPasswordLength`.
pub const PASSWORD_MIN: usize = 8;
pub const PASSWORD_MAX: usize = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValidationError {
    DisplayNameEmpty,
    DisplayNameTooLong,
    InvalidEmail,
    PasswordTooShort,
    PasswordTooLong,
}

impl ValidationError {
    /// Stable machine code (Better Auth's, where one exists).
    pub fn code(self) -> &'static str {
        match self {
            Self::DisplayNameEmpty => "DISPLAY_NAME_REQUIRED",
            Self::DisplayNameTooLong => "DISPLAY_NAME_TOO_LONG",
            Self::InvalidEmail => "INVALID_EMAIL",
            Self::PasswordTooShort => "PASSWORD_TOO_SHORT",
            Self::PasswordTooLong => "PASSWORD_TOO_LONG",
        }
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::DisplayNameEmpty => "Enter a display name.",
            Self::DisplayNameTooLong => "Keep the display name to 80 characters or fewer.",
            Self::InvalidEmail => "Enter a valid email.",
            Self::PasswordTooShort => "Password must be at least 8 characters.",
            Self::PasswordTooLong => "Password must be at most 128 characters.",
        })
    }
}

impl std::error::Error for ValidationError {}

/// Trim, then require 1..=80 characters (not bytes). Rejects rather than truncating.
pub fn display_name(input: &str) -> Result<String, ValidationError> {
    let name = input.trim();
    if name.is_empty() {
        return Err(ValidationError::DisplayNameEmpty);
    }
    if name.chars().count() > DISPLAY_NAME_MAX {
        return Err(ValidationError::DisplayNameTooLong);
    }
    Ok(name.to_owned())
}

/// Trim, lowercase and syntax-check, matching zod's `email()` regex exactly
/// (the rule Better Auth's sign-in applies):
/// `^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`.
///
/// Local part: ASCII runs of `[A-Za-z0-9_'+-]` separated by single dots, the
/// last character not an apostrophe. Domain: one or more labels that start
/// alphanumeric (then alphanumerics or hyphens), then an alphabetic TLD of 2+
/// letters. Anything else, including all non-ASCII, is refused.
pub fn email(input: &str) -> Result<String, ValidationError> {
    // Check the raw trimmed string, as zod does, so a non-ASCII character that
    // lowercases to ASCII (U+212A KELVIN SIGN, U+0130) cannot slip through.
    let email = input.trim();
    if zod_email(email) {
        Ok(email.to_ascii_lowercase())
    } else {
        Err(ValidationError::InvalidEmail)
    }
}

fn zod_email(email: &str) -> bool {
    let Some((local, domain)) = email.split_once('@') else {
        return false;
    };
    let local_char = |c: char| c.is_ascii_alphanumeric() || matches!(c, '_' | '\'' | '+' | '-');
    let local_ok = !local.is_empty()
        && local
            .split('.')
            .all(|run| !run.is_empty() && run.chars().all(local_char))
        && !local.ends_with('\'');
    let labels: Vec<&str> = domain.split('.').collect();
    let Some((tld, labels)) = labels.split_last() else {
        return false;
    };
    let domain_ok = !labels.is_empty()
        && labels.iter().all(|label| {
            let mut chars = label.chars();
            chars.next().is_some_and(|c| c.is_ascii_alphanumeric())
                && chars.all(|c| c.is_ascii_alphanumeric() || c == '-')
        })
        && tld.len() >= 2
        && tld.chars().all(|c| c.is_ascii_alphabetic());
    local_ok && domain_ok
}

/// Require 8..=128 characters.
pub fn password_len(password: &str) -> Result<(), ValidationError> {
    let len = password.chars().count();
    if len < PASSWORD_MIN {
        Err(ValidationError::PasswordTooShort)
    } else if len > PASSWORD_MAX {
        Err(ValidationError::PasswordTooLong)
    } else {
        Ok(())
    }
}
