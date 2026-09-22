/**
 * Shared gate for the `/api/workspace/*` server routes.
 *
 * Every workspace route reads or changes one user's private connections, so
 * each one runs the same three checks as `authMiddleware` before it touches a
 * provider: Fetch-Metadata sibling isolation (`assertSameSiteRequest`), a
 * verified Better Auth session (`requireUserId`, never a client-sent id), and
 * the per-user `workspace` rate limit. Kept in one place so a new workspace
 * route cannot ship without them.
 *
 * Deliberately separate from `handlers.server.ts`: this module pulls in Better
 * Auth and the request context, which the handler unit tests must not load.
 */
import { CrossSiteRequestError, assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";
import { LIMITS, hit } from "@/lib/server/rate-limit.server";
import { PRIVATE_NO_STORE } from "./handlers.server";

export type WorkspaceGate = { ok: true; userId: string } | { ok: false; response: Response };

function deny(status: number, error: string): WorkspaceGate {
  return { ok: false, response: Response.json({ error }, { status, headers: PRIVATE_NO_STORE }) };
}

export async function gateWorkspaceRequest(): Promise<WorkspaceGate> {
  let userId: string;
  try {
    assertSameSiteRequest();
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof CrossSiteRequestError) return deny(403, "Forbidden");
    if (error instanceof UnauthorizedError) return deny(401, "Unauthorized");
    // requireUserId fails closed (auth disabled on a real database): an
    // operator misconfiguration, not the caller's fault.
    console.error("[Workspace] Session check failed:", error instanceof Error ? error.message : error);
    return deny(503, "Sign-in is not available");
  }
  try {
    const { allowed } = await hit("workspace", userId, LIMITS.workspace);
    if (!allowed) return deny(429, "Too many requests. Try again shortly.");
  } catch (error) {
    console.error("[Workspace] Rate limit check failed:", error instanceof Error ? error.message : error);
    return deny(503, "Workspace unavailable");
  }
  return { ok: true, userId };
}
