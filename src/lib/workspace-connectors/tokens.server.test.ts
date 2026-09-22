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
      scope: "https://www.googleapis.com/auth/drive.readonly",
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
        scope: "https://www.googleapis.com/auth/drive.readonly",
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
