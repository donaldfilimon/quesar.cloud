/** True when the typed confirmation matches the account email (case- and space-insensitive). */
export function confirmationMatches(typed: string, email: string | null): boolean {
  return Boolean(email) && typed.trim().toLowerCase() === (email ?? "").trim().toLowerCase();
}
