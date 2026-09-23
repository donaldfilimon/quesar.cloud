/**
 * Public contact inquiries (ported from mlai `app/api/inquiries` POST).
 *
 * Order matters: rate limit first (cheapest refusal, and it caps siteverify
 * calls), then field validation, then Turnstile, then the insert. `userId` is
 * recorded only when the caller already had a verified session; anonymous
 * submissions store null. Reading inquiries is an admin concern (WS A).
 */
import { getSql } from "@/lib/db";
import { validateInquiry, type InquiryInput, type InquiryResult } from "@/lib/inquiry-rules";
import { clientSubject, hit, LIMITS } from "./rate-limit.server";
import { turnstileState, verifyTurnstile } from "./turnstile.server";

export interface SubmitContext {
  request: Request;
  userId: string | null;
  now?: number;
}

export async function submitInquiry(
  input: InquiryInput,
  ctx: SubmitContext,
): Promise<InquiryResult> {
  try {
    const { allowed } = await hit("inquiry", clientSubject(ctx.request), LIMITS.inquiry, ctx.now);
    if (!allowed) {
      return {
        ok: false,
        code: "rate_limited",
        error: "Too many inquiries from here. Try again in a few minutes.",
      };
    }
  } catch (error) {
    console.error(
      "Inquiry rate limit unavailable:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      ok: false,
      code: "unavailable",
      error: "We couldn't save that. Try again in a moment.",
    };
  }

  const checked = validateInquiry(input);
  if (!checked.ok)
    return { ok: false, code: "invalid", error: checked.error, field: checked.field };

  const turnstile = turnstileState();
  if (turnstile === "misconfigured") {
    console.error(
      "Turnstile is misconfigured: TURNSTILE_HOSTNAMES is empty while the key and secret are set.",
    );
    return {
      ok: false,
      code: "misconfigured",
      error:
        "Bot verification is misconfigured on this site, so inquiries cannot be accepted right now.",
    };
  }
  if (
    turnstile === "ready" &&
    !(await verifyTurnstile(ctx.request, input.turnstileToken.trim(), "inquiry"))
  ) {
    return {
      ok: false,
      code: "verification",
      error: "We couldn't confirm you're not a bot. Complete the check and try again.",
    };
  }

  const { name, email, company, topic, message } = checked.value;
  try {
    const sql = await getSql();
    await sql`
      insert into inquiries (user_id, name, email, company, project_type, message)
      values (${ctx.userId}, ${name}, ${email}, ${company}, ${topic}, ${message})`;
    return { ok: true };
  } catch (error) {
    console.error(
      "Database error saving inquiry:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      ok: false,
      code: "unavailable",
      error: "We couldn't save that. Try again in a moment.",
    };
  }
}
