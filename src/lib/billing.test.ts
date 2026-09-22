import { describe, expect, it } from "vitest";
import { PLANS, checkoutFor, plansFor, readBillingConfig } from "./billing";

const envOf = (values: Record<string, string>) => (key: string) => values[key];
const LINK = "https://buy.stripe.com/test_abc";
const user = { id: "user-1", email: "ada@example.com" };

describe("readBillingConfig", () => {
  it("is unconfigured without STRIPE_PAYMENT_LINK and defaults the provider to manual", () => {
    expect(readBillingConfig(envOf({}))).toEqual({ state: "unconfigured", provider: "manual" });
  });

  it("carries BILLING_PROVIDER through", () => {
    const config = readBillingConfig(
      envOf({ BILLING_PROVIDER: "stripe", STRIPE_PAYMENT_LINK: LINK }),
    );
    expect(config.state).toBe("configured");
    expect(config.provider).toBe("stripe");
  });

  it("reports a malformed or non-https link as misconfigured rather than throwing", () => {
    expect(readBillingConfig(envOf({ STRIPE_PAYMENT_LINK: "not a url" })).state).toBe(
      "misconfigured",
    );
    expect(readBillingConfig(envOf({ STRIPE_PAYMENT_LINK: "http://buy.stripe.com/x" })).state).toBe(
      "misconfigured",
    );
  });
});

describe("plansFor", () => {
  it("returns no plans at all when billing is not configured", () => {
    const result = plansFor(readBillingConfig(envOf({})));
    expect(result).toEqual({ configured: false, provider: "manual", reason: "unconfigured" });
    expect("plans" in result).toBe(false);
  });

  it("returns exactly mlai's two plans when configured", () => {
    const result = plansFor(readBillingConfig(envOf({ STRIPE_PAYMENT_LINK: LINK })));
    expect(result.configured).toBe(true);
    if (!result.configured) return;
    expect(result.plans.map((plan) => plan.id)).toEqual(["pilot", "platform"]);
    expect(result.plans).toEqual(PLANS);
    expect(result.plans[0]).toMatchObject({ name: "Pilot", price: "$2,500/mo" });
    expect(result.plans[1]).toMatchObject({ name: "Platform", price: "Custom" });
  });
});

/** Ported from mlai `api.test.ts` "createCheckout renders expected non-2xx outcomes". */
describe("checkoutFor", () => {
  const configured = readBillingConfig(envOf({ STRIPE_PAYMENT_LINK: LINK }));

  it("returns the payment url with client_reference_id and prefilled_email for pilot", () => {
    const result = checkoutFor("pilot", configured, user);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(`${url.origin}${url.pathname}`).toBe(LINK);
    expect(url.searchParams.get("client_reference_id")).toBe("user-1");
    expect(url.searchParams.get("prefilled_email")).toBe("ada@example.com");
  });

  it("omits prefilled_email when the user row has no email (dev fallback)", () => {
    const result = checkoutFor("pilot", configured, { id: "dev-user", email: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(url.searchParams.has("prefilled_email")).toBe(false);
    expect(url.searchParams.get("client_reference_id")).toBe("dev-user");
  });

  it("points platform at sales instead of the pilot link", () => {
    expect(checkoutFor("platform", configured, user)).toEqual({
      ok: false,
      error: "This plan is priced individually and has no self-serve checkout.",
      nextStep: "Contact sales to scope a Platform engagement.",
    });
  });

  it("says checkout is not configured when STRIPE_PAYMENT_LINK is unset", () => {
    const result = checkoutFor("pilot", readBillingConfig(envOf({})), user);
    expect(result).toMatchObject({ ok: false, error: "Billing checkout is not configured yet." });
    expect(result.ok === false && result.nextStep).toMatch(/STRIPE_PAYMENT_LINK/);
  });

  it("says checkout is misconfigured for an unusable link", () => {
    const result = checkoutFor(
      "pilot",
      readBillingConfig(envOf({ STRIPE_PAYMENT_LINK: "nope" })),
      user,
    );
    expect(result).toMatchObject({ ok: false, error: "Billing checkout is misconfigured." });
  });

  it("rejects an unknown plan, including prototype keys", () => {
    expect(checkoutFor("bogus", configured, user)).toEqual({ ok: false, error: "Unknown plan" });
    expect(checkoutFor("toString", configured, user)).toEqual({ ok: false, error: "Unknown plan" });
  });

  it("does not mutate the configured link between calls", () => {
    checkoutFor("pilot", configured, user);
    const second = checkoutFor("pilot", configured, { id: "user-2", email: null });
    expect(second.ok && new URL(second.url).searchParams.get("prefilled_email")).toBeNull();
  });
});
