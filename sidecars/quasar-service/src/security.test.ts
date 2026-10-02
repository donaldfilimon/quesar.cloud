import { test, expect } from "bun:test";
import { mkdtempSync, statSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { networkPolicy, pairingSecret, PreviewSessions } from "./security";
import { childEnvironment } from "./preview";

test("persistent operator credential is private and insecure existing files fail closed", () => {
  const home = mkdtempSync(path.join(tmpdir(), "quasar-security-"));
  const value = pairingSecret(home);
  expect(value.length).toBe(43);
  expect(pairingSecret(home)).toBe(value);
  expect(statSync(path.join(home, "pairing-token")).mode & 0o777).toBe(0o600);
  chmodSync(path.join(home, "pairing-token"), 0o644);
  expect(() => pairingSecret(home)).toThrow("0600");
});
test("loopback is default; network access and exact public host require explicit configuration", () => {
  expect(networkPolicy({}).hostname).toBe("127.0.0.1");
  expect(() => networkPolicy({ QUASAR_HOST: "0.0.0.0" })).toThrow("QUASAR_ALLOW_NETWORK");
  expect(() => networkPolicy({ QUASAR_HOST: "0.0.0.0", QUASAR_ALLOW_NETWORK: "true" })).toThrow("QUASAR_PUBLIC_ORIGIN");
  expect(networkPolicy({ QUASAR_HOST: "0.0.0.0", QUASAR_ALLOW_NETWORK: "true", QUASAR_PUBLIC_ORIGIN: "https://preview.example" }).publicOrigin).toBe("https://preview.example");
  expect(() => networkPolicy({ QUASAR_ALLOWED_ORIGINS: "https://*.example" })).toThrow();
});
test("launch tickets are one-use, origin/site bound, expiring; sessions expire and revoke", () => {
  let now = 1;
  const sessions = new PreviewSessions(() => now, 1000);
  const ticket = sessions.issue("a", "https://client.example");
  expect(sessions.redeem(ticket, "b", "https://client.example")).toBeNull();
  expect(sessions.redeem(ticket, "a", "https://client.example")).toBeNull();
  const token = sessions.redeem(sessions.issue("a", "https://client.example"), "a", "https://client.example")!;
  expect(sessions.valid(token, "a")).toBe(true);
  expect(sessions.valid(token, "b")).toBe(false);
  now += 1001;
  expect(sessions.valid(token, "a")).toBe(false);
  const expired = sessions.issue("a", "x"); now += 30001;
  expect(sessions.redeem(expired, "a", "x")).toBeNull();
  const revocable = sessions.redeem(sessions.issue("a", "x"), "a", "x")!;
  sessions.revoke("a"); expect(sessions.valid(revocable, "a")).toBe(false);
  const pending = sessions.issue("b", "x"); sessions.revoke(); expect(sessions.redeem(pending, "b", "x")).toBeNull();
});
test("preview environment carries only selected OS variables and its own transport credential", () => {
  process.env.QUASAR_TEST_PROVIDER_SECRET = "private";
  const env = childEnvironment("child", "site-a", 4710);
  expect(env.QUASAR_TEST_PROVIDER_SECRET).toBeUndefined();
  expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  expect(env.QUASAR_PAIRING_TOKEN).toBeUndefined();
  expect(env.QUASAR_CHILD_SECRET).toBe("child");
  delete process.env.QUASAR_TEST_PROVIDER_SECRET;
});

test("preview origins isolate sites and remote previews require explicit HTTPS DNS configuration", async () => {
  const { previewOrigin } = await import("./security");
  expect(previewOrigin("http://127.0.0.1:4700", "site-a")).toBe("http://site-a.localhost:4700");
  expect(previewOrigin("http://localhost:4700", "site-b")).toBe("http://site-b.localhost:4700");
  expect(() => previewOrigin("https://service.example", "site-a")).toThrow("QUASAR_PREVIEW_DOMAIN");
  expect(() => previewOrigin("http://service.example", "site-a", "preview.example")).toThrow();
  for (const domain of ["*.example", "../bad", "localhost", "evil.localhost", "127.0.0.1"]) expect(() => previewOrigin("https://service.example", "site-a", domain)).toThrow();
  expect(previewOrigin("https://service.example", "site-a", "preview.example")).toBe("https://site-a.preview.example");
  expect(() => previewOrigin("http://localhost:4700", "../escape")).toThrow();
  expect(() => networkPolicy({ QUASAR_HOST: "0.0.0.0", QUASAR_ALLOW_NETWORK: "true", QUASAR_PUBLIC_ORIGIN: "http://service.example" })).toThrow("HTTPS");
});
