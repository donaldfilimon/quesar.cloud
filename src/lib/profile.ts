/**
 * Profile data for `/profile`, ported from mlai `views/Profile.tsx` and
 * `app/api/profile/route.ts` onto Better Auth.
 *
 * mlai edited WorkOS first/last name (80 characters each), company and use
 * case. Better Auth keeps one `name`, so the display name carries mlai's
 * per-field 80-character cap. Company and use case were WorkOS metadata and
 * have no column here; they are not ported. The name edit itself goes through
 * `authClient.updateUser` in the browser, so `validateDisplayName` is a client
 * check: Better Auth's own endpoint does not enforce the cap.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/** mlai's per-field name limit (`firstName`/`lastName` were each capped at 80). */
export const DISPLAY_NAME_MAX = 80;

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/** Trim, then require 1..80 characters. Rejects rather than silently truncating. */
export function validateDisplayName(input: string): NameCheck {
  const name = input.trim();
  if (!name) return { ok: false, error: "Enter a display name." };
  if ([...name].length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Keep the display name to ${DISPLAY_NAME_MAX} characters or fewer.` };
  }
  return { ok: true, name };
}

/** Human label for a Better Auth `account.providerId`. */
export function providerLabel(providerId: string): string {
  switch (providerId) {
    case "grok-google":
      return "Google";
    case "grok-x":
      return "X";
    case "credential":
      return "Email and password";
    case "grok-gate":
      return "Grok";
    default:
      return providerId;
  }
}

/** Honest wording: email/password sign-up here sends no verification mail, so "pending" would mislead. */
export function verificationCopy(emailVerified: boolean | null, providers: string[] | null): string {
  if (emailVerified === null) return "Unknown";
  if (emailVerified) return "Verified";
  if (providers?.includes("credential")) {
    return "Not verified (email/password sign-up sends no verification mail)";
  }
  return "Not verified";
}

export interface ProfileRecord {
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: boolean;
  /** Linked sign-in methods (`account.providerId`), de-duplicated. */
  providers: string[];
}

/**
 * The caller's own profile row and linked sign-in methods. Null when the user
 * row does not exist (the disabled-auth dev user has none).
 */
export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProfileRecord | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    // Explicit columns only: `account` also holds OAuth tokens and the password hash.
    const users = await sql<{ name: string | null; email: string | null; image: string | null; emailVerified: boolean }>`
      select "name", "email", "image", "emailVerified" from "user" where "id" = ${context.userId} limit 1`;
    const user = users[0];
    if (!user) return null;
    const accounts = await sql<{ providerId: string }>`
      select "providerId" from "account" where "userId" = ${context.userId}`;
    return {
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: Boolean(user.emailVerified),
      providers: [...new Set(accounts.map((row) => row.providerId))],
    };
  });
