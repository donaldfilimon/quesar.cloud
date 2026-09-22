/**
 * Console chat, consent, conversation audits and the admin read paths.
 * Ported from mlai `lib/server/{consent,audit-store}.ts` and the
 * `app/api/{llm,consent,audits,admin,telemetry/summary,internal/audits/expire}`
 * route handlers, rekeyed from WorkOS subject+org to the Better Auth user id.
 *
 * Server-only. `src/lib/console.ts` imports this dynamically inside server
 * function handlers so it never reaches the client bundle.
 *
 * Contract kept from mlai: a model reply is returned only after its sealed
 * audit row is durable. If encryption, consent or storage is missing, chat
 * refuses; it never stores plaintext and never returns an unlogged reply.
 *
 * `Sql` has no transactions, so delete/expire use one data-modifying CTE that
 * removes the audit and writes its access event in a single statement.
 */
import { randomUUID, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { adminDecisionFor, type AdminDecision } from "@/lib/server/admin.server";
import { digest, encryptionConfigured, open, seal } from "@/lib/server/crypto.server";

export const CHAT_AUDIT_POLICY_VERSION = "2026-08-24.1";
export const AUDIT_RETENTION_DAYS = 365;
/** mlai: the handler keeps only the last 12 turns. */
export const MAX_TURNS = 12;
/** mlai: 128 KB body cap on `llm/chat`. */
export const MAX_CHAT_BYTES = 128 * 1024;
/** mlai: the prompt textarea's `maxLength`. */
export const MAX_MESSAGE_CHARS = 16_000;
export const REASON_MIN = 8;
export const REASON_MAX = 200;
export const INQUIRY_PAGE_SIZE = 25;

/**
 * mlai's Gemini adapter prepended this; quesar's shared llm adapters do not,
 * so the console adds it. Kept out of the sealed record, as in mlai.
 */
export const SYSTEM_PREAMBLE =
  "You are Quesar, MLAI's private AI systems assistant. Be direct, technical, safety-conscious, and explicit about uncertainty. Never imply that an unverified target is a measured result.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AuditContent = { messages: ChatTurn[]; reply: string };

type Failure<R extends string> = { ok: false; reason: R; message: string };

function fail<R extends string>(reason: R, message: string): Failure<R> {
  return { ok: false, reason, message };
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function isAuditId(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

export function auditAad(id: string, ownerUserId: string): string {
  return `audit:${id}:${ownerUserId}`;
}

/** 8–200 characters after trimming, as in mlai's admin routes. Null when invalid. */
export function validReason(reason: unknown): string | null {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  return trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX ? trimmed : null;
}

/**
 * mlai's message guard: a malformed list (`"x"`, `5`, `[null]`, bad roles,
 * blank content) filters down to nothing rather than throwing. Unlike mlai,
 * a client may not send `system` turns: the server owns the system prompt.
 */
export function sanitizeMessages(input: unknown): ChatTurn[] {
  const candidates: unknown[] = Array.isArray(input) ? input : [];
  return candidates
    .filter((message): message is ChatTurn => {
      if (typeof message !== "object" || message === null) return false;
      const { role, content } = message as { role?: unknown; content?: unknown };
      return (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim().length > 0 &&
        content.length <= MAX_MESSAGE_CHARS
      );
    })
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_TURNS);
}

// ---------------------------------------------------------------- access log

type ActorType = "user" | "admin" | "system";
type AccessAction = "list" | "read" | "export" | "delete" | "expire";
type Outcome = "requested" | "succeeded" | "failed";

async function accessEvent(args: {
  auditId: string | null;
  actorUserId: string;
  actorType: ActorType;
  action: AccessAction;
  outcome: Outcome;
  reason?: string | null;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into audit_access_events (audit_id, actor_user_id, actor_type, action, reason, outcome)
    values (${args.auditId}, ${args.actorUserId}, ${args.actorType}, ${args.action}, ${args.reason ?? null}, ${args.outcome})`;
}

// ------------------------------------------------------------------- consent

export interface ChatConsent {
  policyVersion: string;
  accepted: boolean;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

export async function getChatConsent(userId: string): Promise<ChatConsent> {
  const sql = await getSql();
  const rows = await sql<{ consented_at: unknown; withdrawn_at: unknown }>`
    select consented_at, withdrawn_at from chat_consents
    where user_id = ${userId} and policy_version = ${CHAT_AUDIT_POLICY_VERSION}
    limit 1`;
  const row = rows[0];
  return {
    policyVersion: CHAT_AUDIT_POLICY_VERSION,
    accepted: Boolean(row && !row.withdrawn_at),
    consentedAt: row?.consented_at ? iso(row.consented_at) : null,
    withdrawnAt: row?.withdrawn_at ? iso(row.withdrawn_at) : null,
  };
}

export async function acceptChatConsent(
  userId: string,
  policyVersion: unknown,
): Promise<{ ok: true; consent: ChatConsent } | Failure<"stale_policy">> {
  if (policyVersion !== CHAT_AUDIT_POLICY_VERSION) {
    return fail("stale_policy", "The audit policy changed. Reload and review the current version.");
  }
  const sql = await getSql();
  await sql`
    insert into chat_consents (user_id, policy_version, consented_at, withdrawn_at, updated_at)
    values (${userId}, ${CHAT_AUDIT_POLICY_VERSION}, now(), null, now())
    on conflict (user_id, policy_version) do update set
      consented_at = now(), withdrawn_at = null, updated_at = now()`;
  return { ok: true, consent: await getChatConsent(userId) };
}

export async function withdrawChatConsent(userId: string): Promise<ChatConsent> {
  const sql = await getSql();
  await sql`
    update chat_consents set withdrawn_at = now(), updated_at = now()
    where user_id = ${userId} and policy_version = ${CHAT_AUDIT_POLICY_VERSION}`;
  return getChatConsent(userId);
}

// ---------------------------------------------------------------------- chat

export interface ConsoleStatus {
  llm: { configured: boolean; provider: string | null; model: string | null };
  encryption: boolean;
  consent: ChatConsent;
  policy: { version: string; retentionDays: number };
}

export async function consoleStatus(userId: string): Promise<ConsoleStatus> {
  const { status } = await import("@/lib/server/llm");
  return {
    llm: status(),
    encryption: encryptionConfigured(),
    consent: await getChatConsent(userId),
    policy: { version: CHAT_AUDIT_POLICY_VERSION, retentionDays: AUDIT_RETENTION_DAYS },
  };
}

export type ChatResult =
  | {
      ok: true;
      text: string;
      provider: string;
      model: string;
      audit: { id: string; createdAt: string; expiresAt: string };
    }
  | Failure<
      | "invalid"
      | "too_large"
      | "encryption_not_configured"
      | "consent_required"
      | "llm_not_configured"
      | "rate_limited"
      | "provider_error"
      | "audit_failed"
    >;

/**
 * One chat exchange. Order matters: validate, then refuse without encryption,
 * then refuse without current consent, then refuse without a provider, then
 * count against the rate limit, then call the model, then seal and store the
 * audit, and only then return the reply.
 */
export async function runChat(userId: string, input: unknown): Promise<ChatResult> {
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(input ?? null)).byteLength;
  } catch {
    return fail("invalid", "The conversation could not be read.");
  }
  if (size > MAX_CHAT_BYTES)
    return fail("too_large", "The conversation is too long. Clear it and start again.");
  const messages = sanitizeMessages(input);
  if (!messages.some((message) => message.role === "user")) {
    return fail("invalid", "At least one message is required.");
  }

  if (!encryptionConfigured()) {
    return fail(
      "encryption_not_configured",
      "Chat is off: audit encryption (APP_ENCRYPTION_KEY) is not configured, and chat never runs unaudited.",
    );
  }
  const consent = await getChatConsent(userId);
  if (!consent.accepted) {
    return fail(
      "consent_required",
      "Accept the current conversation audit policy before the first chat.",
    );
  }

  const { complete, status } = await import("@/lib/server/llm");
  if (!status().configured) {
    return fail("llm_not_configured", "No model provider is configured in this environment.");
  }
  const { hit, LIMITS } = await import("@/lib/server/rate-limit.server");
  const gate = await hit("llm", userId, LIMITS.llm);
  if (!gate.allowed)
    return fail("rate_limited", "Too many requests in a short time. Wait a minute and try again.");

  const result = await complete({
    messages: [{ role: "system", content: SYSTEM_PREAMBLE }, ...messages],
  });
  if (!result.ok) {
    return result.reason === "not_configured"
      ? fail("llm_not_configured", result.message)
      : fail(
          "provider_error",
          "The response could not be generated right now. Try again in a moment.",
        );
  }

  try {
    const audit = await recordAudit(
      userId,
      { messages, reply: result.text },
      result.provider,
      result.model,
    );
    return { ok: true, text: result.text, provider: result.provider, model: result.model, audit };
  } catch (error) {
    console.error("Conversation audit could not be stored:", error);
    return fail(
      "audit_failed",
      "The response was withheld because its audit record could not be stored.",
    );
  }
}

async function recordAudit(userId: string, content: AuditContent, provider: string, model: string) {
  const id = randomUUID();
  // One serialization for both the seal and the digest.
  const plaintext = JSON.stringify(content);
  const sealed = seal(plaintext, auditAad(id, userId));
  const sql = await getSql();
  const rows = await sql<{ created_at: unknown; expires_at: unknown }>`
    insert into conversation_audits (id, user_id, provider, model, policy_version, sealed, content_digest, expires_at)
    values (${id}, ${userId}, ${provider}, ${model}, ${CHAT_AUDIT_POLICY_VERSION}, ${sealed}, ${digest(plaintext)},
      now() + make_interval(days => ${AUDIT_RETENTION_DAYS}))
    returning created_at, expires_at`;
  const row = rows[0];
  if (!row) throw new Error("Conversation audit insert returned no row");
  return { id, createdAt: iso(row.created_at), expiresAt: iso(row.expires_at) };
}

// ------------------------------------------------------------ audit reading

export interface AuditSummary {
  id: string;
  userId: string;
  provider: string;
  model: string;
  policyVersion: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuditRecord extends AuditSummary {
  contentDigest: string;
  content: AuditContent;
}

type AuditRow = {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  policy_version: string;
  sealed: string;
  content_digest: string;
  created_at: unknown;
  expires_at: unknown;
};

function summary(row: AuditRow): AuditSummary {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    model: row.model,
    policyVersion: row.policy_version,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
  };
}

export type ReadResult =
  | { ok: true; audit: AuditRecord }
  | Failure<"invalid" | "not_found" | "encryption_not_configured" | "undecryptable" | "forbidden">;

async function readAudit(args: {
  id: string;
  actorUserId: string;
  actorType: "user" | "admin";
  action: "read" | "export";
  reason?: string;
}): Promise<ReadResult> {
  const { id, actorUserId, actorType, action, reason } = args;
  await accessEvent({ auditId: id, actorUserId, actorType, action, outcome: "requested", reason });
  const sql = await getSql();
  const rows =
    actorType === "admin"
      ? await sql<AuditRow>`select * from conversation_audits where id = ${id} and expires_at > now() limit 1`
      : await sql<AuditRow>`select * from conversation_audits
          where id = ${id} and user_id = ${actorUserId} and expires_at > now() limit 1`;
  const row = rows[0];
  if (!row) {
    await accessEvent({ auditId: id, actorUserId, actorType, action, outcome: "failed", reason });
    return fail("not_found", "That audit record no longer exists.");
  }
  if (!encryptionConfigured()) {
    await accessEvent({ auditId: id, actorUserId, actorType, action, outcome: "failed", reason });
    return fail(
      "encryption_not_configured",
      "Audit encryption is not configured, so this record cannot be opened.",
    );
  }
  try {
    // The AAD binds the blob to its OWNER, so an admin read opens with the row's user id.
    const content = JSON.parse(open(row.sealed, auditAad(row.id, row.user_id))) as AuditContent;
    await accessEvent({
      auditId: id,
      actorUserId,
      actorType,
      action,
      outcome: "succeeded",
      reason,
    });
    return { ok: true, audit: { ...summary(row), contentDigest: row.content_digest, content } };
  } catch (error) {
    console.error("Audit could not be decrypted:", error);
    await accessEvent({ auditId: id, actorUserId, actorType, action, outcome: "failed", reason });
    return fail("undecryptable", "That audit record could not be decrypted.");
  }
}

export async function listOwnAudits(userId: string): Promise<AuditSummary[]> {
  await accessEvent({
    auditId: null,
    actorUserId: userId,
    actorType: "user",
    action: "list",
    outcome: "requested",
  });
  const sql = await getSql();
  try {
    const rows = await sql<AuditRow>`
      select * from conversation_audits
      where user_id = ${userId} and expires_at > now()
      order by created_at desc limit 200`;
    await accessEvent({
      auditId: null,
      actorUserId: userId,
      actorType: "user",
      action: "list",
      outcome: "succeeded",
    });
    return rows.map(summary);
  } catch (error) {
    await accessEvent({
      auditId: null,
      actorUserId: userId,
      actorType: "user",
      action: "list",
      outcome: "failed",
    });
    throw error;
  }
}

export async function readOwnAudit(
  userId: string,
  id: unknown,
  exportCopy = false,
): Promise<ReadResult> {
  if (!isAuditId(id)) return fail("invalid", "That audit record could not be opened.");
  return readAudit({
    id,
    actorUserId: userId,
    actorType: "user",
    action: exportCopy ? "export" : "read",
  });
}

/** Delete and log in one statement. Returns whether a row was removed. */
async function deleteAndLog(args: {
  id: string;
  ownerUserId: string | null;
  actorUserId: string;
  actorType: "user" | "admin";
  reason: string | null;
}): Promise<boolean> {
  const { id, ownerUserId, actorUserId, actorType, reason } = args;
  await accessEvent({
    auditId: id,
    actorUserId,
    actorType,
    action: "delete",
    outcome: "requested",
    reason,
  });
  const sql = await getSql();
  try {
    const rows = await sql<{ audit_id: string }>`
      with gone as (
        delete from conversation_audits
        where id = ${id} and expires_at > now()
          and (${ownerUserId}::text is null or user_id = ${ownerUserId}::text)
        returning id
      )
      insert into audit_access_events (audit_id, actor_user_id, actor_type, action, reason, outcome)
      select id, ${actorUserId}, ${actorType}, 'delete', ${reason}::text, 'succeeded' from gone
      returning audit_id`;
    if (rows.length === 0) {
      await accessEvent({
        auditId: id,
        actorUserId,
        actorType,
        action: "delete",
        outcome: "failed",
        reason,
      });
      return false;
    }
    return true;
  } catch (error) {
    try {
      await accessEvent({
        auditId: id,
        actorUserId,
        actorType,
        action: "delete",
        outcome: "failed",
        reason,
      });
    } catch (logError) {
      console.error("Audit deletion failure could not be logged:", logError);
    }
    throw error;
  }
}

export async function deleteOwnAudit(
  userId: string,
  id: unknown,
): Promise<{ ok: true } | Failure<"invalid" | "not_found">> {
  if (!isAuditId(id)) return fail("invalid", "That audit record could not be opened.");
  const deleted = await deleteAndLog({
    id,
    ownerUserId: userId,
    actorUserId: userId,
    actorType: "user",
    reason: null,
  });
  return deleted ? { ok: true } : fail("not_found", "That audit record no longer exists.");
}

// --------------------------------------------------------------------- admin

/**
 * Client-visible admin status. "Not on the allowlist" and "on the allowlist
 * but not broker-verified" collapse to one answer: sign-up is open, so the
 * finer reason would let anyone probe which addresses are admins.
 */
export type AdminStatus = { admin: true } | { admin: false; reason: "no_allowlist" | "not_admin" };

export async function adminStatus(userId: string): Promise<AdminStatus> {
  const decision: AdminDecision = await adminDecisionFor(userId);
  if (decision.admin) return decision;
  return {
    admin: false,
    reason: decision.reason === "no_allowlist" ? "no_allowlist" : "not_admin",
  };
}

async function isAdmin(userId: string): Promise<boolean> {
  return (await adminDecisionFor(userId)).admin;
}

const FORBIDDEN = fail("forbidden", "Admin access required.");
const BAD_REASON = fail(
  "invalid",
  `An access reason of ${REASON_MIN}–${REASON_MAX} characters is required.`,
);

export async function adminListAudits(
  adminId: string,
  args: { reason: unknown; userId?: unknown },
): Promise<{ ok: true; audits: AuditSummary[] } | Failure<"forbidden" | "invalid">> {
  if (!(await isAdmin(adminId))) return FORBIDDEN;
  const reason = validReason(args.reason);
  if (!reason) return BAD_REASON;
  const filter = typeof args.userId === "string" && args.userId.trim() ? args.userId.trim() : null;
  await accessEvent({
    auditId: null,
    actorUserId: adminId,
    actorType: "admin",
    action: "list",
    outcome: "requested",
    reason,
  });
  const sql = await getSql();
  try {
    const rows = await sql<AuditRow>`
      select * from conversation_audits
      where expires_at > now() and (${filter}::text is null or user_id = ${filter}::text)
      order by created_at desc limit 200`;
    await accessEvent({
      auditId: null,
      actorUserId: adminId,
      actorType: "admin",
      action: "list",
      outcome: "succeeded",
      reason,
    });
    return { ok: true, audits: rows.map(summary) };
  } catch (error) {
    await accessEvent({
      auditId: null,
      actorUserId: adminId,
      actorType: "admin",
      action: "list",
      outcome: "failed",
      reason,
    });
    throw error;
  }
}

export async function adminReadAudit(
  adminId: string,
  id: unknown,
  reasonInput: unknown,
): Promise<ReadResult> {
  if (!(await isAdmin(adminId))) return FORBIDDEN;
  const reason = validReason(reasonInput);
  if (!reason) return BAD_REASON;
  if (!isAuditId(id)) return fail("invalid", "That audit record could not be opened.");
  return readAudit({ id, actorUserId: adminId, actorType: "admin", action: "read", reason });
}

export async function adminDeleteAudit(
  adminId: string,
  id: unknown,
  reasonInput: unknown,
): Promise<{ ok: true } | Failure<"forbidden" | "invalid" | "not_found">> {
  if (!(await isAdmin(adminId))) return FORBIDDEN;
  const reason = validReason(reasonInput);
  if (!reason) return BAD_REASON;
  if (!isAuditId(id)) return fail("invalid", "That audit record could not be opened.");
  const deleted = await deleteAndLog({
    id,
    ownerUserId: null,
    actorUserId: adminId,
    actorType: "admin",
    reason,
  });
  return deleted ? { ok: true } : fail("not_found", "That audit record no longer exists.");
}

export interface TelemetrySummary {
  events: Record<string, number>;
  conversion: { opens: number; successes: number; rate: number | null };
}

/** mlai `telemetry/summary`: counts per event plus the inquiry open→success rate. */
export function summarizeTelemetry(
  rows: Array<{ event: string; count: number | string }>,
): TelemetrySummary {
  const events = Object.fromEntries(rows.map((row) => [row.event, Number(row.count)]));
  const opens = events.inquiry_open ?? 0;
  const successes = events.inquiry_success ?? 0;
  return {
    events,
    conversion: {
      opens,
      successes,
      rate: opens > 0 ? Number((successes / opens).toFixed(4)) : null,
    },
  };
}

export async function adminTelemetrySummary(
  adminId: string,
): Promise<{ ok: true; summary: TelemetrySummary } | Failure<"forbidden">> {
  if (!(await isAdmin(adminId))) return FORBIDDEN;
  const sql = await getSql();
  const rows = await sql<{ event: string; count: number }>`
    select event, count(*) as count from telemetry_events group by event order by count(*) desc, event`;
  return { ok: true, summary: summarizeTelemetry(rows) };
}

export interface InquiryRow {
  id: number;
  userId: string | null;
  name: string;
  email: string;
  company: string;
  projectType: string;
  message: string;
  createdAt: string;
}

export async function adminListInquiries(
  adminId: string,
  pageInput: unknown,
): Promise<
  { ok: true; inquiries: InquiryRow[]; page: number; hasMore: boolean } | Failure<"forbidden">
> {
  if (!(await isAdmin(adminId))) return FORBIDDEN;
  const page =
    typeof pageInput === "number" && Number.isInteger(pageInput) && pageInput > 0 ? pageInput : 1;
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    user_id: string | null;
    name: string;
    email: string;
    company: string;
    project_type: string;
    message: string;
    created_at: unknown;
  }>`
    select id, user_id, name, email, company, project_type, message, created_at
    from inquiries order by created_at desc, id desc
    limit ${INQUIRY_PAGE_SIZE + 1} offset ${(page - 1) * INQUIRY_PAGE_SIZE}`;
  return {
    ok: true,
    page,
    hasMore: rows.length > INQUIRY_PAGE_SIZE,
    inquiries: rows.slice(0, INQUIRY_PAGE_SIZE).map((row) => ({
      id: Number(row.id),
      userId: row.user_id,
      name: row.name,
      email: row.email,
      company: row.company,
      projectType: row.project_type,
      message: row.message,
      createdAt: iso(row.created_at),
    })),
  };
}

// ---------------------------------------------------------------------- cron

/**
 * Vercel cron convention: `Authorization: Bearer ${CRON_SECRET}`. No secret
 * configured means the endpoint is off (503), never open.
 */
export function authorizeCron(
  request: Request,
  secret: string | undefined = env("CRON_SECRET"),
): 200 | 401 | 503 {
  if (!secret) return 503;
  const given = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  if (given.length !== expected.length) return 401;
  return timingSafeEqual(given, expected) ? 200 : 401;
}

/** Delete expired audits and log one `expire` event per row, in one statement. */
export async function expireAudits(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ audit_id: string }>`
    with gone as (
      delete from conversation_audits where expires_at <= now() returning id, user_id
    )
    insert into audit_access_events (audit_id, actor_user_id, actor_type, action, reason, outcome)
    select id, user_id, 'system', 'expire', 'one-year retention policy', 'succeeded' from gone
    returning audit_id`;
  return rows.length;
}
