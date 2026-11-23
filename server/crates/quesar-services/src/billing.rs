//! The fixed billing plans and hosted checkout link from `src/lib/billing.ts`.

use url::Url;

use crate::text::js_trim;

pub struct Plan {
    pub id: &'static str,
    pub name: &'static str,
    pub price: &'static str,
    pub description: &'static str,
}

const PLANS: [Plan; 2] = [
    Plan {
        id: "pilot",
        name: "Pilot",
        price: "$2,500/mo",
        description: "Private console access, protected LLM API, readiness audit support, and prototype evaluation gates.",
    },
    Plan {
        id: "platform",
        name: "Platform",
        price: "Custom",
        description: "Team workspaces, private deployment support, custom retrieval pipelines, and production reliability reviews.",
    },
];

#[derive(Clone, Copy)]
pub enum BillingUnavailable {
    Unconfigured,
    Misconfigured,
}

pub struct BillingConfig {
    pub provider: String,
    payment_link: Result<Url, BillingUnavailable>,
}

impl BillingConfig {
    pub fn from_lookup<'a>(lookup: impl Fn(&str) -> Option<&'a str>) -> Self {
        let read = |key| lookup(key).map(js_trim).filter(|value| !value.is_empty());
        let provider = read("BILLING_PROVIDER").unwrap_or("manual").to_owned();
        let payment_link = match read("STRIPE_PAYMENT_LINK") {
            None => Err(BillingUnavailable::Unconfigured),
            Some(raw) => Url::parse(raw)
                .ok()
                .filter(|url| url.scheme() == "https")
                .ok_or(BillingUnavailable::Misconfigured),
        };
        Self {
            provider,
            payment_link,
        }
    }
}

pub fn plans_for(config: &BillingConfig) -> Result<&'static [Plan], BillingUnavailable> {
    config
        .payment_link
        .as_ref()
        .map(|_| &PLANS[..])
        .map_err(|reason| *reason)
}

pub struct CheckoutRefusal {
    pub error: &'static str,
    pub next_step: Option<&'static str>,
}

pub fn checkout_for(
    plan_id: &str,
    config: &BillingConfig,
    user_id: &str,
    email: Option<&str>,
) -> Result<Url, CheckoutRefusal> {
    match plan_id {
        "pilot" => {}
        "platform" => {
            return Err(CheckoutRefusal {
                error: "This plan is priced individually and has no self-serve checkout.",
                next_step: Some("Contact sales to scope a Platform engagement."),
            });
        }
        _ => {
            return Err(CheckoutRefusal {
                error: "Unknown plan",
                next_step: None,
            });
        }
    }
    let link = config
        .payment_link
        .as_ref()
        .map_err(|reason| match reason {
            BillingUnavailable::Unconfigured => CheckoutRefusal {
                error: "Billing checkout is not configured yet.",
                next_step: Some("Set STRIPE_PAYMENT_LINK to enable self-serve checkout."),
            },
            BillingUnavailable::Misconfigured => CheckoutRefusal {
                error: "Billing checkout is misconfigured.",
                next_step: Some("STRIPE_PAYMENT_LINK must be an https Stripe payment link."),
            },
        })?;
    let mut url = link.clone();
    {
        // URLSearchParams.set replaces the first matching pair in place, drops
        // later matches and appends a missing key after the original pairs.
        let email = email.filter(|value| !value.is_empty());
        let mut new_email = email;
        let mut new_id = Some(user_id);
        let mut query = url.query_pairs_mut();
        query.clear();
        for (key, value) in link.query_pairs() {
            let replacement = match key.as_ref() {
                "prefilled_email" if email.is_some() => new_email.take(),
                "client_reference_id" => new_id.take(),
                _ => Some(value.as_ref()),
            };
            if let Some(value) = replacement {
                query.append_pair(&key, value);
            }
        }
        if let Some(value) = new_email {
            query.append_pair("prefilled_email", value);
        }
        if let Some(value) = new_id {
            query.append_pair("client_reference_id", value);
        }
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    #[test]
    fn every_configuration_matches_the_typescript_state_and_normalized_url() {
        let vectors: Value =
            serde_json::from_str(include_str!("../../../contract/signed-in-vectors.json")).unwrap();
        for case in vectors["billing"]["configurations"].as_array().unwrap() {
            let config = BillingConfig::from_lookup(|key| match key {
                "STRIPE_PAYMENT_LINK" => case["paymentLink"].as_str(),
                "BILLING_PROVIDER" => case["provider"].as_str(),
                _ => None,
            });
            let value = match config.payment_link {
                Ok(url) => {
                    json!({"state": "configured", "provider": config.provider, "paymentLink": url.as_str()})
                }
                Err(BillingUnavailable::Unconfigured) => {
                    json!({"state": "unconfigured", "provider": config.provider})
                }
                Err(BillingUnavailable::Misconfigured) => {
                    json!({"state": "misconfigured", "provider": config.provider})
                }
            };
            assert_eq!(value, case["config"]);
        }
    }
}
