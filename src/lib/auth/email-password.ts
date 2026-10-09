/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Enabled by default. The login form uses `authClient.signUp.email` and
 * `authClient.signIn.email`; the static Pages build renders an honest notice
 * instead, because it has no authentication server.
 */
export const emailAndPasswordEnabled = true;
