//! `commerce.getCommerceReadiness` (`src/lib/server/commerce.server.ts`).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{NoInput, ServerFunction};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(rename_all = "snake_case")]
pub enum PaymentMode {
    ManualInvoice,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(rename_all = "snake_case")]
pub enum CommerceStorage {
    Wdbx,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(rename_all = "camelCase")]
pub struct CommerceReadiness {
    pub configured: bool,
    pub payment_mode: PaymentMode,
    pub storage: CommerceStorage,
}

pub struct GetCommerceReadiness;
impl ServerFunction for GetCommerceReadiness {
    const NAME: &'static str = "commerce.getCommerceReadiness";
    type Input = NoInput;
    type Output = CommerceReadiness;
}
