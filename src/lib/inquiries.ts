/**
 * Contact inquiries: the public submit server function and the Turnstile
 * config the `/contact` page needs. Listing inquiries is admin-only (WS A).
 *
 * Public, so there is no `authMiddleware`. A signed-in caller is still
 * attributed: `optionalSession` reads the session the same way
 * `authMiddleware` does, but resolves to `null` instead of throwing.
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { coerceInquiryInput, type InquiryResult } from "@/lib/inquiry-rules";

export { INQUIRY_LIMITS, TOPICS, type InquiryResult, type InquiryTopic } from "@/lib/inquiry-rules";

/**
 * Like `authMiddleware`, minus the refusal. `getSessionUser` (not
 * `requireUserId`) on purpose: with auth disabled `requireUserId` returns the
 * shared dev user, which would stamp every anonymous inquiry with it.
 */
const optionalSession = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    // Live preview: the session rides a bearer token, not a cookie.
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    let userId: string | null = null;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      userId = (await getSessionUser(context.bearerToken))?.id ?? null;
    } catch {
      userId = null;
    }
    return next({ context: { userId } });
  });

export const sendInquiry = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .validator((input: unknown) => coerceInquiryInput(input))
  .handler(async ({ data, context }): Promise<InquiryResult> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { submitInquiry } = await import("@/lib/server/inquiries.server");
    return submitInquiry(data, { request: getRequest(), userId: context.userId });
  });

export type TurnstileConfig =
  | { state: "off" }
  | { state: "misconfigured" }
  | { state: "ready"; siteKey: string };

/** The public Turnstile site key, read from the server environment (never bundled). */
export const getTurnstileConfig = createServerFn({ method: "GET" }).handler(async (): Promise<TurnstileConfig> => {
  const { turnstileSiteKey, turnstileState } = await import("@/lib/server/turnstile.server");
  const state = turnstileState();
  const siteKey = turnstileSiteKey();
  if (state === "ready" && siteKey) return { state, siteKey };
  return state === "misconfigured" ? { state } : { state: "off" };
});
