/**
 * Route logic for /api/workspace/*: connect refuses without configuration, the
 * callback refuses a forged or mismatched state before spending the code, and
 * a good callback stores only a sealed refresh token.
 */
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { saveWorkspaceConnection } from "./tokens.server";
import {
  disconnect,
  finishCallback,
  listConnections,
  listSourceFiles,
  requestedDays,
  startConnect,
} from "./handlers.server";
import { encodePendingFlow, encodeWorkspaceState, WORKSPACE_STATE_COOKIE } from "./oauth.server";

const KEY = randomBytes(32).toString("base64");
const ORIGIN = "https://quesar.cloud";
const uid = (label: string) => `test-${label}-${randomBytes(6).toString("hex")}`;

function configureGoogle() {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "google-id");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "google-secret");
}

function callbackRequest(opts: {
  provider?: string;
  code?: string | null;
  state?: string | null;
  cookie?: string | null;
}): Request {
  const url = new URL(`${ORIGIN}/api/workspace/callback/${opts.provider ?? "google"}`);
  if (opts.code !== null) url.searchParams.set("code", opts.code ?? "code-1");
  if (opts.state) url.searchParams.set("state", opts.state);
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `${WORKSPACE_STATE_COOKIE}=${opts.cookie}`);
  return new Request(url, { headers });
}

function spyFetch() {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => ({}) };
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
  vi.stubEnv("MICROSOFT_OAUTH_CLIENT_ID", "");
  vi.stubEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "");
  vi.stubEnv("APP_ENCRYPTION_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startConnect is disabled when unconfigured", () => {
  const request = new Request(`${ORIGIN}/api/workspace/connect/google`);

  it("redirects back with provider_not_configured and sets no state cookie", () => {
    const response = startConnect(request, "google");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/console/workspace?error=provider_not_configured`,
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses when the provider is configured but APP_ENCRYPTION_KEY is missing", () => {
    configureGoogle();
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
    const response = startConnect(request, "google");
    expect(response.headers.get("location")).toContain("error=encryption_not_configured");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a present-but-malformed key too, so a code is never spent on an unsealable token", () => {
    configureGoogle();
    vi.stubEnv("APP_ENCRYPTION_KEY", "too-short");
    const response = startConnect(request, "google");
    expect(response.headers.get("location")).toContain("error=encryption_not_configured");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an unknown provider slug", () => {
    configureGoogle();
    expect(startConnect(request, "dropbox").headers.get("location")).toContain(
      "error=unknown_provider",
    );
  });

  it("when configured, redirects to consent with PKCE and a __Host- state cookie", () => {
    configureGoogle();
    const response = startConnect(request, "google");
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}/api/workspace/callback/google`,
    );
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(response.headers.get("set-cookie")).toMatch(
      /^__Host-quesar_workspace_state=.+; Path=\/; HttpOnly; Secure/,
    );
    expect(response.headers.get("location")).not.toContain("google-secret");
  });
});

describe("finishCallback rejects a bad state before spending the code", () => {
  const userId = "test-state-user";

  async function expectRejected(request: Request, provider = "google") {
    configureGoogle();
    vi.stubEnv("MICROSOFT_OAUTH_CLIENT_ID", "ms-id");
    vi.stubEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "ms-secret");
    const { calls, fetchImpl } = spyFetch();
    const response = await finishCallback(request, provider, userId, fetchImpl);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/console/workspace?error=invalid_state`,
    );
    // Single-use nonce: the pending flow is cleared on the failure path too.
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    // The code was never exchanged.
    expect(calls).toEqual([]);
  }

  it("with a nonce that does not match the cookie", async () => {
    await expectRejected(
      callbackRequest({
        state: encodeWorkspaceState("attacker-nonce", "google"),
        cookie: encodePendingFlow({ nonce: "victim-nonce", verifier: "v", provider: "google" }),
      }),
    );
  });

  it("with no pending-flow cookie at all", async () => {
    await expectRejected(
      callbackRequest({ state: encodeWorkspaceState("n", "google"), cookie: null }),
    );
  });

  it("with no state parameter", async () => {
    await expectRejected(
      callbackRequest({
        state: null,
        cookie: encodePendingFlow({ nonce: "n", verifier: "v", provider: "google" }),
      }),
    );
  });

  it("when a Google callback tries to consume a pending Microsoft flow", async () => {
    await expectRejected(
      callbackRequest({
        provider: "google",
        state: encodeWorkspaceState("n", "microsoft"),
        cookie: encodePendingFlow({ nonce: "n", verifier: "v", provider: "microsoft" }),
      }),
      "google",
    );
  });
});

describe("finishCallback success", () => {
  it("exchanges with the same redirect URI and PKCE verifier, and stores only the sealed refresh token", async () => {
    configureGoogle();
    const userId = uid("cb");
    const refreshToken = `rt-${randomBytes(8).toString("hex")}`;
    const accessToken = `at-${randomBytes(8).toString("hex")}`;
    let exchangeBody = new URLSearchParams();
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (String(url) === "https://oauth2.googleapis.com/token") {
        exchangeBody = new URLSearchParams(String(init?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600,
            scope: "drive.metadata.readonly",
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ email: "ada@example.test" }) };
    }) as unknown as typeof fetch;

    const response = await finishCallback(
      callbackRequest({
        state: encodeWorkspaceState("n1", "google"),
        cookie: encodePendingFlow({ nonce: "n1", verifier: "verifier-1", provider: "google" }),
      }),
      "google",
      userId,
      fetchImpl,
    );
    expect(response.headers.get("location")).toBe(`${ORIGIN}/console/workspace?connected=google`);
    expect(exchangeBody.get("code_verifier")).toBe("verifier-1");
    expect(exchangeBody.get("redirect_uri")).toBe(`${ORIGIN}/api/workspace/callback/google`);

    const sql = await getSql();
    const rows = await sql`select * from workspace_connections where user_id = ${userId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.account_email).toBe("ada@example.test");
    const serialized = JSON.stringify(rows[0]);
    expect(serialized).not.toContain(refreshToken);
    expect(serialized).not.toContain(accessToken);
  }, 30_000);

  it("refuses to store a grant with no refresh token", async () => {
    configureGoogle();
    const userId = uid("nort");
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", expires_in: 3600 }),
    })) as unknown as typeof fetch;
    const response = await finishCallback(
      callbackRequest({
        state: encodeWorkspaceState("n", "google"),
        cookie: encodePendingFlow({ nonce: "n", verifier: "v", provider: "google" }),
      }),
      "google",
      userId,
      fetchImpl,
    );
    expect(response.headers.get("location")).toContain("error=no_refresh_token");
    const sql = await getSql();
    expect(await sql`select 1 from workspace_connections where user_id = ${userId}`).toHaveLength(
      0,
    );
  }, 30_000);
});

describe("listConnections", () => {
  it("reports each provider's availability and reason, scoped to the caller", async () => {
    configureGoogle();
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
    const response = await listConnections(uid("list"));
    const body = (await response.json()) as {
      providers: {
        provider: string;
        configured: boolean;
        reason: string | null;
        connected: boolean;
      }[];
    };
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.providers).toEqual([
      expect.objectContaining({
        provider: "google",
        configured: false,
        reason: "encryption_not_configured",
        connected: false,
      }),
      expect.objectContaining({
        provider: "microsoft",
        configured: false,
        reason: "provider_not_configured",
        connected: false,
      }),
    ]);
  }, 30_000);
});

describe("listSourceFiles", () => {
  it("answers 200 connected:false when unconfigured, without calling the provider", async () => {
    let called = false;
    const response = await listSourceFiles(
      new Request(`${ORIGIN}/api/workspace/drive`),
      "google",
      uid("files"),
      async () => {
        called = true;
        return [];
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      connected: false,
      reason: "provider_not_configured",
      files: [],
    });
    expect(called).toBe(false);
  });

  it("answers not_connected for a configured provider this user never linked", async () => {
    configureGoogle();
    const response = await listSourceFiles(
      new Request(`${ORIGIN}/api/workspace/drive`),
      "google",
      uid("unlinked"),
      async () => [],
    );
    expect(await response.json()).toMatchObject({ connected: false, reason: "not_connected" });
  }, 30_000);

  it("clamps the requested window", () => {
    expect(requestedDays(new Request(`${ORIGIN}/x?days=9999`))).toBe(365);
    expect(requestedDays(new Request(`${ORIGIN}/x?days=-1`))).toBe(30);
    expect(requestedDays(new Request(`${ORIGIN}/x`))).toBe(30);
  });
});

describe("reauth_required after a key rotation", () => {
  it("lists the provider as reauth_required, answers files the same way, and disconnect still deletes", async () => {
    configureGoogle();
    const userId = uid("reauth");
    await saveWorkspaceConnection({
      userId,
      provider: "google",
      refreshToken: "rt",
      accountEmail: "a@x.test",
      scope: null,
    });
    vi.stubEnv("APP_ENCRYPTION_KEY", randomBytes(32).toString("base64"));

    const listed = (await (await listConnections(userId)).json()) as {
      providers: {
        provider: string;
        configured: boolean;
        reason: string | null;
        connected: boolean;
        stored: boolean;
      }[];
    };
    expect(listed.providers[0]).toMatchObject({
      provider: "google",
      configured: true,
      reason: "reauth_required",
      connected: false,
      stored: true,
    });

    let called = false;
    const files = await listSourceFiles(
      new Request(`${ORIGIN}/api/workspace/drive`),
      "google",
      userId,
      async () => {
        called = true;
        return [];
      },
    );
    expect(files.status).toBe(200);
    expect(await files.json()).toMatchObject({
      connected: false,
      reason: "reauth_required",
      files: [],
    });
    expect(called).toBe(false);

    const { calls, fetchImpl } = spyFetch();
    const removed = await disconnect("google", userId, fetchImpl);
    expect(await removed.json()).toMatchObject({ ok: true, removed: true, revoked: false });
    // The token could not be opened, so nothing was sent to the provider.
    expect(calls).toEqual([]);
    const sql = await getSql();
    expect(await sql`select 1 from workspace_connections where user_id = ${userId}`).toHaveLength(
      0,
    );
  }, 30_000);
});
