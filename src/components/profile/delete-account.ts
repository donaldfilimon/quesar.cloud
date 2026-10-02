/** True when the typed confirmation matches the account email (case- and space-insensitive). */
export function confirmationMatches(typed: string, email: string | null): boolean {
  return Boolean(email) && typed.trim().toLowerCase() === (email ?? "").trim().toLowerCase();
}

/** Deletion may fail after provider revocation or a completed local purge. */
export function deletionError(code: string | undefined, message: string | undefined): string {
  if (
    code === "SESSION_EXPIRED" ||
    code === "SESSION_NOT_FRESH" ||
    /fresh|expired/i.test(message ?? "")
  ) {
    return "For safety, deleting an account needs a recent sign-in. Sign out, sign back in, and try again.";
  }
  if (code === "INVALID_PASSWORD") return "That password is not correct.";
  return "Account deletion did not finish. Some data or connections may already have been removed. Sign in again to check the account, then retry deletion.";
}
