/**
 * Admin authorization, replacing mlai's WorkOS `checkAdminAccess` + MFA.
 *
 * An admin is a signed-in user whose email is on the `ADMIN_EMAILS` allowlist
 * AND whose identity was verified by the sign-in broker. Email/password sign-up
 * is open and sends no verification mail, so an allowlisted address on its own
 * proves nothing: anyone could register it. Broker identities (Google / X via
 * the Grok broker) carry a provider-verified email.
 */
import { getSql } from "@/lib/db";
import { adminEmails } from "./config.server";

/** Providers whose sign-in proves control of the email address. */
export const VERIFIED_PROVIDERS = new Set(["grok-google", "grok-x"]);

export interface AdminCandidate {
  email: string;
  emailVerified: boolean;
  /** Better Auth `account.providerId` values linked to this user. */
  providers: string[];
}

export type AdminDecision =
  | { admin: true }
  | { admin: false; reason: "no_allowlist" | "not_allowlisted" | "unverified_identity" };

/** Pure decision, unit-tested. */
export function decideAdmin(user: AdminCandidate, allowlist: Set<string>): AdminDecision {
  if (allowlist.size === 0) return { admin: false, reason: "no_allowlist" };
  if (!allowlist.has(user.email.trim().toLowerCase())) return { admin: false, reason: "not_allowlisted" };
  // Require a linked broker account. `emailVerified` is deliberately not
  // sufficient on its own: it is a mutable column and nothing in this app
  // verifies email/password addresses, so it is not proof of control.
  const brokerLinked = user.providers.some((provider) => VERIFIED_PROVIDERS.has(provider));
  if (!brokerLinked) return { admin: false, reason: "unverified_identity" };
  return { admin: true };
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Admin access required") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Load the candidate for a Better Auth user id. Null when the user row is missing. */
export async function loadAdminCandidate(userId: string): Promise<AdminCandidate | null> {
  const sql = await getSql();
  const users = await sql<{ email: string; emailVerified: boolean }>`
    select "email", "emailVerified" from "user" where "id" = ${userId} limit 1`;
  const user = users[0];
  if (!user) return null;
  const accounts = await sql<{ providerId: string }>`
    select "providerId" from "account" where "userId" = ${userId}`;
  return {
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    providers: accounts.map((row) => row.providerId),
  };
}

export async function adminDecisionFor(userId: string): Promise<AdminDecision> {
  const candidate = await loadAdminCandidate(userId);
  if (!candidate) return { admin: false, reason: "not_allowlisted" };
  return decideAdmin(candidate, adminEmails());
}

/** Throws `ForbiddenError` unless `userId` is an admin. */
export async function assertAdmin(userId: string): Promise<void> {
  const decision = await adminDecisionFor(userId);
  if (!decision.admin) throw new ForbiddenError();
}
