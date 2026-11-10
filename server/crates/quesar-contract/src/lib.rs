//! The wire contract of the `/api/fn/*` server functions.
//!
//! Every function is a unit struct implementing [`ServerFunction`]; the request
//! and result types derive `TS`, and [`export::files`] renders them as the
//! TypeScript files committed under `src/lib/api/generated/`. The crate holds
//! types only: no database, no HTTP.

use serde::{Deserialize, Serialize, de::DeserializeOwned};
use ts_rs::TS;

pub mod commerce;
pub mod export;
pub mod inquiries;
pub mod quasar;

/// One server function: its wire name and its request and result types.
pub trait ServerFunction {
    /// `<module>.<function>`, matching `^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$`.
    const NAME: &'static str;
    type Input: DeserializeOwned + TS;
    type Output: Serialize + TS;
}

/// The `error` member of a failed reply: `{"ok":false,"error":{...}}`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
pub struct ErrorBody {
    pub name: String,
    pub code: String,
    pub message: String,
}

/// The input of a function that takes no argument. It serialises as `null`,
/// and the TypeScript side sees the type `null`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(type = "null")]
pub struct NoInput;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        commerce::{CommerceReadiness, CommerceStorage, PaymentMode},
        inquiries::{InquiryCode, InquiryField, InquiryResult, SendInquiryInput, TurnstileConfig},
    };
    use serde_json::{Value, json};

    fn round_trip<T: Serialize + DeserializeOwned + PartialEq + std::fmt::Debug>(
        literal: &str,
        value: T,
    ) {
        let expected: Value = serde_json::from_str(literal).unwrap();
        assert_eq!(
            serde_json::to_value(&value).unwrap(),
            expected,
            "serialise {literal}"
        );
        assert_eq!(
            serde_json::from_str::<T>(literal).unwrap(),
            value,
            "parse {literal}"
        );
    }

    #[test]
    fn inquiry_result_shapes() {
        round_trip(r#"{"ok":true}"#, InquiryResult::Sent);
        round_trip(
            r#"{"ok":false,"code":"invalid","error":"Enter a valid email.","field":"email"}"#,
            InquiryResult::Refused {
                code: InquiryCode::Invalid,
                error: "Enter a valid email.".into(),
                field: Some(InquiryField::Email),
            },
        );
    }

    #[test]
    fn inquiry_result_omits_an_absent_field() {
        let refused = InquiryResult::Refused {
            code: InquiryCode::RateLimited,
            error: "Slow down.".into(),
            field: None,
        };
        let value = serde_json::to_value(&refused).unwrap();
        assert!(value.as_object().unwrap().get("field").is_none());
        round_trip(
            r#"{"ok":false,"code":"rate_limited","error":"Slow down."}"#,
            refused,
        );
    }

    #[test]
    fn inquiry_result_refuses_a_malformed_refusal() {
        assert!(serde_json::from_str::<InquiryResult>(r#"{"ok":false}"#).is_err());
    }

    #[test]
    fn every_inquiry_code_and_field_name() {
        for (code, name) in [
            (InquiryCode::Invalid, "invalid"),
            (InquiryCode::RateLimited, "rate_limited"),
            (InquiryCode::Verification, "verification"),
            (InquiryCode::Misconfigured, "misconfigured"),
            (InquiryCode::Unavailable, "unavailable"),
        ] {
            assert_eq!(serde_json::to_value(code).unwrap(), json!(name));
        }
        for (field, name) in [
            (InquiryField::Name, "name"),
            (InquiryField::Email, "email"),
            (InquiryField::Company, "company"),
            (InquiryField::Topic, "topic"),
            (InquiryField::Message, "message"),
        ] {
            assert_eq!(serde_json::to_value(field).unwrap(), json!(name));
        }
    }

    #[test]
    fn turnstile_config_shapes() {
        round_trip(r#"{"state":"off"}"#, TurnstileConfig::Off);
        round_trip(
            r#"{"state":"misconfigured"}"#,
            TurnstileConfig::Misconfigured,
        );
        round_trip(
            r#"{"state":"ready","siteKey":"k"}"#,
            TurnstileConfig::Ready {
                site_key: "k".into(),
            },
        );
        let off = serde_json::to_value(TurnstileConfig::Off).unwrap();
        assert!(off.as_object().unwrap().get("siteKey").is_none());
    }

    #[test]
    fn quasar_origin_is_a_string_or_null() {
        round_trip::<Option<String>>("null", None);
        round_trip::<Option<String>>(
            r#""https://quasar.example""#,
            Some("https://quasar.example".into()),
        );
    }

    #[test]
    fn commerce_readiness_uses_camel_case() {
        round_trip(
            r#"{"configured":false,"paymentMode":"manual_invoice","storage":"wdbx"}"#,
            CommerceReadiness {
                configured: false,
                payment_mode: PaymentMode::ManualInvoice,
                storage: CommerceStorage::Wdbx,
            },
        );
    }

    #[test]
    fn send_inquiry_input_reads_camel_case_and_defaults_to_empty() {
        let full: SendInquiryInput = serde_json::from_str(
            r#"{"name":"A","email":"a@b.c","company":"C","topic":"general","message":"M","turnstileToken":"t"}"#,
        )
        .unwrap();
        assert_eq!(full.turnstile_token, "t");
        assert_eq!(full.topic, "general");
        let sparse: SendInquiryInput =
            serde_json::from_str(r#"{"name":"A","email":5,"company":null,"message":["x"]}"#)
                .unwrap();
        assert_eq!(sparse.name, "A");
        for empty in [
            &sparse.email,
            &sparse.company,
            &sparse.topic,
            &sparse.message,
            &sparse.turnstile_token,
        ] {
            assert_eq!(empty, "");
        }
        assert!(serde_json::from_str::<SendInquiryInput>("[]").is_err());
        let out = serde_json::to_value(&full).unwrap();
        assert_eq!(out["turnstileToken"], json!("t"));
    }

    #[test]
    fn no_input_is_null() {
        round_trip("null", NoInput);
        assert!(serde_json::from_str::<NoInput>("{}").is_err());
    }

    #[test]
    fn error_body_round_trips() {
        round_trip(
            r#"{"name":"ValidationError","code":"INVALID_BODY","message":"Malformed request."}"#,
            ErrorBody {
                name: "ValidationError".into(),
                code: "INVALID_BODY".into(),
                message: "Malformed request.".into(),
            },
        );
    }
}
