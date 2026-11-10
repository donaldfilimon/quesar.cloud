//! Contact inquiry rules (`src/lib/inquiry-rules.ts`): coercing an untrusted
//! payload into string fields and validating them. Lengths are UTF-16 code
//! units and trimming and the email pattern's `\s` use the ECMAScript
//! whitespace set, as the TypeScript's `.length`, `.trim()` and regex do.
//!
//! The types here are this crate's own; the HTTP handler maps them to the
//! wire types of `quesar-contract`.

use serde_json::Value;

use crate::text::{is_js_whitespace, js_trim, utf16_len, utf16_prefix};

pub const TOPICS: [&str; 6] = [
    "Quesar",
    "Abbey",
    "ABI / WDBX",
    "Services",
    "Investors",
    "Other",
];

pub const NAME_MIN: usize = 2;
pub const NAME_MAX: usize = 80;
pub const EMAIL_MAX: usize = 120;
pub const COMPANY_MAX: usize = 120;
pub const MESSAGE_MIN: usize = 10;
pub const MESSAGE_MAX: usize = 2000;
pub const TOKEN_MAX: usize = 4096;

/// The six strings of the form, untrimmed.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct InquiryInput {
    pub name: String,
    pub email: String,
    pub company: String,
    pub topic: String,
    pub message: String,
    pub turnstile_token: String,
}

/// A field a refusal can name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Field {
    Name,
    Email,
    Company,
    Topic,
    Message,
}

impl Field {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Name => "name",
            Self::Email => "email",
            Self::Company => "company",
            Self::Topic => "topic",
            Self::Message => "message",
        }
    }
}

/// Why an inquiry was refused: the field and the message shown to the sender.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Refusal {
    pub field: Field,
    pub message: String,
}

/// A trimmed inquiry that passed every rule. `topic` is one of [`TOPICS`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidInquiry {
    pub name: String,
    pub email: String,
    pub company: String,
    pub topic: &'static str,
    pub message: String,
}

/// `coerceInquiryInput`: never fails. A non-object (an array included) gives
/// all-empty fields and a non-string member gives `""`. The token is cut to
/// `TOKEN_MAX + 1` UTF-16 units; a cut inside a surrogate pair drops the pair,
/// which no valid token contains.
pub fn coerce(input: &Value) -> InquiryInput {
    let text = |key: &str| match input.get(key) {
        Some(Value::String(value)) => value.clone(),
        _ => String::new(),
    };
    let token = text("turnstileToken");
    InquiryInput {
        name: text("name"),
        email: text("email"),
        company: text("company"),
        topic: text("topic"),
        message: text("message"),
        turnstile_token: utf16_prefix(&token, TOKEN_MAX + 1).to_owned(),
    }
}

/// `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` without a regex engine: no ECMAScript
/// whitespace anywhere, exactly one `@`, a non-empty local part, and a domain
/// holding a `.` that is neither its first nor its last character.
fn is_email(text: &str) -> bool {
    if text.chars().any(is_js_whitespace) {
        return false;
    }
    let mut parts = text.split('@');
    let (Some(local), Some(domain), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    if local.is_empty() {
        return false;
    }
    // A dot with a character on each side: not at the start or the end.
    let mut chars = domain.char_indices().peekable();
    let mut seen_first = false;
    while let Some((_, c)) = chars.next() {
        if c == '.' && seen_first && chars.peek().is_some() {
            return true;
        }
        seen_first = true;
    }
    false
}

fn refuse(field: Field, message: impl Into<String>) -> Result<ValidInquiry, Refusal> {
    Err(Refusal {
        field,
        message: message.into(),
    })
}

/// `validateInquiry`: trims, then checks in the TypeScript's order.
pub fn validate(input: &InquiryInput) -> Result<ValidInquiry, Refusal> {
    let name = js_trim(&input.name);
    let email = js_trim(&input.email);
    let company = js_trim(&input.company);
    let topic = js_trim(&input.topic);
    let message = js_trim(&input.message);

    if utf16_len(name) < NAME_MIN {
        return refuse(Field::Name, "Enter your full name.");
    }
    if utf16_len(name) > NAME_MAX {
        return refuse(
            Field::Name,
            format!("Keep your name under {NAME_MAX} characters."),
        );
    }
    if !is_email(email) || utf16_len(email) > EMAIL_MAX {
        return refuse(Field::Email, "Enter an email address we can reply to.");
    }
    if utf16_len(company) > COMPANY_MAX {
        return refuse(
            Field::Company,
            format!("Keep the organization under {COMPANY_MAX} characters."),
        );
    }
    let Some(topic) = TOPICS.iter().copied().find(|known| *known == topic) else {
        return refuse(Field::Topic, "Choose a topic.");
    };
    if utf16_len(message) < MESSAGE_MIN {
        return refuse(
            Field::Message,
            "Add a bit more detail: at least 10 characters.",
        );
    }
    if utf16_len(message) > MESSAGE_MAX {
        return refuse(
            Field::Message,
            format!("Keep the message under {MESSAGE_MAX} characters."),
        );
    }
    Ok(ValidInquiry {
        name: name.to_owned(),
        email: email.to_owned(),
        company: company.to_owned(),
        topic,
        message: message.to_owned(),
    })
}
