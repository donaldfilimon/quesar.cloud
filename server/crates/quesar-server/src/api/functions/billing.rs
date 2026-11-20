use std::sync::Arc;

use axum::extract::{Request, State};
use axum::response::Response;
use quesar_contract::billing::{
    BillingPlan, BillingPlansResult, BillingReason, CheckoutResult, CreateCheckout,
    CreateCheckoutInput, GetBillingPlans,
};
use quesar_services::billing::{self, BillingConfig, BillingUnavailable};
use quesar_services::text::utf16_len;

use super::admit;
use crate::api::body::{FN_BODY_MAX, read_value};
use crate::api::{ApiError, FnRouter, error::ok};
use crate::auth::extract::AuthUser;
use crate::router::AppState;

fn plans(config: &BillingConfig) -> BillingPlansResult {
    let provider = config.provider.clone();
    match billing::plans_for(config) {
        Ok(plans) => BillingPlansResult::Configured {
            configured: true,
            provider,
            plans: plans
                .iter()
                .map(|p| BillingPlan {
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    description: p.description,
                })
                .collect(),
        },
        Err(reason) => BillingPlansResult::Unavailable {
            configured: false,
            provider,
            reason: match reason {
                BillingUnavailable::Unconfigured => BillingReason::Unconfigured,
                BillingUnavailable::Misconfigured => BillingReason::Misconfigured,
            },
        },
    }
}

fn checkout(
    plan_id: &str,
    config: &BillingConfig,
    user_id: &str,
    email: Option<&str>,
) -> CheckoutResult {
    match billing::checkout_for(plan_id, config, user_id, email) {
        Ok(url) => CheckoutResult::Ready {
            ok: true,
            url: url.into(),
        },
        Err(refusal) => CheckoutResult::Refused {
            ok: false,
            error: refusal.error,
            next_step: refusal.next_step,
        },
    }
}

async fn get_billing_plans(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Response, ApiError> {
    admit(&state, &auth).await?;
    Ok(ok(plans(&state.signed_in().billing)))
}

async fn create_checkout(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    request: Request,
) -> Result<Response, ApiError> {
    admit(&state, &auth).await?;
    let (parts, body) = request.into_parts();
    let value = read_value(&parts.headers, body, FN_BODY_MAX).await?;
    if !value.is_object() {
        return Err(ApiError::InvalidBody);
    }
    let input: CreateCheckoutInput =
        serde_json::from_value(value).map_err(|_| ApiError::InvalidBody)?;
    if utf16_len(&input.plan_id) > 64 {
        return Err(ApiError::validation(
            "PLAN_ID_TOO_LONG",
            "Choose a plan ID of 64 characters or fewer.",
        ));
    }
    Ok(ok(checkout(
        &input.plan_id,
        &state.signed_in().billing,
        &auth.user.id,
        Some(&auth.user.email),
    )))
}

pub(super) fn register(router: FnRouter) -> FnRouter {
    router
        .function::<GetBillingPlans, _, _>(get_billing_plans)
        .function::<CreateCheckout, _, _>(create_checkout)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json, to_value};

    fn config(vector: &Value) -> BillingConfig {
        BillingConfig::from_lookup(|key| match key {
            "STRIPE_PAYMENT_LINK" => vector["paymentLink"].as_str(),
            "BILLING_PROVIDER" => vector["provider"].as_str(),
            _ => None,
        })
    }

    #[test]
    fn billing_matches_the_committed_typescript_vectors() {
        let vectors: Value = serde_json::from_str(include_str!(
            "../../../../../contract/signed-in-vectors.json"
        ))
        .unwrap();
        let billing = &vectors["billing"];
        for vector in billing["configurations"].as_array().unwrap() {
            let cfg = config(vector);
            let result = to_value(plans(&cfg)).unwrap();
            assert_eq!(result, vector["plans"]);
            if result["configured"] == true {
                assert_eq!(result["plans"], billing["plans"]);
            }
        }
        for vector in billing["checkout"].as_array().unwrap() {
            let result = checkout(
                vector["planId"].as_str().unwrap(),
                &config(vector),
                vector["user"]["id"].as_str().unwrap(),
                vector["user"]["email"].as_str(),
            );
            assert_eq!(to_value(result).unwrap(), vector["result"]);
        }
    }

    #[test]
    fn checkout_preserves_pair_positions_and_reuses_the_original_link() {
        let cfg = config(
            &json!({"paymentLink": "https://pay.example.test/link?tag=a%20b&client_reference_id=old&tag=~&prefilled_email=old1&client_reference_id=old2&prefilled_email=old3#checkout"}),
        );
        let result =
            |id, email| to_value(checkout("pilot", &cfg, id, email)).unwrap()["url"].clone();
        assert_eq!(
            result("one", Some("a+b@example.test")),
            "https://pay.example.test/link?tag=a+b&client_reference_id=one&tag=%7E&prefilled_email=a%2Bb%40example.test#checkout"
        );
        for email in [None, Some("")] {
            assert_eq!(
                result("two", email),
                "https://pay.example.test/link?tag=a+b&client_reference_id=two&tag=%7E&prefilled_email=old1&prefilled_email=old3#checkout"
            );
        }
    }
}
