/**
 * Server functions for the console Chat and My audits tabs and for /admin.
 * Ported from mlai `app/api/{llm/status,llm/chat,consent,audits,audits/[id],
 * admin/audits,admin/audits/[id],telemetry/summary,inquiries GET}`.
 *
 * Every function runs `authMiddleware` and scopes by `context.userId`. Admin
 * functions re-check the admin decision on every call (in console.server.ts).
 * Expected refusals come back as `{ ok: false, reason, message }`, never as a
 * thrown error, so the UI can show them honestly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export type {
  AdminStatus,
  AuditContent,
  AuditRecord,
  AuditSummary,
  ChatConsent,
  ChatResult,
  ChatTurn,
  ConsoleStatus,
  InquiryRow,
  ReadResult,
  TelemetrySummary,
} from "./console.server";

const auditRead = z.object({ id: z.string().max(64), download: z.boolean().optional() });
const reasoned = z.object({ id: z.string().max(64), reason: z.string().max(400) });

export const getConsoleStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => (await import("./console.server")).consoleStatus(context.userId));

export const acceptConsent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ policyVersion: z.string().max(64) }).parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).acceptChatConsent(context.userId, data.policyVersion),
  );

export const withdrawConsent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    (await import("./console.server")).withdrawChatConsent(context.userId),
  );

/** Shape and size are checked in `runChat` (mlai's guards), so the input stays `unknown` here. */
export const sendChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ messages: z.unknown() }).parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).runChat(context.userId, data.messages),
  );

export const listMyAudits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => (await import("./console.server")).listOwnAudits(context.userId));

export const readMyAudit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => auditRead.parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).readOwnAudit(context.userId, data.id, data.download),
  );

export const deleteMyAudit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().max(64) }).parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).deleteOwnAudit(context.userId, data.id),
  );

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => (await import("./console.server")).adminStatus(context.userId));

export const adminAudits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ reason: z.string().max(400), userId: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ context, data }) =>
    (await import("./console.server")).adminListAudits(context.userId, data),
  );

export const adminReadAuditFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => reasoned.parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).adminReadAudit(context.userId, data.id, data.reason),
  );

export const adminDeleteAuditFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => reasoned.parse(input))
  .handler(async ({ context, data }) =>
    (await import("./console.server")).adminDeleteAudit(context.userId, data.id, data.reason),
  );

export const adminTelemetry = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    (await import("./console.server")).adminTelemetrySummary(context.userId),
  );

export const adminInquiries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ page: z.number().int().positive().max(10_000) }).parse(input),
  )
  .handler(async ({ context, data }) =>
    (await import("./console.server")).adminListInquiries(context.userId, data.page),
  );
