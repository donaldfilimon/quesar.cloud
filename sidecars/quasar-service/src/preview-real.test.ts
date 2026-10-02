import { test, expect } from "bun:test";
import { mkdtemp, cp, symlink, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PreviewManager } from "./preview";
import { createServer } from "./server";
import { writeRegistry } from "./registry";
import { request } from "node:http";

const template = fileURLToPath(new URL("../templates/next-site", import.meta.url));
function handshake(url: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { connection: "Upgrade", upgrade: "websocket", "sec-websocket-version": "13", "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==", ...headers } });
    req.on("response", res => { resolve(res.statusCode!); res.resume(); });
    req.on("upgrade", (res, socket) => { resolve(res.statusCode!); socket.destroy(); });
    req.on("error", reject); req.setTimeout(15000, () => req.destroy(new Error("upgrade timeout"))); req.end();
  });
}

test.skipIf(!existsSync(path.join(template, "node_modules/next")))("real installed Next: raw HTTP and HMR are protected before and after authenticated rendering; proxy serves HTML/assets/HMR and revokes sessions", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "quasar-real-"));
  const siteDir = path.join(home, "sites", "real");
  await cp(template, siteDir, { recursive: true, filter: source => !["node_modules", ".next"].some(segment => source.split(path.sep).includes(segment)) });
  await symlink(path.join(template, "node_modules"), path.join(siteDir, "node_modules"), "dir");
  await writeRegistry(path.join(home, "registry.json"), [{ id: "real", name: "Real", slug: "real", createdAt: new Date().toISOString(), status: "idle", previewPort: null, promptHistory: [] }]);
  const preview = new PreviewManager();
  const token = "r".repeat(43);
  const origin = "http://localhost:8080";
  const server = createServer({ home, templateDir: template, preview, port: 0, pairingToken: token, engine: async () => {}, makeClient: () => ({} as never), scaffoldInstall: false });
  const base = `http://127.0.0.1:${server.port}`;
  const previewOrigin = `http://real.localhost:${server.port}`;
  const previewHost = new URL(previewOrigin).host;
  const proxyFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), host: previewHost } });
  const api = (endpoint: string) => fetch(base + endpoint, { method: "POST", headers: { authorization: `Bearer ${token}`, origin } });
  try {
    const started = await (await api("/api/sites/real/preview/start")).json();
    expect(started.state, JSON.stringify(started.logTail)).toBe("running");
    expect(started.url).toBe(`${previewOrigin}/preview/real/`);
    const child = `http://127.0.0.1:${started.port}`;
    expect((await fetch(child + "/preview/real/")).status).toBe(401);
    expect(await handshake(child + "/preview/real/_next/hmr")).toBe(401);
    const launch = await (await api("/api/sites/real/preview/ticket")).json();
    const session = await proxyFetch(base + new URL(launch.action).pathname, { method: "POST", redirect: "manual", headers: { origin, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket: launch.ticket }) });
    expect(session.status).toBe(303);
    const cookie = session.headers.get("set-cookie")!.split(";")[0]!;
    const rendered = await proxyFetch(base + "/preview/real/", { headers: { cookie } });
    const html = await rendered.text();
    expect(rendered.status, html.slice(0, 1000) + JSON.stringify(preview.status("real").logTail)).toBe(200);
    const asset = html.match(/(?:src|href)="(\/preview\/real\/_next\/static\/[^\"]+)"/)?.[1]?.replaceAll("&amp;", "&");
    expect(asset).toBeDefined();
    expect((await proxyFetch(base + asset, { headers: { cookie } })).status).toBe(200);
    expect((await proxyFetch(base + asset)).status).toBe(401);
    expect(await handshake(base + "/preview/real/_next/hmr", { cookie, origin: previewOrigin, host: previewHost }), JSON.stringify(preview.status("real").logTail)).toBe(101);
    expect(await handshake(base + "/preview/real/_next/hmr", { cookie, origin: "https://hostile.example", host: previewHost })).toBe(403);
    expect(await handshake(base + "/preview/real/_next/hmr", { origin: previewOrigin, host: previewHost })).toBe(401);
    expect((await fetch(child + "/preview/real/")).status).toBe(401);
    expect(await handshake(child + "/preview/real/_next/hmr")).toBe(401);
    await api("/api/unpair");
    expect((await proxyFetch(base + "/preview/real/", { headers: { cookie } })).status).toBe(401);
    expect(await handshake(base + "/preview/real/_next/hmr", { cookie, origin: previewOrigin, host: previewHost })).toBe(401);
  } finally { await preview.stopAll(); server.stop(true); await rm(home, { recursive: true, force: true }); }
}, 180_000);
