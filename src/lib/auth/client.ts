import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "./providers";

/**
 * Better Auth client (browser-side). Talks to this app's own Better Auth at
 * same-origin `/api/auth/*`; the session rides an HttpOnly `__Host-` cookie.
 */
export const authClient = createAuthClient({ plugins: [passkeyClient()] });

/** False only in the static Pages build, which has no auth server. */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export { SOCIAL_PROVIDERS };

/** Start sign-in with a social provider: a full-page redirect to it and back. */
export async function signInWithProvider(
  provider: SocialProviderId,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const callbackURL = opts.callbackURL ?? "/";
  const { data, error } = await authClient.signIn.social({
    provider,
    callbackURL,
    errorCallbackURL: opts.errorCallbackURL ?? "/login",
  });
  if (error) throw new Error(error.message ?? "Sign-in failed");
  if (data?.url) window.location.href = data.url;
}

/** Sign in with a passkey already registered on this device or synced to it. */
export async function signInWithPasskey(): Promise<void> {
  const result = await authClient.signIn.passkey();
  if (result?.error) throw new Error(result.error.message ?? "Passkey sign-in failed");
}

/**
 * Sign out, then redirect. Rejects when the server does not confirm: the
 * session is an HttpOnly cookie only the server can clear, so redirecting
 * anyway would report a sign-out that did not happen. `<UserButton />` handles
 * that; a hand-rolled control must catch it and let the visitor retry.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  window.location.href = redirectTo;
}
