/**
 * The social sign-in providers this app can offer, first-party through Better
 * Auth's `socialProviders` (no broker). Dependency-free so both the server
 * (`server.ts`, `methods.server.ts`) and the client (sign-in buttons) import it.
 *
 * A provider only appears on the sign-in page once its credentials are set
 * (see `methods.server.ts`); the ids are Better Auth's own, and each one's
 * OAuth callback is `/api/auth/callback/<id>`.
 */
export type SocialProviderId = "google" | "apple" | "twitter";

export interface SocialProvider {
  id: SocialProviderId;
  /** Human label for the sign-in button. */
  label: string;
}

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "twitter", label: "X" },
];

/** Which sign-in methods the server has credentials for. */
export interface SignInMethods {
  email: boolean;
  passkey: boolean;
  social: SocialProviderId[];
}
