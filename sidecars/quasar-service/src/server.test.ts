import { createServer as createNetServer, type AddressInfo } from "node:net";
import { test, expect, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { GenerationEvent } from "../shared/index";
import { createServer, type ServerDeps } from "./server";
import { PreviewManager } from "./preview";
import { PreviewProxy } from "./preview-proxy";

// OS-selected loopback fixture port; no fixed 4710 collision with another review.
async function testPreviewPort(): Promise<number> {
  const listener = createNetServer();
  await new Promise<void>((resolve, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolve); });
  const port = (listener.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type EngineFn = ServerDeps["engine"];

function stubEngine(events: GenerationEvent[], delayMs: number): EngineFn {
  return async ({ onEvent }) => {
    await sleep(delayMs);
    for (const ev of events) onEvent(ev);
  };
}

const previewCommand = (_siteDir: string, port: number): string[] => [
  "bun",
  "-e",
  `Bun.serve({ port: ${port}, fetch: () => new Response("ok") }); setInterval(() => {}, 1e9);`,
];

interface Harness {
  home: string;
  templateDir: string;
  baseUrl: string;
  server: ReturnType<typeof createServer>;
  preview: PreviewManager;
}

const harnesses: Harness[] = [];
const TOKEN = "t".repeat(43);
const TRUSTED = "http://localhost:8080";
const pairedFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, headers: { authorization: `Bearer ${TOKEN}`, origin: TRUSTED, ...init.headers } });

async function makeHarness(
  engine: EngineFn,
  opts?: { templateDir?: string; makeClient?: ServerDeps["makeClient"]; preview?: PreviewManager; jobTimeoutMs?: number }
): Promise<Harness> {
  const home = await realpath(await mkdtemp(path.join(tmpdir(), "quasar-home-")));
  let templateDir = opts?.templateDir;
  if (templateDir === undefined) {
    templateDir = await realpath(await mkdtemp(path.join(tmpdir(), "quasar-template-")));
    await writeFile(path.join(templateDir, "marker.txt"), "template-marker");
  }

  const preview = opts?.preview ?? new PreviewManager({ command: previewCommand });
  const server = createServer({
    home,
    templateDir,
    engine,
    makeClient: opts?.makeClient ?? (() => ({} as never)),
    preview,
    scaffoldInstall: false,
    port: 0,
    pairingToken: TOKEN,
    jobTimeoutMs: opts?.jobTimeoutMs,
    allocatePreviewPort: testPreviewPort,
  });

  const harness: Harness = { home, templateDir, baseUrl: `http://localhost:${server.port}`, server, preview };
  harnesses.push(harness);
  return harness;
}

afterEach(async () => {
  while (harnesses.length > 0) {
    const h = harnesses.pop()!;
    await h.preview.stopAll();
    await h.server.shutdown();
  }
  // give any straggling background job timers a moment to settle before the
  // temp dirs they touch get reaped by the OS at process exit.
  await sleep(50);
});

async function pollUntilIdle(baseUrl: string, id: string, timeoutMs = 3000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await pairedFetch(`${baseUrl}/api/sites/${id}`);
    const body = await res.json();
    if (body.status !== "generating") return body;
    await sleep(20);
  }
  throw new Error("timed out waiting for idle status");
}

test("POST /api/sites scaffolds the site, runs the job to idle, and replays events", async () => {
  const { baseUrl, home } = await makeHarness(
    stubEngine([{ type: "text", text: "hi" }, { type: "done" }], 10)
  );

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "My Site", prompt: "p" }),
  });
  expect(createRes.status).toBe(202);
  const site = await createRes.json();
  expect(site.slug).toBe("my-site");
  expect(site.status).toBe("generating");

  const markerPath = path.join(home, "sites", "my-site", "marker.txt");
  const idleSite = await pollUntilIdle(baseUrl, site.id);
  const marker = await readFile(markerPath, "utf8");
  expect(marker).toBe("template-marker");

  expect(idleSite.status).toBe("idle");

  const eventsRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/events?since=0`);
  expect(eventsRes.status).toBe(200);
  const eventsBody = await eventsRes.json();
  expect(eventsBody).toMatchObject({
    events: [{ type: "text", text: "hi" }, { type: "done" }],
    next: 2,
  });

  const emptyRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/events?since=2&epoch=${eventsBody.epoch}`);
  const emptyBody = await emptyRes.json();
  expect(emptyBody).toMatchObject({ events: [], next: 2 });
});

test("cancel is job-bound, authenticated, origin-restricted and fences late completion", async () => {
  let late!: () => void;
  const { baseUrl } = await makeHarness(async ({ onEvent }) => {
    await new Promise<void>(resolve => { late = resolve; });
    onEvent({ type: "done" });
    onEvent({ type: "text", text: "stale" });
  });
  const site = await (await pairedFetch(`${baseUrl}/api/sites`, { method: "POST", body: JSON.stringify({ name: "Cancel", prompt: "p" }) })).json();
  while (!late) await sleep(5);
  const url = `${baseUrl}/api/sites/${site.id}/cancel`;
  expect((await fetch(url, { method: "POST", body: JSON.stringify({ jobId: site.job.id }) })).status).toBe(401);
  expect((await pairedFetch(url, { method: "POST", headers: { origin: "https://evil.example" } })).status).toBe(403);
  expect((await pairedFetch(url, { method: "GET" })).status).toBe(405);
  expect((await pairedFetch(url, { method: "POST", body: JSON.stringify({ jobId: "stale" }) })).status).toBe(409);
  expect((await pairedFetch(url, { method: "POST", body: JSON.stringify({ jobId: site.job.id }) })).status).toBe(202);
  const settled = await pollUntilIdle(baseUrl, site.id);
  expect(settled.job.outcome).toBe("cancelled");
  late();
  await sleep(20);
  const feed = await (await pairedFetch(`${baseUrl}/api/sites/${site.id}/events`)).json();
  expect(feed.events).toHaveLength(1);
  expect(feed.events[0].type).toBe("error");
  expect((await pairedFetch(url, { method: "POST", body: JSON.stringify({ jobId: site.job.id }) })).status).toBe(202);
});

test("whole-job deadline settles an abort-ignoring engine and ignores its late success", async () => {
  let late!: () => void;
  const { baseUrl } = await makeHarness(async ({ onEvent }) => {
    await new Promise<void>(resolve => { late = resolve; });
    onEvent({ type: "done" });
  }, { jobTimeoutMs: 100 });
  const site = await (await pairedFetch(`${baseUrl}/api/sites`, { method: "POST", body: JSON.stringify({ name: "Deadline", prompt: "p" }) })).json();
  const settled = await pollUntilIdle(baseUrl, site.id);
  expect(settled.job.outcome).toBe("error");
  expect(settled.lastError).toContain("deadline");
  late?.();
  await sleep(10);
  expect((await (await pairedFetch(`${baseUrl}/api/sites/${site.id}/events`)).json()).events).toHaveLength(1);
});

test("startup recovers a persisted generating row without rerunning provider", async () => {
  const h = await makeHarness(stubEngine([{ type: "done" }], 1));
  await h.server.shutdown();
  const site = { id: "restart", name: "Restart", slug: "restart", createdAt: new Date().toISOString(), status: "generating", previewPort: 4710, promptHistory: [{ prompt: "keep", at: "then" }] };
  await writeFile(path.join(h.home, "registry.json"), JSON.stringify([site]));
  let called = false;
  const server = createServer({ home: h.home, templateDir: h.templateDir, engine: async () => { called = true; }, makeClient: () => ({} as never), preview: h.preview, scaffoldInstall: false, port: 0, pairingToken: TOKEN });
  try {
    const recovered = await (await pairedFetch(`http://localhost:${server.port}/api/sites/restart`)).json();
    expect(recovered.job.outcome).toBe("interrupted");
    expect(recovered.status).toBe("error");
    expect(recovered.previewPort).toBeNull();
    expect(recovered.promptHistory).toEqual(site.promptHistory);
    expect(called).toBe(false);
  } finally { await server.shutdown(); }
});

test("an error event sets status 'error' and records lastError; a later success clears it", async () => {
  let events: GenerationEvent[] = [{ type: "error", message: "boom" }];
  const engine: EngineFn = async ({ onEvent }) => {
    await sleep(10);
    for (const ev of events) onEvent(ev);
  };
  const { baseUrl } = await makeHarness(engine);

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Boom Site", prompt: "p" }),
  });
  const site = await createRes.json();

  const failed = await pollUntilIdle(baseUrl, site.id);
  expect(failed.status).toBe("error");
  expect(failed.lastError).toBe("boom");

  events = [{ type: "done" }];
  const editRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "retry" }),
  });
  expect(editRes.status).toBe(202);

  const recovered = await pollUntilIdle(baseUrl, site.id);
  expect(recovered.status).toBe("idle");
  expect(recovered.lastError).toBeUndefined();
});

test("a throwing makeClient() still drives the site to a terminal 'error' state, not a permanent wedge", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 10), {
    makeClient: () => {
      throw new Error("no resolvable credentials");
    },
  });

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "No Creds Site", prompt: "p" }),
  });
  // The create request itself succeeds optimistically (the failure happens
  // in the fire-and-forget job, same as any other engine-reported error) —
  // 202 with status "generating", then the job settles to "error".
  expect(createRes.status).toBe(202);
  const site = await createRes.json();
  expect(site.status).toBe("generating");

  const settled = await pollUntilIdle(baseUrl, site.id);
  expect(settled.status).toBe("error");
  expect(settled.lastError).toBe("Generation failed. Partial files may remain; inspect before retrying.");

  // The site must not be wedged: a subsequent edit is accepted (not a
  // permanent 409), proving status genuinely reached a terminal state.
  const editRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "retry" }),
  });
  expect(editRes.status).toBe(202);
});

test("an engine promise rejection (instead of an onEvent error) still reaches a terminal 'error' state", async () => {
  const rejectingEngine: EngineFn = async () => {
    await sleep(10);
    throw new Error("engine crashed before emitting anything");
  };
  const { baseUrl } = await makeHarness(rejectingEngine);

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Rejects Site", prompt: "p" }),
  });
  expect(createRes.status).toBe(202);
  const site = await createRes.json();

  const settled = await pollUntilIdle(baseUrl, site.id);
  expect(settled.status).toBe("error");
  expect(settled.lastError).toBe("Generation failed. Partial files may remain; inspect before retrying.");

  const editRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "retry" }),
  });
  expect(editRes.status).toBe(202);
});

test("POST edit while a job is running returns 409, and edit updates promptHistory", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 200));

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Slow Site", prompt: "p1" }),
  });
  const site = await createRes.json();
  await pollUntilIdle(baseUrl, site.id);

  const edit1 = await pairedFetch(`${baseUrl}/api/sites/${site.id}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "p2" }),
  });
  expect(edit1.status).toBe(202);
  const edited = await edit1.json();
  expect(edited.status).toBe("generating");
  expect(edited.promptHistory).toEqual([
    { prompt: "p1", at: edited.promptHistory[0].at },
    { prompt: "p2", at: edited.promptHistory[1].at },
  ]);

  const edit2 = await pairedFetch(`${baseUrl}/api/sites/${site.id}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "p3" }),
  });
  expect(edit2.status).toBe(409);
  const edit2Body = await edit2.json();
  expect(edit2Body).toEqual({ error: "job running" });

  await pollUntilIdle(baseUrl, site.id);
});

test("preview start reports running and preview stop reports stopped", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Preview Site", prompt: "p" }),
  });
  const site = await createRes.json();
  await pollUntilIdle(baseUrl, site.id);

  const startRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/start`, { method: "POST" });
  expect(startRes.status).toBe(200);
  const startBody = await startRes.json();
  expect(startBody.state).toBe("running");
  expect(typeof startBody.port).toBe("number");

  const stopRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/stop`, { method: "POST" });
  expect(stopRes.status).toBe(200);
  const stopBody = await stopRes.json();
  expect(stopBody.state).toBe("stopped");
}, 15000);

test("delete drains an admitted preview start before removing its site", async () => {
  const preview = new PreviewManager({ command: previewCommand });
  const startPreview = preview.start.bind(preview);
  let admit!: () => void;
  let resume!: () => void;
  const admitted = new Promise<void>((resolve) => { admit = resolve; });
  const held = new Promise<void>((resolve) => { resume = resolve; });
  preview.start = async (...args) => { admit(); await held; return startPreview(...args); };
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5), { preview });
  const created = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Preview Delete", prompt: "p" }),
  });
  const site = await created.json();
  await pollUntilIdle(baseUrl, site.id);

  const starting = pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/start`, { method: "POST" });
  await admitted;
  const deleting = pairedFetch(`${baseUrl}/api/sites/${site.id}`, { method: "DELETE" });
  await sleep(30);
  resume();
  await starting;
  expect((await deleting).status).toBe(204);
  expect(preview.status(site.id).state).toBe("stopped");
}, 15000);

test("DELETE removes the site: 204, then GET is 404", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Delete Me", prompt: "p" }),
  });
  const site = await createRes.json();
  await pollUntilIdle(baseUrl, site.id);

  const deleteRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}`, { method: "DELETE" });
  expect(deleteRes.status).toBe(204);

  const getRes = await pairedFetch(`${baseUrl}/api/sites/${site.id}`);
  expect(getRes.status).toBe(404);
  const getBody = await getRes.json();
  expect(getBody).toEqual({ error: "not found" });
});

test("POST /api/sites with an invalid body returns 400", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const res = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "", prompt: "" }),
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.fieldErrors).toBeDefined();
});

test("GET on an unknown site id returns 404", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));
  const res = await pairedFetch(`${baseUrl}/api/sites/does-not-exist`);
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toEqual({ error: "not found" });
});

test("OPTIONS returns 204 with CORS headers, and GET responses carry Access-Control-Allow-Origin", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const optionsRes = await pairedFetch(`${baseUrl}/api/sites`, { method: "OPTIONS", headers: { "access-control-request-method": "GET" } });
  expect(optionsRes.status).toBe(204);
  expect(optionsRes.headers.get("Access-Control-Allow-Origin")).toBe(TRUSTED);
  expect(optionsRes.headers.get("Access-Control-Allow-Methods")).toBe("GET,POST,DELETE");
  expect(optionsRes.headers.get("Access-Control-Allow-Headers")).toBe("authorization,content-type");

  const getRes = await pairedFetch(`${baseUrl}/api/sites`);
  expect(getRes.headers.get("Access-Control-Allow-Origin")).toBe(TRUSTED);

  const notFoundRes = await pairedFetch(`${baseUrl}/api/sites/nope`);
  expect(notFoundRes.headers.get("Access-Control-Allow-Origin")).toBe(TRUSTED);
});

test("GET /api/sites lists all sites in the registry", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const listBefore = await (await pairedFetch(`${baseUrl}/api/sites`)).json();
  expect(listBefore).toEqual([]);

  const createRes = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Listed Site", prompt: "p" }),
  });
  const site = await createRes.json();

  const listAfter = await (await pairedFetch(`${baseUrl}/api/sites`)).json();
  expect(listAfter).toHaveLength(1);
  expect(listAfter[0].id).toBe(site.id);

  await pollUntilIdle(baseUrl, site.id);
});

test("slug collisions append -2, -3, ...", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const post = () =>
    pairedFetch(`${baseUrl}/api/sites`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Same Name", prompt: "p" }),
    });

  const first = await (await post()).json();
  const second = await (await post()).json();
  const third = await (await post()).json();

  expect(first.slug).toBe("same-name");
  expect(second.slug).toBe("same-name-2");
  expect(third.slug).toBe("same-name-3");

  await Promise.all([
    pollUntilIdle(baseUrl, first.id),
    pollUntilIdle(baseUrl, second.id),
    pollUntilIdle(baseUrl, third.id),
  ]);
});

test("POST /api/sites when scaffolding fails returns 500 and leaves no orphaned registry entry or site dir", async () => {
  const missingTemplateDir = path.join(tmpdir(), `quasar-template-missing-${Date.now()}`);
  const { baseUrl, home } = await makeHarness(stubEngine([{ type: "done" }], 5), {
    templateDir: missingTemplateDir,
  });

  const res = await pairedFetch(`${baseUrl}/api/sites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Broken Site", prompt: "p" }),
  });
  expect(res.status).toBe(202);
  const body = await res.json();
  const settled = await pollUntilIdle(baseUrl, body.id);
  expect(settled.status).toBe("error");
  expect(settled.job.outcome).toBe("error");

  const list = await (await pairedFetch(`${baseUrl}/api/sites`)).json();
  expect(list).toHaveLength(1);

  await expect(
    readFile(path.join(home, "sites", "broken-site", "marker.txt"), "utf8")
  ).rejects.toThrow();
});

test("concurrent creates with the same name do not lose any site to a stale registry write", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 5));

  const post = () =>
    pairedFetch(`${baseUrl}/api/sites`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Same Name", prompt: "p" }),
    });

  const [r1, r2, r3] = await Promise.all([post(), post(), post()]);
  const [s1, s2, s3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

  const ids = new Set([s1.id, s2.id, s3.id]);
  expect(ids.size).toBe(3);

  const slugs = new Set([s1.slug, s2.slug, s3.slug]);
  expect(slugs.size).toBe(3);

  await Promise.all([
    pollUntilIdle(baseUrl, s1.id),
    pollUntilIdle(baseUrl, s2.id),
    pollUntilIdle(baseUrl, s3.id),
  ]);

  const list = await (await pairedFetch(`${baseUrl}/api/sites`)).json();
  expect(list).toHaveLength(3);
  const listIds = new Set(list.map((s: { id: string }) => s.id));
  expect(listIds).toEqual(ids);
});

test("all API operation classes reject absent/wrong tokens and hostile origins or hosts", async () => {
  const { baseUrl } = await makeHarness(stubEngine([], 0));
  const operations = [["GET", "/api/sites"], ["POST", "/api/sites"], ["GET", "/api/sites/id"], ["DELETE", "/api/sites/id"], ["POST", "/api/sites/id/edit"], ["GET", "/api/sites/id/events"], ["GET", "/api/sites/id/preview"], ["POST", "/api/sites/id/preview/start"], ["POST", "/api/sites/id/preview/stop"], ["POST", "/api/sites/id/preview/ticket"], ["POST", "/api/unpair"]];
  for (const [method, endpoint] of operations) {
    for (const authorization of ["", "Bearer incorrect"]) expect((await fetch(baseUrl + endpoint, { method, headers: { authorization } })).status).toBe(401);
    expect((await pairedFetch(baseUrl + endpoint, { method, headers: { origin: "https://hostile.example" } })).status).toBe(403);
  }
  expect((await pairedFetch(baseUrl + "/api/sites", { headers: { host: "rebind.example" } })).status).toBe(403);
  expect(await (await fetch(baseUrl + "/health")).json()).toEqual({ status: "ok" });
  for (const endpoint of ["start", "stop"]) expect((await pairedFetch(baseUrl + `/api/sites/id/preview/${endpoint}`)).status).toBe(405);
  for (const headers of [{ origin: "null", "access-control-request-method": "GET", "access-control-request-headers": "" }, { origin: TRUSTED, "access-control-request-method": "PUT", "access-control-request-headers": "" }, { origin: TRUSTED, "access-control-request-method": "POST", "access-control-request-headers": "x-evil" }]) expect((await fetch(baseUrl + "/api/sites", { method: "OPTIONS", headers })).status).toBe(403);
});

test("preview launch requires one-use POST ticket; content/assets require site cookie and unpair revokes it", async () => {
  const { baseUrl } = await makeHarness(stubEngine([{ type: "done" }], 1));
  const site = await (await pairedFetch(baseUrl + "/api/sites", { method: "POST", body: JSON.stringify({ name: "Private", prompt: "p" }) })).json();
  await pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/start`, { method: "POST" });
  const prefix = `/preview/${site.id}`;
  const previewHost = `${site.id}.localhost:${new URL(baseUrl).port}`;
  const previewFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), host: previewHost } });
  expect((await fetch(baseUrl + prefix + "/")).status).toBe(403);
  expect((await previewFetch(baseUrl + prefix + "/")).status).toBe(401);
  const launch = await (await pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/ticket`, { method: "POST" })).json();
  const redeem = () => previewFetch(baseUrl + new URL(launch.action).pathname, { method: "POST", redirect: "manual", headers: { origin: TRUSTED, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket: launch.ticket }) });
  expect((await previewFetch(baseUrl + new URL(launch.action).pathname)).status).toBe(405);
  const response = await redeem();
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(prefix + "/");
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=Lax"); expect(cookie).toContain(`Path=${prefix};`);
  expect((await redeem()).status).toBe(401);
  for (const route of ["/", "/_next/static/test.js"]) expect((await previewFetch(baseUrl + prefix + route, { headers: { cookie } })).status).toBe(200);
  expect((await previewFetch(baseUrl + prefix + "/", { headers: { cookie, origin: "https://evil.example" } })).status).toBe(403);
  await pairedFetch(baseUrl + "/api/unpair", { method: "POST" });
  expect((await previewFetch(baseUrl + prefix + "/", { headers: { cookie } })).status).toBe(401);
});

class PausedStopPreview extends PreviewManager {
  private pause?: { reached: () => void; wait: Promise<void> };
  pauseNextStop() {
    let release!: () => void;
    let reached!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    const atStop = new Promise<void>(resolve => { reached = resolve; });
    this.pause = { reached, wait };
    return { release, atStop };
  }
  override async stop(id: string) {
    const pause = this.pause;
    this.pause = undefined;
    if (pause) { pause.reached(); await pause.wait; }
    await super.stop(id);
  }
}

for (const operation of ["start", "stop"] as const) test(`${operation} fences ticket issuance/redemption before an awaited teardown and old sessions cannot read a replacement`, async () => {
  const preview = new PausedStopPreview({ command: previewCommand });
  const { baseUrl, home } = await makeHarness(stubEngine([{ type: "done" }], 1), { preview });
  const site = await (await pairedFetch(baseUrl + "/api/sites", { method: "POST", body: JSON.stringify({ name: "Epoch", prompt: "p" }) })).json();
  const api = (action: string) => pairedFetch(`${baseUrl}/api/sites/${site.id}/preview/${action}`, { method: "POST" });
  expect((await (await api("start")).json()).state).toBe("running");
  const host = `${site.id}.localhost:${new URL(baseUrl).port}`;
  const get = (cookie: string) => fetch(`${baseUrl}/preview/${site.id}/`, { headers: { host, cookie } });
  const ticket = async () => (await (await api("ticket")).json()).ticket as string;
  const redeem = (value: string) => fetch(`${baseUrl}/preview/${site.id}/launch`, { method: "POST", redirect: "manual", headers: { host, origin: TRUSTED, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket: value }) });
  const oldCookie = (await redeem(await ticket())).headers.get("set-cookie")!.split(";")[0]!;
  const pendingTicket = await ticket();
  expect((await get(oldCookie)).status).toBe(200);
  const gate = preview.pauseNextStop();
  const lifecycle = api(operation);
  try {
    await gate.atStop;
    expect(preview.transport(site.id)).toBeNull();
    expect((await api("ticket")).status).toBe(409);
    expect((await redeem(pendingTicket)).status).toBe(410);
    expect((await get(oldCookie)).status).toBe(410);
  } finally { gate.release(); }
  await lifecycle;
  if (operation === "stop") await api("start");
  expect((await get(oldCookie)).status).toBe(401);
  expect((await redeem(pendingTicket)).status).toBe(401);

  // A direct manager restart does not call the server's revoke helper. The
  // instance binding itself must still reject both old tickets and sessions.
  const previousTicket = await ticket();
  const previousCookie = (await redeem(await ticket())).headers.get("set-cookie")!.split(";")[0]!;
  const generation = preview.transport(site.id)!.generation;
  await preview.start(site.id, path.join(home, "sites", site.slug), await testPreviewPort());
  expect(preview.transport(site.id)!.generation).not.toBe(generation);
  expect((await get(previousCookie)).status).toBe(401);
  expect((await redeem(previousTicket)).status).toBe(401);
  const freshCookie = (await redeem(await ticket())).headers.get("set-cookie")!.split(";")[0]!;
  expect((await get(freshCookie)).status).toBe(200);
}, 20_000);


test("a launch body delayed across child replacement cannot redeem its old generation ticket", async () => {
  const { preview, home, server, baseUrl } = await makeHarness(stubEngine([], 0));
  await preview.start("delayed", home, await testPreviewPort());
  const proxy = new PreviewProxy(preview);
  const generation = preview.transport("delayed")!.generation;
  const ticket = proxy.sessions.issue("delayed", TRUSTED, generation);
  let body!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { body = controller; } });
  const request = new Request(`${baseUrl}/preview/delayed/launch`, { method: "POST", headers: { origin: TRUSTED, "content-type": "application/x-www-form-urlencoded" }, body: stream });
  // handle reads the running generation synchronously, then waits on req.text().
  const response = proxy.handle(request, server, `http://delayed.localhost:${server.port}`, new Set([TRUSTED]));
  await preview.start("delayed", home, await testPreviewPort());
  expect(preview.transport("delayed")!.generation).not.toBe(generation);
  body.enqueue(new TextEncoder().encode(new URLSearchParams({ ticket }).toString()));
  body.close();
  const rejected = await response;
  expect(rejected?.status).toBe(401);
  expect(rejected?.headers.get("set-cookie")).toBeNull();
}, 10_000);
