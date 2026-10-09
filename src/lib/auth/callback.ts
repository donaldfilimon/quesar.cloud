import { safeInternalPath } from "@/lib/internal";

export type SignInFailure = "cancelled" | "unverified" | "expired" | "failed";

/** Provider descriptions are never displayed; only these fixed messages are. */
export function signInFailure(value: unknown): SignInFailure | undefined {
  if (typeof value !== "string" || !value) return undefined;
  if (value === "access_denied" || value === "cancelled") return "cancelled";
  if (value === "provider_email_unverified" || value === "unverified") return "unverified";
  if (["state_not_found", "state_mismatch", "invalid_state", "expired"].includes(value))
    return "expired";
  return "failed";
}

export const signInFailureCopy: Record<SignInFailure, string> = {
  cancelled: "Provider sign-in was cancelled or denied. Try again or use email.",
  unverified:
    "The provider did not confirm a verified email. Use a verified provider account or email sign-in.",
  expired: "Provider sign-in expired. Start a new sign-in attempt.",
  failed: "Provider sign-in could not be completed. Try again or use email.",
};

export function signInErrorURL(next: string): string {
  return `/login?${new URLSearchParams({ next: safeInternalPath(next) })}`;
}
