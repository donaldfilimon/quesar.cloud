/**
 * Billing plans and checkout, ported from mlai `app/api/billing/{plans,checkout}`.
 *
 * mlai served a fixed two-plan catalog behind a WorkOS session and handed out a
 * single Stripe payment link. The same contract holds here, with two changes:
 *  - the caller is the Better Auth user (`authMiddleware`), and the checkout
 *    email is read from that user's row, never from client input;
 *  - with no usable `STRIPE_PAYMENT_LINK` the plans call returns no plans at
 *    all, so the page shows "Billing is not configured yet" instead of a
 *    catalog nobody can buy from.
 *
 * Business outcomes (unknown plan, a plan priced individually, checkout not
 * configured) resolve as `{ ok: false, error, nextStep? }` with mlai's copy.
 * Genuine faults (database down, signed out) still throw.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export interface BillingPlan {
  id: PlanId;
  name: string;
  price: string;
  description: string;
}

/** mlai's catalog, verbatim. Only `pilot` has self-serve checkout. */
export const PLANS: readonly BillingPlan[] = [
  {
    id: "pilot",
    name: "Pilot",
    price: "$2,500/mo",
    description:
      "Private console access, protected LLM API, readiness audit support, and prototype evaluation gates.",
  },
  {
    id: "platform",
    name: "Platform",
    price: "Custom",
    description:
      "Team workspaces, private deployment support, custom retrieval pipelines, and production reliability reviews.",
  },
];

/**
 * Plan ids checkout accepts. `platform` is priced "Custom": one Stripe payment
 * link cannot represent a negotiated price, so it points at sales instead.
 */
const CHECKOUT_PLANS = { pilot: true, platform: false } as const;
export type PlanId = keyof typeof CHECKOUT_PLANS;

export type BillingConfig =
  | { state: "configured"; provider: string; paymentLink: URL }
  | { state: "unconfigured"; provider: string }
  | { state: "misconfigured"; provider: string };

type EnvReader = (key: string) => string | undefined;

/**
 * Read billing config. A set-but-unusable `STRIPE_PAYMENT_LINK` (not an https
 * URL) is reported as misconfigured, never as a 500 and never as a live link.
 */
export function readBillingConfig(env: EnvReader): BillingConfig {
  const provider = env("BILLING_PROVIDER") ?? "manual";
  const raw = env("STRIPE_PAYMENT_LINK");
  if (!raw) return { state: "unconfigured", provider };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { state: "misconfigured", provider };
  }
  if (url.protocol !== "https:") return { state: "misconfigured", provider };
  return { state: "configured", provider, paymentLink: url };
}

export type BillingPlansResult =
  | { configured: true; provider: string; plans: BillingPlan[] }
  | { configured: false; provider: string; reason: "unconfigured" | "misconfigured" };

/** What the plans call returns. No plans unless checkout can actually run. */
export function plansFor(config: BillingConfig): BillingPlansResult {
  if (config.state === "configured") {
    return { configured: true, provider: config.provider, plans: [...PLANS] };
  }
  return { configured: false, provider: config.provider, reason: config.state };
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string; nextStep?: string };

/** Pure checkout decision, unit-tested. `email` is omitted from the link when unknown. */
export function checkoutFor(
  planId: string,
  config: BillingConfig,
  user: { id: string; email: string | null },
): CheckoutResult {
  if (!Object.hasOwn(CHECKOUT_PLANS, planId)) {
    return { ok: false, error: "Unknown plan" };
  }
  if (!CHECKOUT_PLANS[planId as PlanId]) {
    return {
      ok: false,
      error: "This plan is priced individually and has no self-serve checkout.",
      nextStep: "Contact sales to scope a Platform engagement.",
    };
  }
  if (config.state !== "configured") {
    return {
      ok: false,
      error:
        config.state === "misconfigured"
          ? "Billing checkout is misconfigured."
          : "Billing checkout is not configured yet.",
      nextStep:
        config.state === "misconfigured"
          ? "STRIPE_PAYMENT_LINK must be an https Stripe payment link."
          : "Set STRIPE_PAYMENT_LINK to enable self-serve checkout.",
    };
  }
  const url = new URL(config.paymentLink);
  if (user.email) url.searchParams.set("prefilled_email", user.email);
  url.searchParams.set("client_reference_id", user.id);
  return { ok: true, url: url.toString() };
}

export const getBillingPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { env } = await import("@/lib/env.server");
    return plansFor(readBillingConfig(env));
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ planId: z.string().max(64) }).parse(input))
  .handler(async ({ context, data }): Promise<CheckoutResult> => {
    const { env } = await import("@/lib/env.server");
    const config = readBillingConfig(env);
    // Only look the user up when a link will actually be built.
    let email: string | null = null;
    if (config.state === "configured" && CHECKOUT_PLANS[data.planId as PlanId] === true) {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ email: string | null }>`
        select "email" from "user" where "id" = ${context.userId} limit 1`;
      email = rows[0]?.email ?? null;
    }
    return checkoutFor(data.planId, config, { id: context.userId, email });
  });
