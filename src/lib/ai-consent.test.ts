import { randomBytes, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ owner: "", configured: true, complete: vi.fn() }));
vi.mock("@/lib/auth/middleware", () => ({ authMiddleware: "required-auth" }));
vi.mock("@/lib/static-site", () => ({ staticSite: false }));
// Execute the actual validators/handler closures, with a synthetic authenticated context.
// Real HTTP session admission is separately exercised in the disposable PG browser suite.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (data: unknown) => unknown;
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
  status: () => ({
    configured: fixture.configured,
    provider: fixture.configured ? "xai" : null,
    model: "synthetic",
  }),
  complete: fixture.complete,
}));
import { askPersonaFromClient } from "./ai";
import { askDesk, desks } from "./systems";
import { getSql } from "./db";
import {
  acceptChatConsent,
  CHAT_AUDIT_POLICY_VERSION,
  deleteOwnAudit,
  listOwnAudits,
  readOwnAudit,
  SYSTEM_PREAMBLE,
  withdrawChatConsent,
} from "./console.server";
import { auditAad, expireAudits } from "./console.server";
import { purgeUserData } from "./server/account-deletion.server";
import { open } from "./server/crypto.server";

const key = randomBytes(32).toString("base64");
const prompt = "synthetic-private-document";
const reply = "synthetic-private-reply";
const paths = [
  ...(["abbey", "aviva", "abi"] as const).map((persona) => ({
    name: `persona ${persona}`,
    cap: 280,
    call: () => askPersonaFromClient({ data: { persona, prompt } }),
  })),
  ...desks.map(({ id: desk }) => ({
    name: `desk ${desk}`,
    cap: 320,
    call: () => askDesk({ data: { desk, prompt } }),
  })),
];
beforeEach(() => {
  fixture.owner = `consent-${randomUUID()}`;
  fixture.configured = true;
  fixture.complete
    .mockReset()
    .mockResolvedValue({ ok: true, provider: "xai", model: "synthetic", text: reply });
  process.env.APP_ENCRYPTION_KEY = key;
});
afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
  vi.restoreAllMocks();
});

for (const path of paths)
  describe(path.name, () => {
    it("refuses missing, stale, withdrawn and other-owner consent before provider or quota", async () => {
      const sql = await getSql();
      await acceptChatConsent(`other-${randomUUID()}`, CHAT_AUDIT_POLICY_VERSION);
      expect(await path.call()).toMatchObject({ ok: false, reason: "consent_required" });
      await sql`insert into chat_consents (user_id,policy_version,consented_at) values (${fixture.owner},'old-policy',now())`;
      expect(await path.call()).toMatchObject({ ok: false, reason: "consent_required" });
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      await withdrawChatConsent(fixture.owner);
      expect(await path.call()).toMatchObject({ ok: false, reason: "consent_required" });
      expect(fixture.complete).not.toHaveBeenCalled();
      expect(await sql`select * from rate_limits where subject=${fixture.owner}`).toHaveLength(0);
    });
    it("rejects absent and malformed encryption before provider", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      for (const value of ["", "invalid"]) {
        process.env.APP_ENCRYPTION_KEY = value;
        expect(await path.call()).toMatchObject({ ok: false, reason: "encryption_not_configured" });
      }
      expect(fixture.complete).not.toHaveBeenCalled();
    });
    it("uses server prompts/caps and returns sealed owner records through existing read/export/delete", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      const result = await path.call();
      expect(result.ok).toBe(true);
      if (!result.ok || !("audit" in result)) throw new Error("Expected audited result");
      const request = fixture.complete.mock.calls[0][0];
      expect(request.maxTokens).toBe(path.cap);
      expect(request.messages[0].content).toContain(SYSTEM_PREAMBLE);
      expect(request.messages[0].content).toContain(
        path.name.split(" ")[1] === "wdbx"
          ? "WDBX"
          : path.name.split(" ")[1].replace(/^./, (c) => c.toUpperCase()),
      );
      const sql = await getSql();
      const rows = await sql`select * from conversation_audits where id=${result.audit.id}`;
      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(fixture.owner);
      expect(rows[0].policy_version).toBe(CHAT_AUDIT_POLICY_VERSION);
      expect(JSON.stringify(rows)).not.toContain(prompt);
      expect(JSON.stringify(rows)).not.toContain(reply);
      expect(
        JSON.parse(open(String(rows[0].sealed), auditAad(result.audit.id, fixture.owner))),
      ).toEqual({ messages: request.messages.slice(1), reply });
      expect(
        new Date(result.audit.expiresAt).getTime() - new Date(result.audit.createdAt).getTime(),
      ).toBeGreaterThan(364 * 86400000);
      expect(await listOwnAudits(fixture.owner)).toMatchObject([
        { id: result.audit.id, userId: fixture.owner },
      ]);
      expect(await readOwnAudit(fixture.owner, result.audit.id, true)).toMatchObject({
        ok: true,
        audit: { content: { reply } },
      });
      expect(await readOwnAudit("other-owner", result.audit.id)).toMatchObject({ ok: false });
      expect(await deleteOwnAudit("other-owner", result.audit.id)).toMatchObject({ ok: false });
      expect(await deleteOwnAudit(fixture.owner, result.audit.id)).toMatchObject({ ok: true });
      expect(
        await sql`select id from conversation_audits where id=${result.audit.id}`,
      ).toHaveLength(0);
    });
    it("inherits expiry and account purge for records produced by this handler", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      const expired = await path.call();
      if (!expired.ok || !("audit" in expired)) throw new Error("Expected audit");
      const sql = await getSql();
      await sql`update conversation_audits set expires_at=now()-interval '1 second' where id=${expired.audit.id}`;
      expect(await readOwnAudit(fixture.owner, expired.audit.id)).toMatchObject({
        ok: false,
        reason: "not_found",
      });
      expect(await expireAudits()).toBe(1);
      expect(
        await sql`select action from audit_access_events where audit_id=${expired.audit.id} and action='expire'`,
      ).toHaveLength(1);
      const current = await path.call();
      if (!current.ok || !("audit" in current)) throw new Error("Expected audit");
      expect((await purgeUserData(fixture.owner)).deleted.conversation_audits).toBe(1);
      expect(
        await sql`select id from conversation_audits where user_id=${fixture.owner}`,
      ).toHaveLength(0);
      expect(await sql`select * from chat_consents where user_id=${fixture.owner}`).toHaveLength(0);
    });
    it("withholds a completed reply when sealing fails", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      fixture.complete.mockImplementationOnce(async () => {
        process.env.APP_ENCRYPTION_KEY = "invalidated-after-admission";
        return { ok: true, provider: "xai", model: "synthetic", text: reply };
      });
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await path.call()).toMatchObject({ ok: false, reason: "audit_failed" });
      const sql = await getSql();
      expect(
        await sql`select id from conversation_audits where user_id=${fixture.owner}`,
      ).toHaveLength(0);
      expect(JSON.stringify(log.mock.calls)).not.toContain(reply);
    });
    it("refuses DB-backed quota before provider", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      const sql = await getSql();
      // Fill adjacent windows too, so crossing the minute boundary cannot race this assertion.
      for (const offset of [-60000, 0, 60000]) {
        const start = new Date(Math.floor((Date.now() + offset) / 60000) * 60000).toISOString();
        await sql`insert into rate_limits(bucket,subject,window_start,count) values ('llm',${fixture.owner},${start},12)`;
      }
      expect(await path.call()).toMatchObject({ ok: false, reason: "rate_limited" });
      expect(fixture.complete).not.toHaveBeenCalled();
    });
    it("withholds provider failures and persistence failures without leaking reply or SQL error", async () => {
      await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
      fixture.complete.mockResolvedValueOnce({
        ok: false,
        reason: "provider_error",
        message: "sensitive provider error",
      });
      expect(await path.call()).toMatchObject({ ok: false, reason: "provider_error" });
      const sql = await getSql();
      expect(
        await sql`select id from conversation_audits where user_id=${fixture.owner}`,
      ).toHaveLength(0);
      await sql.query(
        "create function consent_insert_fault() returns trigger language plpgsql as $$ begin raise exception 'sensitive SQL error'; end $$",
      );
      await sql.query(
        "create trigger consent_insert_fault before insert on conversation_audits for each row execute function consent_insert_fault()",
      );
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const result = await path.call();
        expect(result).toMatchObject({ ok: false, reason: "audit_failed" });
        expect(JSON.stringify(result)).not.toMatch(/synthetic-private-reply|sensitive SQL/);
        expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive SQL");
        expect(
          await sql`select id from conversation_audits where user_id=${fixture.owner}`,
        ).toHaveLength(0);
      } finally {
        await sql.query("drop trigger consent_insert_fault on conversation_audits");
        await sql.query("drop function consent_insert_fault()");
      }
    });
  });
it("no-provider desk remains catalog only without key, consent, quota or audit", async () => {
  fixture.configured = false;
  delete process.env.APP_ENCRYPTION_KEY;
  for (const { id: desk } of desks)
    expect(await askDesk({ data: { desk, prompt: "retrieval" } })).toMatchObject({
      ok: true,
      mode: "local",
    });
  expect(fixture.complete).not.toHaveBeenCalled();
  const sql = await getSql();
  expect(await sql`select id from conversation_audits where user_id=${fixture.owner}`).toHaveLength(
    0,
  );
  expect(await sql`select * from rate_limits where subject=${fixture.owner}`).toHaveLength(0);
});
it("bounds the final workspace composition and ignores client system/token overrides", async () => {
  await acceptChatConsent(fixture.owner, CHAT_AUDIT_POLICY_VERSION);
  const composed = `Document titled ${"t".repeat(200)}:\n${"b".repeat(800)}\n\nOperator question: ${"q".repeat(400)}`;
  expect(
    await askPersonaFromClient({
      data: {
        prompt: composed,
        persona: "abbey",
        ...{ systemPrompt: "injected", maxTokens: 9999 },
      },
    }),
  ).toMatchObject({ ok: true });
  expect(fixture.complete.mock.calls[0][0].maxTokens).toBe(280);
  expect(fixture.complete.mock.calls[0][0].messages[0].content).not.toContain("injected");
  expect(fixture.complete.mock.calls[0][0].messages[1].content).toBe(composed);
  await expect(askPersonaFromClient({ data: { prompt: "x".repeat(1601) } })).rejects.toThrow();
});
