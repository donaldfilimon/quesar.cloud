import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { signInMethods, socialCredentials } from "./methods.server";

const KEYS = [
  "VITE_AUTH_ENABLED",
  "GOOGLE_SIGNIN_CLIENT_ID",
  "GOOGLE_SIGNIN_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function clear() {
  for (const k of KEYS) delete process.env[k];
}

describe("signInMethods", () => {
  it("offers email and passkeys but no social button without credentials", () => {
    clear();
    expect(signInMethods()).toEqual({ email: true, passkey: true, social: [] });
  });

  it("offers nothing when auth is disabled (the static build)", () => {
    clear();
    process.env.VITE_AUTH_ENABLED = "false";
    process.env.TWITTER_CLIENT_ID = "x";
    process.env.TWITTER_CLIENT_SECRET = "y";
    expect(signInMethods()).toEqual({ email: false, passkey: false, social: [] });
  });

  it("requires both halves of a credential pair", () => {
    clear();
    process.env.TWITTER_CLIENT_ID = "x";
    expect(socialCredentials().twitter).toBeUndefined();
    process.env.TWITTER_CLIENT_SECRET = "y";
    expect(socialCredentials().twitter).toEqual({ clientId: "x", clientSecret: "y" });
  });

  it("prefers the sign-in Google client and falls back to the Drive connector's", () => {
    clear();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "drive-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "drive-secret";
    expect(socialCredentials().google).toEqual({
      clientId: "drive-id",
      clientSecret: "drive-secret",
    });
    process.env.GOOGLE_SIGNIN_CLIENT_ID = "signin-id";
    process.env.GOOGLE_SIGNIN_CLIENT_SECRET = "signin-secret";
    expect(socialCredentials().google).toEqual({
      clientId: "signin-id",
      clientSecret: "signin-secret",
    });
  });

  it("mints the Apple secret from a complete key set, and lists providers in a stable order", () => {
    clear();
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    process.env.APPLE_CLIENT_ID = "cloud.quesar.signin";
    process.env.APPLE_TEAM_ID = "TEAM123456";
    process.env.APPLE_KEY_ID = "KEY1234567";
    process.env.APPLE_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    process.env.TWITTER_CLIENT_ID = "x";
    process.env.TWITTER_CLIENT_SECRET = "y";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "g";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "s";
    const apple = socialCredentials().apple;
    expect(apple?.clientId).toBe("cloud.quesar.signin");
    expect(apple?.clientSecret.split(".")).toHaveLength(3);
    expect(signInMethods().social).toEqual(["google", "apple", "twitter"]);
  });

  it("turns Apple off, not the server, when the key is malformed", () => {
    clear();
    process.env.APPLE_CLIENT_ID = "cloud.quesar.signin";
    process.env.APPLE_TEAM_ID = "TEAM123456";
    process.env.APPLE_KEY_ID = "KEY1234567";
    process.env.APPLE_PRIVATE_KEY = "not a key";
    const original = console.error;
    console.error = () => {};
    try {
      expect(socialCredentials().apple).toBeUndefined();
    } finally {
      console.error = original;
    }
  });
});
