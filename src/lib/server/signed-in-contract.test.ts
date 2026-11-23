import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  configured: false,
  owner: "",
  complete: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({ authMiddleware: "required-auth" }));
vi.mock("@/lib/static-site", () => ({ staticSite: false }));
vi.mock("@/lib/db", async (importOriginal) => {
  // Force the production database module to select disposable in-memory PGLite.
  const databaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return await importOriginal();
  } finally {
    if (databaseUrl !== undefined) process.env.DATABASE_URL = databaseUrl;
  }
});
vi.mock("@/framework/server-fn", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      middleware(items: unknown[]) {
        expect(items).toEqual(["required-auth"]);
        return builder;
      },
      validator(parse: (data: unknown) => unknown) {
        validate = parse;
        return builder;
      },
      handler(run: (args: { data: unknown; context: { userId: string } }) => unknown) {
        return async ({ data }: { data: unknown }) =>
          run({ data: validate(data), context: { userId: fixture.owner } });
      },
    };
    return builder;
  },
}));
vi.mock("@/lib/server/llm", () => ({
  status: () => ({ configured: fixture.configured, provider: "xai", model: "synthetic" }),
  complete: fixture.complete,
}));

import { askPersonaFromClient } from "@/lib/ai";
import { checkoutFor, plansFor, PLANS, readBillingConfig } from "@/lib/billing";
import {
  acceptChatConsent,
  auditAad,
  AUDIT_RETENTION_DAYS,
  CHAT_AUDIT_POLICY_VERSION,
  INQUIRY_PAGE_SIZE,
  MAX_CHAT_BYTES,
  MAX_MESSAGE_CHARS,
  MAX_TURNS,
  REASON_MAX,
  REASON_MIN,
  summarizeTelemetry,
  SYSTEM_PREAMBLE,
} from "@/lib/console.server";
import { architectureNodes } from "@/lib/mlai/categories/architecture";
import { askDesk, desks } from "@/lib/systems";
import { digest, openWithKey, sealWithKey } from "./crypto.server";

const catalogFile = new URL("../../../server/contract/architecture-catalog.json", import.meta.url);
const vectorsFile = new URL("../../../server/contract/signed-in-vectors.json", import.meta.url);
const regenerate = process.env.GEN_CONTRACT_VECTORS === "1";
// A fixed, public fixture key, for compatibility checks only.
const auditKey = Buffer.alloc(32, 0x04);

function checkFixture(file: URL, data: unknown) {
  if (regenerate) writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(data);
}

it("keeps the embedded architecture catalog aligned with the desk's TypeScript source", () => {
  checkFixture(
    catalogFile,
    architectureNodes.map((node) => ({
      id: node.id,
      title: node.name,
      href: `/architecture?node=${node.id}`,
      excerpt: `${node.summary} ${node.detail}`.slice(0, 280),
      searchText: `${node.name} ${node.summary} ${node.detail} ${node.implemented.join(" ")}`,
    })),
  );
});

function billingVectors() {
  const config = (
    paymentLink: string | undefined,
    provider?: string,
  ) => readBillingConfig((key) =>
    (key === "STRIPE_PAYMENT_LINK" ? paymentLink : provider)?.trim() || undefined,
  );
  const urls = [
    undefined,
    " ",
    "not a url",
    "http://checkout.example.test/link",
    "https://checkout.example.test/link?source=alpha",
    "https://checkout.example.test",
  ];
  const user = { id: "fixture/owner", email: "fixtures+signed in@example.test" };
  const checkout = [
    { planId: "pilot", paymentLink: urls[4], user },
    { planId: "pilot", paymentLink: "https://checkout.example.test/?prefilled_email=old&prefilled_email=older", user },
    { planId: "pilot", paymentLink: urls[5], user: { ...user, email: null } },
    { planId: "pilot", paymentLink: urls[1], user },
    { planId: "pilot", paymentLink: urls[3], user },
    { planId: "platform", paymentLink: urls[4], user },
    { planId: "unknown", paymentLink: urls[4], user },
    { planId: "constructor", paymentLink: urls[4], user },
  ];
  return {
    plans: PLANS,
    configurations: urls.map((paymentLink, index) => {
      const provider = index === 4 ? "stripe" : undefined;
      const result = config(paymentLink, provider);
      return { paymentLink: paymentLink ?? null, provider: provider ?? null, config: JSON.parse(JSON.stringify(result)), plans: plansFor(result) };
    }),
    checkout: checkout.map(({ planId, paymentLink, user }) => ({
      planId,
      paymentLink: paymentLink ?? null,
      user,
      result: checkoutFor(planId, config(paymentLink), user),
    })),
  };
}

async function deskVectors() {
  const vectors = [];
  for (const { id: desk } of desks) {
    for (const prompt of ["semantic routing", "xyzzynonmatch", "a an to", "DATA, store!", "KEY"]) {
      vectors.push({ desk, prompt, result: await askDesk({ data: { desk, prompt } }) });
    }
  }
  return vectors;
}

async function modelVectors() {
  fixture.owner = `signed-in-contract-${randomUUID()}`;
  fixture.configured = true;
  fixture.complete.mockResolvedValue({
    ok: true,
    text: "Synthetic model reply",
    provider: "xai",
    model: "synthetic",
  });
  vi.stubEnv("APP_ENCRYPTION_KEY", auditKey.toString("base64"));

  const prompt = "What does the route ledger show?";
  const requests = [];
  try {
    const consent = await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
    expect(consent.ok).toBe(true);
    for (const { id: desk } of desks) {
      fixture.complete.mockClear();
      const result = await askDesk({ data: { desk, prompt } });
      expect(result).toMatchObject({ ok: true, mode: "model" });
      expect(fixture.complete).toHaveBeenCalledTimes(1);
      requests.push({ kind: "desk", desk, prompt, request: fixture.complete.mock.calls[0][0] });
    }
    for (const persona of ["abbey", "aviva", "abi"] as const) {
      fixture.complete.mockClear();
      const result = await askPersonaFromClient({ data: { persona, prompt } });
      expect(result.ok).toBe(true);
      expect(fixture.complete).toHaveBeenCalledTimes(1);
      requests.push({ kind: "persona", persona, prompt, request: fixture.complete.mock.calls[0][0] });
    }
    return requests;
  } finally {
    fixture.configured = false;
    vi.unstubAllEnvs();
  }
}

it("keeps the signed-in behavior vectors aligned with the TypeScript handlers", async () => {
  const deskLocal = await deskVectors();
  expect(fixture.complete).not.toHaveBeenCalled();
  const modelRequests = await modelVectors();
  const telemetryRows = [
    [],
    [
      { event: "inquiry_open", count: "3" },
      { event: "inquiry_success", count: 1 },
      { event: "page_view", count: 10 },
    ],
  ];
  const id = "00000000-0000-4000-8000-000000000004";
  const owner = "signed-in-contract-test-owner";
  const aad = auditAad(id, owner);
  const plaintext = JSON.stringify({
    messages: [{ role: "user", content: 'Café "fixture"\n契約' }],
    reply: "Synthetic contract reply.",
  });
  const audit = { id, owner, aad, plaintext, digest: digest(plaintext), key: auditKey.toString("base64") };
  const vectors = {
    deskLocal,
    modelRequests,
    billing: billingVectors(),
    telemetry: telemetryRows.map((rows) => ({ rows, result: summarizeTelemetry(rows) })),
    constants: {
      CHAT_AUDIT_POLICY_VERSION,
      AUDIT_RETENTION_DAYS,
      MAX_TURNS,
      MAX_CHAT_BYTES,
      MAX_MESSAGE_CHARS,
      REASON_MIN,
      REASON_MAX,
      INQUIRY_PAGE_SIZE,
      SYSTEM_PREAMBLE,
    },
  };
  if (regenerate) {
    const sealed = sealWithKey(auditKey, plaintext, aad);
    writeFileSync(vectorsFile, `${JSON.stringify({ ...vectors, audit: { ...audit, sealed } }, null, 2)}\n`);
  }
  const { audit: recordedAudit, ...recordedVectors } = JSON.parse(readFileSync(vectorsFile, "utf8"));
  const { sealed, ...auditHeader } = recordedAudit;
  expect(recordedVectors).toEqual(vectors);
  expect(auditHeader).toEqual(audit);
  expect(openWithKey(auditKey, sealed, aad)).toBe(plaintext);
});
