import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ accepted: false, loading: false, retentionDays: 365 }));
vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => false,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/static-site", () => ({ staticSite: false }));
vi.mock("@/lib/auth/use-current-user", () => ({
  useCurrentUserState: () => ({ user: { id: "disclosure-owner" }, isPending: false }),
}));
vi.mock("./use-ai-consent", () => ({ useAiConsent: () => consent() }));
vi.mock("@/lib/console", () => ({ sendChat: vi.fn() }));
vi.mock("@/lib/ai", () => ({ askPersonaFromClient: vi.fn() }));

import { AiConsentPanel } from "./ai-consent-panel";
import { ChatPanel } from "./chat-panel";
import { WorkspaceApp } from "@/components/apps/workspace-app";
import { SiteFooter } from "@/components/site/footer";
import type { AiConsentState } from "./use-ai-consent";

function consent(): AiConsentState {
  return {
    status: {
      llm: { configured: true, provider: "synthetic-provider", model: "synthetic-model" },
      encryption: true,
      consent: {
        accepted: fixture.accepted,
        policyVersion: "test-policy",
        consentedAt: null,
        withdrawnAt: null,
      },
      policy: { version: "test-policy", retentionDays: fixture.retentionDays },
    },
    error: "",
    loading: fixture.loading,
    ready: fixture.accepted && !fixture.loading,
    reason: "",
    refresh: async () => {},
    accept: async () => {},
    withdraw: async () => {},
  };
}

beforeEach(() => {
  fixture.accepted = false;
  fixture.loading = false;
  fixture.retentionDays = 365;
});

describe("AI transmission disclosures", () => {
  it("distinguishes admission, successful storage, assigned expiry and configured deletion", () => {
    fixture.retentionDays = 17;
    const html = renderToStaticMarkup(<AiConsentPanel consent={consent()} />);
    expect(html).toContain("After a model request is admitted");
    expect(html).toContain("content you submit may contain identifying information");
    expect(html).toContain("Successful exchanges are sealed with AES-256-GCM");
    expect(html).toContain("17-day expiry");
    expect(html).toContain("Automatic deletion requires the configured expiry job");
    expect(html).toContain("A model reply is shown only after its sealed audit is stored");
    expect(html).toContain("Withdrawal blocks future admissions");
    expect(html).toContain("does not cancel requests already admitted or sent");
    expect(html).not.toMatch(/retained for|record is durable|never runs unaudited/);
  });

  it("retains consent controls, busy admission lock and policy/provider presentation", () => {
    let html = renderToStaticMarkup(<AiConsentPanel consent={consent()} />);
    expect(html).toContain("Accept AI audit policy");
    expect(html).toContain("test-policy");
    expect(html).toContain("synthetic-provider / synthetic-model");
    fixture.accepted = true;
    html = renderToStaticMarkup(<AiConsentPanel consent={consent()} busy />);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Withdraw consent<\/button>/);
    expect(html).toContain('href="/console"');
  });

  it("shows bounded workspace transmission and stores before exposing successful replies", () => {
    const html = renderToStaticMarkup(<WorkspaceApp />);
    expect(html).toContain("first 800 body characters");
    expect(html).toContain("and your question to the configured model provider");
    expect(html).toContain(
      "A successful exchange is stored as a sealed audit before its reply is shown",
    );
    expect(html).toContain("Editing alone stays in this browser");
    expect(html).toContain("Accept AI audit policy");
    const chat = renderToStaticMarkup(<ChatPanel onOpenAudits={() => {}} />);
    expect(chat).toContain(
      "A model reply is shown only after its encrypted audit record is stored",
    );
    expect(chat).not.toContain("record is durable");
  });

  it("scopes footer availability and licenses to named source repositories", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(html).toContain("MLAI builds assistant workflows");
    expect(html).toContain("ABI and WDBX include Apache-2.0 licenses");
    expect(html).toContain(String(new Date().getFullYear()));
    expect(html).toContain("static preview provides orientation and browser demos");
    expect(html).toContain(
      "configured server separately supports protected field notes and consent-gated model requests",
    );
    expect(html).not.toMatch(/MLAI Corporation|Apache-2.0 on core runtimes|No hosted session/);
  });
});
