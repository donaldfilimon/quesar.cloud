import { env } from "@/lib/env.server";
import { appleClientSecret } from "./apple-secret.server";
import type { SignInMethods, SocialProviderId } from "./providers";

/**
 * Credentials for each social provider, read from the environment. A provider
 * without a complete set is simply not offered: no dead buttons.
 *
 * - Google: `GOOGLE_SIGNIN_CLIENT_ID`/`_SECRET`, falling back to the Drive
 *   connector's `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` (one Google OAuth client
 *   may carry both redirect URIs).
 * - Apple: `APPLE_CLIENT_ID` (Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
 *   `APPLE_PRIVATE_KEY` (the `.p8` PEM); the client secret is minted from them.
 * - X: `TWITTER_CLIENT_ID`/`_SECRET` (OAuth 2.0 client of an X developer app).
 */
export interface SocialCredentials {
  google?: { clientId: string; clientSecret: string };
  apple?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
}

export function socialCredentials(): SocialCredentials {
  const out: SocialCredentials = {};

  const googleId = env("GOOGLE_SIGNIN_CLIENT_ID") ?? env("GOOGLE_OAUTH_CLIENT_ID");
  const googleSecret = env("GOOGLE_SIGNIN_CLIENT_SECRET") ?? env("GOOGLE_OAUTH_CLIENT_SECRET");
  if (googleId && googleSecret) out.google = { clientId: googleId, clientSecret: googleSecret };

  const apple = {
    clientId: env("APPLE_CLIENT_ID"),
    teamId: env("APPLE_TEAM_ID"),
    keyId: env("APPLE_KEY_ID"),
    privateKey: env("APPLE_PRIVATE_KEY"),
  };
  if (apple.clientId && apple.teamId && apple.keyId && apple.privateKey) {
    try {
      out.apple = {
        clientId: apple.clientId,
        clientSecret: appleClientSecret({
          clientId: apple.clientId,
          teamId: apple.teamId,
          keyId: apple.keyId,
          privateKey: apple.privateKey,
        }),
      };
    } catch (err) {
      // A malformed key disables Apple sign-in rather than the whole server.
      console.error("[auth] APPLE_PRIVATE_KEY could not be used; Apple sign-in is off:", err);
    }
  }

  const twitterId = env("TWITTER_CLIENT_ID");
  const twitterSecret = env("TWITTER_CLIENT_SECRET");
  if (twitterId && twitterSecret)
    out.twitter = { clientId: twitterId, clientSecret: twitterSecret };

  return out;
}

/** Sign-in is on unless `VITE_AUTH_ENABLED` is exactly "false" (the static build). */
export function authEnabledOnServer(): boolean {
  return env("VITE_AUTH_ENABLED") !== "false";
}

export function signInMethods(credentials: SocialCredentials = socialCredentials()): SignInMethods {
  if (!authEnabledOnServer()) return { email: false, passkey: false, social: [] };
  const social = (["google", "apple", "twitter"] as const).filter((id): id is SocialProviderId =>
    Boolean(credentials[id]),
  );
  return { email: true, passkey: true, social };
}
