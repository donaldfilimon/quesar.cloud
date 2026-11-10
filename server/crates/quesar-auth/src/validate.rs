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

/// Trim, lowercase and syntax-check. Deliberately small: exactly one `@`, a
/// non-empty local part, a domain with a dot whose labels are non-empty, and no
/// whitespace or control characters. Not looser than zod's `email()` for these
/// cases; it may be stricter on exotic quoted local parts, which is acceptable.
pub fn email(input: &str) -> Result<String, ValidationError> {
    let email = input.trim().to_lowercase();
    let bad = email.is_empty()
        || email.len() > 254
        || email.chars().any(|c| c.is_whitespace() || c.is_control());
    let mut parts = email.split('@');
    let (local, domain) = match (parts.next(), parts.next(), parts.next()) {
        (Some(local), Some(domain), None) => (local, domain),
        _ => return Err(ValidationError::InvalidEmail),
    };
    let domain_ok = domain.contains('.') && domain.split('.').all(|label| !label.is_empty());
    if bad || local.is_empty() || !domain_ok {
        return Err(ValidationError::InvalidEmail);
    }
    Ok(email)
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
