import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Link needs a router; these cards are rendered in isolation.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { PLANS } from "@/lib/billing";
import { verificationCopy } from "@/lib/profile";
import { AccountCard, NameForm } from "./account-card";
import { BillingCard } from "./billing-card";
import { SessionsCard } from "./sessions-card";

const noop = () => {};

describe("NameForm", () => {
  // Port of mlai product-forms "limits the profile use case to the server's accepted length".
  it("limits the display name input to mlai's 80-character cap", () => {
    const html = renderToStaticMarkup(
      <NameForm initialName="Ada" onSave={async () => ({ ok: true })} />,
    );
    expect(html).toMatch(/id="displayName"[^>]*maxLength="80"/);
    expect(html).toContain('value="Ada"');
  });
});

describe("AccountCard", () => {
  it("shows linked sign-in methods by label", () => {
    const html = renderToStaticMarkup(
      <AccountCard
        account={{
          name: "Ada",
          email: "ada@example.com",
          image: null,
          emailVerified: true,
          providers: ["grok-google", "credential"],
        }}
      />,
    );
    expect(html).toContain("Google, Email and password");
    expect(html).toContain("Verified");
    expect(html).toContain("ada@example.com");
  });

  it("does not claim a verification mail is pending for email/password accounts", () => {
    expect(verificationCopy(false, ["credential"])).toBe(
      "Not verified (email/password sign-up sends no verification mail)",
    );
    expect(verificationCopy(false, ["grok-x"])).toBe("Not verified");
    expect(verificationCopy(null, null)).toBe("Unknown");
  });
});

describe("BillingCard", () => {
  it("shows the not-configured card and no plans when billing is unconfigured", () => {
    const html = renderToStaticMarkup(
      <BillingCard
        state={{
          kind: "loaded",
          result: { configured: false, provider: "manual", reason: "unconfigured" },
        }}
        pendingPlan={null}
        message={null}
        onCheckout={noop}
      />,
    );
    expect(html).toContain("Billing is not configured yet");
    for (const plan of PLANS) expect(html).not.toContain(plan.name);
    expect(html).not.toContain("$2,500");
    expect(html).not.toContain("Start checkout");
  });

  it("explains a misconfigured link without showing plans", () => {
    const html = renderToStaticMarkup(
      <BillingCard
        state={{
          kind: "loaded",
          result: { configured: false, provider: "manual", reason: "misconfigured" },
        }}
        pendingPlan={null}
        message={null}
        onCheckout={noop}
      />,
    );
    expect(html).toContain("Billing is not configured yet");
    expect(html).toContain("not a usable https payment link");
  });

  it("lists mlai's plans when configured, with checkout only for Pilot", () => {
    const html = renderToStaticMarkup(
      <BillingCard
        state={{
          kind: "loaded",
          result: { configured: true, provider: "stripe", plans: [...PLANS] },
        }}
        pendingPlan={null}
        message={{
          error: "Billing checkout is not configured yet.",
          nextStep: "Set STRIPE_PAYMENT_LINK.",
        }}
        onCheckout={noop}
      />,
    );
    expect(html).toContain("Pilot");
    expect(html).toContain("$2,500/mo");
    expect(html).toContain("Platform");
    expect(html.match(/Start checkout/g)).toHaveLength(1);
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Billing checkout is not configured yet. Set STRIPE_PAYMENT_LINK.");
  });
});

describe("SessionsCard", () => {
  const sessions = [
    {
      id: "s1",
      token: "t1",
      createdAt: "2026-09-22T10:00:00Z",
      expiresAt: "2026-09-29T10:00:00Z",
      userAgent: "Safari",
    },
    {
      id: "s2",
      token: "t2",
      createdAt: "2026-09-21T10:00:00Z",
      expiresAt: "2026-09-28T10:00:00Z",
      userAgent: "Firefox",
    },
  ];

  it("marks the current session and offers revoke only on the others", () => {
    const html = renderToStaticMarkup(
      <SessionsCard
        state={{ kind: "ready", sessions }}
        currentSessionId="s1"
        busy={false}
        canSignOut
        onRevoke={noop}
        onRevokeOthers={noop}
        onSignOutEverywhere={noop}
      />,
    );
    expect(html.match(/This device/g)).toHaveLength(1);
    expect(html.match(/>Revoke</g)).toHaveLength(1);
    expect(html).toContain("Sign out everywhere");
    expect(html).toContain("up to five minutes");
  });

  it("asks for a fresh sign-in when Better Auth refuses to list sessions", () => {
    const html = renderToStaticMarkup(
      <SessionsCard
        state={{ kind: "stale" }}
        currentSessionId="s1"
        busy={false}
        canSignOut
        onRevoke={noop}
        onRevokeOthers={noop}
        onSignOutEverywhere={noop}
      />,
    );
    expect(html).toContain("sign in again to manage sessions");
    // revoke-other-sessions has no freshness check, so it stays usable here.
    expect(html).toMatch(/<button[^>]*>Sign out other sessions<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Sign out other sessions/);
  });

  it("hides sign out everywhere behind a gate session", () => {
    const html = renderToStaticMarkup(
      <SessionsCard
        state={{ kind: "ready", sessions }}
        currentSessionId="s1"
        busy={false}
        canSignOut={false}
        onRevoke={noop}
        onRevokeOthers={noop}
        onSignOutEverywhere={noop}
      />,
    );
    expect(html).not.toContain("Sign out everywhere");
  });
});
