//! `inquiries.sendInquiry` and `inquiries.getTurnstileConfig`
//! (`src/lib/inquiry-rules.ts`, `src/lib/inquiries.ts`).

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use ts_rs::TS;

use crate::{NoInput, ServerFunction};

/// The six strings of the contact form. A missing or non-string member counts
/// as `""`, as the TypeScript validator does.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(rename_all = "camelCase")]
pub struct SendInquiryInput {
    pub name: String,
    pub email: String,
    pub company: String,
    pub topic: String,
    pub message: String,
    pub turnstile_token: String,
}

impl<'de> Deserialize<'de> for SendInquiryInput {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let serde_json::Value::Object(map) = serde_json::Value::deserialize(d)? else {
            return Err(D::Error::custom("expected an object"));
        };
        let text = |key: &str| match map.get(key) {
            Some(serde_json::Value::String(s)) => s.clone(),
            _ => String::new(),
        };
        Ok(Self {
            name: text("name"),
            email: text("email"),
            company: text("company"),
            topic: text("topic"),
            message: text("message"),
            turnstile_token: text("turnstileToken"),
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(rename_all = "lowercase")]
pub enum InquiryField {
    Name,
    Email,
    Company,
    Topic,
    Message,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(rename_all = "snake_case")]
pub enum InquiryCode {
    Invalid,
    RateLimited,
    Verification,
    Misconfigured,
    Unavailable,
}

/// `{ ok: true } | { ok: false; code; error; field? }`, keyed by the boolean
/// `ok`. `field` is omitted when absent, never `null`.
#[derive(Debug, Clone, PartialEq, Eq, TS)]
#[ts(as = "InquiryResultShape")]
pub enum InquiryResult {
    Sent,
    Refused {
        code: InquiryCode,
        error: String,
        field: Option<InquiryField>,
    },
}

/// The TypeScript declaration of [`InquiryResult`]; never constructed.
#[derive(TS)]
#[ts(rename = "InquiryResult", untagged)]
#[allow(dead_code)]
enum InquiryResultShape {
    Sent {
        #[ts(type = "true")]
        ok: bool,
    },
    Refused {
        #[ts(type = "false")]
        ok: bool,
        code: InquiryCode,
        error: String,
        #[ts(optional)]
        field: Option<InquiryField>,
    },
}

#[derive(Serialize, Deserialize)]
struct InquiryResultWire {
    ok: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    code: Option<InquiryCode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    field: Option<InquiryField>,
}

impl Serialize for InquiryResult {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Sent => InquiryResultWire {
                ok: true,
                code: None,
                error: None,
                field: None,
            },
            Self::Refused { code, error, field } => InquiryResultWire {
                ok: false,
                code: Some(*code),
                error: Some(error.clone()),
                field: *field,
            },
        }
        .serialize(s)
    }
}

impl<'de> Deserialize<'de> for InquiryResult {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let wire = InquiryResultWire::deserialize(d)?;
        if wire.ok {
            return Ok(Self::Sent);
        }
        match (wire.code, wire.error) {
            (Some(code), Some(error)) => Ok(Self::Refused {
                code,
                error,
                field: wire.field,
            }),
            _ => Err(D::Error::custom(
                "a refused inquiry carries `code` and `error`",
            )),
        }
    }
}

/// `{ state: "off" } | { state: "misconfigured" } | { state: "ready"; siteKey }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "lowercase")]
#[ts(tag = "state", rename_all = "lowercase")]
pub enum TurnstileConfig {
    Off,
    Misconfigured,
    Ready {
        #[serde(rename = "siteKey")]
        #[ts(rename = "siteKey")]
        site_key: String,
    },
}

pub struct SendInquiry;
impl ServerFunction for SendInquiry {
    const NAME: &'static str = "inquiries.sendInquiry";
    type Input = SendInquiryInput;
    type Output = InquiryResult;
}

pub struct GetTurnstileConfig;
impl ServerFunction for GetTurnstileConfig {
    const NAME: &'static str = "inquiries.getTurnstileConfig";
    type Input = NoInput;
    type Output = TurnstileConfig;
}
