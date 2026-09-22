/**
 * The token store's security properties, against the real (PGLite) table:
 * only a sealed value is persisted, the seal is bound to one (user, provider),
 * and nothing is stored without a key. Ported in spirit from mlai
 * `workspace-tokens.test.ts`, which could only test the envelope because KMS
 * needed real infrastructure.
 */
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { EncryptionUnavailableError, SealedDataError } from "@/lib/server/crypto.server";
import {
  getWorkspaceAccessToken,
  listWorkspaceConnections,
  readRefreshToken,
  revokeAndDeleteWorkspaceConnection,
  saveWorkspaceConnection,
  workspaceAad,
  WorkspaceNotConnectedError,
} from "./tokens.server";

const KEY = randomBytes(32).toString("base64");
const uid = (label: string) => `test-${label}-${randomBytes(6).toString("hex")}`;

beforeEach(() => {
  vi.stubEnv("APP_ENCRYPTION_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("workspaceAad", () => {
  it("is exactly workspace:<provider>:<userId>, distinct per user and provider", () => {
    expect(workspaceAad("user-1", "google")).toBe("workspace:google:user-1");
    expect(workspaceAad("user-1", "google")).not.toBe(workspaceAad("user-2", "google"));
    expect(workspaceAad("user-1", "google")).not.toBe(workspaceAad("user-1", "microsoft"));
  });
});

describe("saveWorkspaceConnection", () => {
  it("stores only a sealed refresh token: no plaintext anywhere in the row", async () => {
    const userId = uid("plain");
    const refreshToken = `1//rt-${randomBytes(12).toString("hex")}`;
    await saveWorkspaceConnection({
      userId,
      provider: "google",
      refreshToken,
      accountEmail: "ada@example.test",
      scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
    });

    const sql = await getSql();
    const rows = await sql`select * from workspace_connections where user_id = ${userId}`;
    expect(rows).toHaveLength(1);
    const serialized = JSON.stringify(rows[0]);
    expect(serialized).not.toContain(refreshToken);
    expect(String(rows[0]?.sealed)).toMatch(/^v1\./);
    // And the right owner can open it again.
    await expect(readRefreshToken(userId, "google")).resolves.toBe(refreshToken);

    const listed = await listWorkspaceConnections(userId);
    expect(listed).toEqual([
      expect.objectContaining({
        provider: "google",
        accountEmail: "ada@example.test",
        scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
      }),
    ]);
    expect(Number.isNaN(Date.parse(listed[0]!.connectedAt))).toBe(false);
  }, 30_000);

  it("refuses to store anything without APP_ENCRYPTION_KEY", async () => {
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
    const userId = uid("nokey");
    await expect(
      saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt", accountEmail: null, scope: null }),
    ).rejects.toBeInstanceOf(EncryptionUnavailableError);
    const sql = await getSql();
    expect(await sql`select 1 from workspace_connections where user_id = ${userId}`).toHaveLength(0);
  }, 30_000);
});

describe("AAD binding", () => {
  /* The attack the binding exists for: a sealed value lifted from user A's row
     into user B's must not open as B's token. */
  it("a row copied to another user cannot be opened as that user", async () => {
    const alice = uid("alice");
    const mallory = uid("mallory");
    await saveWorkspaceConnection({
      userId: alice,
      provider: "google",
      refreshToken: "alice-refresh-token",
      accountEmail: null,
      scope: null,
    });
    const sql = await getSql();
    await sql`
      insert into workspace_connections (user_id, provider, sealed)
      select ${mallory}, provider, sealed from workspace_connections
      where user_id = ${alice} and provider = 'google'`;

    await expect(readRefreshToken(mallory, "google")).rejects.toBeInstanceOf(SealedDataError);
    await expect(getWorkspaceAccessToken(mallory, "google")).rejects.toThrow();
  }, 30_000);

  it("a Google token copied into the Microsoft slot of the same user is refused", async () => {
    const userId = uid("swap");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "g-rt", accountEmail: null, scope: null });
    const sql = await getSql();
    await sql`
      insert into workspace_connections (user_id, provider, sealed)
      select user_id, 'microsoft', sealed from workspace_connections
      where user_id = ${userId} and provider = 'google'`;
    await expect(readRefreshToken(userId, "microsoft")).rejects.toBeInstanceOf(SealedDataError);
  }, 30_000);
});

describe("getWorkspaceAccessToken", () => {
  it("reports not-connected when no row exists", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    await expect(getWorkspaceAccessToken(uid("none"), "google")).rejects.toBeInstanceOf(WorkspaceNotConnectedError);
  }, 30_000);

  it("mints from the sealed refresh token, persists a rotated one sealed, never the access token", async () => {
    vi.stubEnv("MICROSOFT_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "secret");
    const userId = uid("rotate");
    await saveWorkspaceConnection({ userId, provider: "microsoft", refreshToken: "rt-old", accountEmail: null, scope: null });

    let sentRefresh = "";
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentRefresh = new URLSearchParams(String(init.body)).get("refresh_token") ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "at-live", refresh_token: "rt-new", expires_in: 3600 }),
      };
    }) as unknown as typeof fetch;

    await expect(getWorkspaceAccessToken(userId, "microsoft", fetchImpl)).resolves.toBe("at-live");
    expect(sentRefresh).toBe("rt-old");
    await expect(readRefreshToken(userId, "microsoft")).resolves.toBe("rt-new");

    const sql = await getSql();
    const serialized = JSON.stringify(await sql`select * from workspace_connections where user_id = ${userId}`);
    expect(serialized).not.toContain("rt-new");
    expect(serialized).not.toContain("at-live");
  }, 30_000);
});

describe("revokeAndDeleteWorkspaceConnection", () => {
  it("deletes the row even when the provider revoke fails", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    const userId = uid("disc");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt", accountEmail: null, scope: null });
    const failing = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(revokeAndDeleteWorkspaceConnection(userId, "google", failing)).resolves.toEqual({
      removed: true,
      revoked: false,
    });
    await expect(listWorkspaceConnections(userId)).resolves.toEqual([]);
  }, 30_000);
});

describe("access-token cache follows the stored row", () => {
  function counter(tokens: { access: string; refresh?: string }[]) {
    let calls = 0;
    const fetchImpl = (async () => {
      const next = tokens[Math.min(calls, tokens.length - 1)]!;
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: next.access, refresh_token: next.refresh, expires_in: 3600 }),
      };
    }) as unknown as typeof fetch;
    return { fetchImpl, calls: () => calls };
  }

  beforeEach(() => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  });

  it("serves from cache, then refuses after disconnect instead of returning the stale token", async () => {
    const userId = uid("stale");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt", accountEmail: null, scope: null });
    const { fetchImpl, calls } = counter([{ access: "at-1" }]);
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-1");
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-1");
    expect(calls()).toBe(1);

    // A disconnect that bypasses this process's cache (another instance) is
    // still seen, because the row is checked on every access.
    const sql = await getSql();
    await sql`delete from workspace_connections where user_id = ${userId}`;
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).rejects.toBeInstanceOf(
      WorkspaceNotConnectedError,
    );
    expect(calls()).toBe(1);
  }, 30_000);

  it("drops the cached token when the row is replaced by a reconnect", async () => {
    const userId = uid("reconnect");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt-a", accountEmail: null, scope: null });
    const { fetchImpl, calls } = counter([{ access: "at-a" }, { access: "at-b" }]);
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-a");
    // Replace the row behind the cache's back (another instance's callback).
    const sql = await getSql();
    await sql`update workspace_connections set sealed = ${(await sql<{ sealed: string }>`
      select sealed from workspace_connections where user_id = ${userId}`)[0]!.sealed}, updated_at = now() + interval '1 second'
      where user_id = ${userId}`;
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-b");
    expect(calls()).toBe(2);
  }, 30_000);

  it("a refresh that finishes after the row is gone neither returns nor caches a token", async () => {
    const userId = uid("race");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt", accountEmail: null, scope: null });
    const sql = await getSql();
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      // The user disconnects while the provider call is in flight.
      await sql`delete from workspace_connections where user_id = ${userId}`;
      return { ok: true, status: 200, json: async () => ({ access_token: "at-late", expires_in: 3600 }) };
    }) as unknown as typeof fetch;
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).rejects.toBeInstanceOf(
      WorkspaceNotConnectedError,
    );

    // Reconnect: the late token must not have been cached, so a fresh refresh runs.
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt-2", accountEmail: null, scope: null });
    const { fetchImpl: fresh, calls: freshCalls } = counter([{ access: "at-fresh" }]);
    await expect(getWorkspaceAccessToken(userId, "google", fresh)).resolves.toBe("at-fresh");
    expect(freshCalls()).toBe(1);
    expect(calls).toBe(1);
  }, 30_000);
});

describe("rotated refresh-token write-back is compare-and-swap", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  });

  it("does not overwrite a reconnect that landed during the refresh, and does not cache", async () => {
    const userId = uid("cas");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt-old", accountEmail: null, scope: null });
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        // A concurrent reconnect replaces the row mid-refresh.
        await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt-reconnected", accountEmail: null, scope: null });
        return { ok: true, status: 200, json: async () => ({ access_token: "at-1", refresh_token: "rt-rotated", expires_in: 3600 }) };
      }
      return { ok: true, status: 200, json: async () => ({ access_token: "at-2", expires_in: 3600 }) };
    }) as unknown as typeof fetch;

    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-1");
    // The reconnect wins; the rotated token from the stale grant is discarded.
    await expect(readRefreshToken(userId, "google")).resolves.toBe("rt-reconnected");
    // Not cached: the next access refreshes against the reconnected row.
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-2");
    expect(calls).toBe(2);
  }, 30_000);

  it("persists the rotation when the row is unchanged, and caches it", async () => {
    const userId = uid("cas-ok");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt-old", accountEmail: null, scope: null });
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ access_token: "at-1", refresh_token: "rt-new", expires_in: 3600 }) };
    }) as unknown as typeof fetch;
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-1");
    await expect(readRefreshToken(userId, "google")).resolves.toBe("rt-new");
    await expect(getWorkspaceAccessToken(userId, "google", fetchImpl)).resolves.toBe("at-1");
    expect(calls).toBe(1);
  }, 30_000);
});

describe("key rotation", () => {
  it("flags a row whose token no longer opens as needing reauth", async () => {
    const userId = uid("rotkey");
    await saveWorkspaceConnection({ userId, provider: "google", refreshToken: "rt", accountEmail: "a@x.test", scope: null });
    vi.stubEnv("APP_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const [row] = await listWorkspaceConnections(userId);
    expect(row).toMatchObject({ provider: "google", needsReauth: true, accountEmail: "a@x.test" });
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    await expect(getWorkspaceAccessToken(userId, "google")).rejects.toBeInstanceOf(SealedDataError);
  }, 30_000);
});
