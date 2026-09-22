// Ported from mlai `apps/mlai/tests/app.test.tsx` at b6f3686 (bun:test -> vitest):
// the "sidecar health" and "Quasar screens ... by URL" cases. The happy-dom
// render of the settings screen is not ported: happy-dom is not installed here.
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  beginColdLoad,
  createSite,
  editSite,
  getBaseUrl,
  getEvents,
  hydrateOrigin,
  listSites,
  previewHref,
  previewStart,
  previewStop,
  setBaseUrl,
  setFallbackOrigin,
  storedOrigin,
} from "./api";
import { DEFAULT_ORIGIN } from "./index";
import { probeSidecar } from "./sidecars";

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Children of this test process. pgrep exits 1 when there are none. */
function childCount() {
  try {
    const out = execFileSync("pgrep", ["-P", String(process.pid)], { encoding: "utf8" }).trim();
    return out ? out.split("\n").length : 0;
  } catch (error) {
    if ((error as { status?: number }).status === 1) return 0;
    throw error;
  }
}

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("listener has no port");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(() => {
  setFallbackOrigin(async () => null);
});

describe("quasar api", () => {
  test("sidecar health follows the URL and does not spawn a child process", async () => {
    const before = childCount();
    expect(await probeSidecar("http://127.0.0.1:9/health")).toBe("unavailable");
    const server = createServer((_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    const origin = await listen(server);
    try {
      expect(await probeSidecar(`${origin}/health`)).toBe("available");
    } finally {
      server.close();
    }
    expect(childCount()).toBe(before);
  });

  test("list, create, feed, preview, and edit by URL, and a cold load keeps the stored origin", async () => {
    const seen: string[] = [];
    type Row = {
      id: string;
      name: string;
      slug: string;
      createdAt: string;
      status: "idle";
      previewPort: null;
      promptHistory: { prompt: string; at: string }[];
    };
    const sites: Row[] = [];
    const server = createServer((req, res) => {
      void (async () => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        seen.push(`${req.method} ${url.pathname}${url.search}`);
        const send = (status: number, body?: unknown) => {
          res.writeHead(
            status,
            body === undefined ? undefined : { "content-type": "application/json" },
          );
          res.end(body === undefined ? undefined : JSON.stringify(body));
        };
        if (req.method === "GET" && url.pathname === "/api/sites") return send(200, sites);
        if (req.method === "POST" && url.pathname === "/api/sites") {
          const body = JSON.parse(await readBody(req)) as { name: string; prompt: string };
          const site: Row = {
            id: "site-1",
            name: body.name,
            slug: body.name.toLowerCase(),
            createdAt: new Date().toISOString(),
            status: "idle",
            previewPort: null,
            promptHistory: [{ prompt: body.prompt, at: new Date().toISOString() }],
          };
          sites.push(site);
          return send(200, site);
        }
        if (req.method === "GET" && url.pathname === "/api/sites/site-1")
          return send(200, sites[0]);
        if (req.method === "POST" && url.pathname === "/api/sites/site-1/edit") {
          const body = JSON.parse(await readBody(req)) as { prompt: string };
          sites[0]?.promptHistory.push({ prompt: body.prompt, at: new Date().toISOString() });
          return send(200, sites[0]);
        }
        if (req.method === "GET" && url.pathname === "/api/sites/site-1/events") {
          return send(200, { events: [{ type: "text", text: "generated" }], next: 1 });
        }
        if (req.method === "GET" && url.pathname === "/api/sites/site-1/preview") {
          return send(200, { state: "stopped", port: null, url: null, logTail: [] });
        }
        if (req.method === "POST" && url.pathname === "/api/sites/site-1/preview/start") {
          return send(200, {
            state: "running",
            port: 4710,
            url: "http://127.0.0.1:4710",
            logTail: [],
          });
        }
        if (req.method === "POST" && url.pathname === "/api/sites/site-1/preview/stop") {
          return send(200, { state: "stopped", port: null, url: null, logTail: [] });
        }
        send(404, { error: "missing" });
      })().catch((err: unknown) => {
        res.writeHead(500);
        res.end(err instanceof Error ? err.message : String(err));
      });
    });
    const origin = await listen(server);
    const before = childCount();
    try {
      await setBaseUrl(origin);
      expect(await listSites()).toEqual([]);
      const created = await createSite({ name: "Harbor", prompt: "A quiet landing page" });
      expect(created.name).toBe("Harbor");
      expect(created.promptHistory[0]?.prompt).toBe("A quiet landing page");
      expect((await listSites()).map((site) => site.name)).toEqual(["Harbor"]);
      const feed = await getEvents(created.id, 0);
      expect(feed.events).toEqual([{ type: "text", text: "generated" }]);
      const started = await previewStart(created.id);
      expect(started.state).toBe("running");
      const edited = await editSite(created.id, "Add a colophon");
      expect(edited.promptHistory.map((entry) => entry.prompt)).toContain("Add a colophon");
      const stopped = await previewStop(created.id);
      expect(stopped.state).toBe("stopped");
      await expect(setBaseUrl("http://127.0.0.1:9").then(() => listSites())).rejects.toThrow();
      expect(seen.some((line) => line.startsWith("POST /api/sites"))).toBe(true);
      expect(seen.some((line) => line.includes("/preview/start"))).toBe(true);
      expect(childCount()).toBe(before);

      await setBaseUrl(origin);
      beginColdLoad();
      expect(getBaseUrl()).toBe(DEFAULT_ORIGIN);
      // A saved origin wins over the deployment fallback.
      setFallbackOrigin(async () => "http://fallback.test:4700");
      expect(await hydrateOrigin()).toBe(origin);
      expect(await storedOrigin()).toBe(origin);
    } finally {
      server.close();
    }
  });

  test("with nothing saved, the deployment fallback supplies the origin without being stored", async () => {
    vi.resetModules();
    const fresh = await import("./api");
    fresh.setFallbackOrigin(async () => "http://fallback.test:4700");
    expect(await fresh.hydrateOrigin()).toBe("http://fallback.test:4700");
    expect(await fresh.storedOrigin()).toBeNull();
    vi.resetModules();
    const failing = await import("./api");
    failing.setFallbackOrigin(async () => {
      throw new Error("server fn unreachable");
    });
    expect(await failing.hydrateOrigin()).toBe(DEFAULT_ORIGIN);
  });

  test("previewHref points localhost previews at a remote service host and rejects non-HTTP", () => {
    expect(previewHref(null, DEFAULT_ORIGIN)).toBeNull();
    expect(previewHref("http://localhost:4710", DEFAULT_ORIGIN)).toBe("http://localhost:4710/");
    expect(previewHref("http://localhost:4710", "http://192.168.1.20:4700")).toBe(
      "http://192.168.1.20:4710/",
    );
    expect(previewHref("javascript:alert(1)", DEFAULT_ORIGIN)).toBeNull();
    expect(previewHref("not a url", DEFAULT_ORIGIN)).toBeNull();
  });
});
