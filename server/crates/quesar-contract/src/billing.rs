//! The billing functions and their business results.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{NoInput, ServerFunction};

#[derive(Serialize, TS)]
pub struct BillingPlan {
    #[ts(type = "\"pilot\" | \"platform\"")]
    pub id: &'static str,
    pub name: &'static str,
    pub price: &'static str,
    pub description: &'static str,
}

#[derive(Serialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum BillingReason {
    Unconfigured,
    Misconfigured,
}

#[derive(Serialize, TS)]
#[serde(untagged)]
pub enum BillingPlansResult {
    Configured {
        #[ts(type = "true")]
        configured: bool,
        provider: String,
        plans: Vec<BillingPlan>,
    },
    Unavailable {
        #[ts(type = "false")]
        configured: bool,
        provider: String,
        reason: BillingReason,
    },
}

#[derive(Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct CreateCheckoutInput {
    pub plan_id: String,
}

#[derive(Serialize, TS)]
#[serde(untagged)]
pub enum CheckoutResult {
    Ready {
        #[ts(type = "true")]
        ok: bool,
        url: String,
    },
    Refused {
        #[ts(type = "false")]
        ok: bool,
        error: &'static str,
        #[serde(rename = "nextStep", skip_serializing_if = "Option::is_none")]
        #[ts(rename = "nextStep", optional)]
        next_step: Option<&'static str>,
    },
}

pub struct GetBillingPlans;

impl ServerFunction for GetBillingPlans {
    const NAME: &'static str = "billing.getBillingPlans";
    type Input = NoInput;
    type Output = BillingPlansResult;
}

pub struct CreateCheckout;

impl ServerFunction for CreateCheckout {
    const NAME: &'static str = "billing.createCheckout";
    type Input = CreateCheckoutInput;
    type Output = CheckoutResult;
}
