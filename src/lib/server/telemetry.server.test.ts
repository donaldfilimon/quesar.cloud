import { afterEach, describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { normalizeTelemetryPath, routePatternsFromFiles } from "./telemetry-path";
import { appRoutePatterns, routeFiles } from "./telemetry-routes.server";
import { handleTelemetry } from "./telemetry.server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A fixture mirroring this app's route naming, so the mlai cases stay meaningful. */
const fixture = routePatternsFromFiles([
  "/src/routes/__root.tsx",
  "/src/routes/index.tsx",
  "/src/routes/about.tsx",
  "/src/routes/console.tsx",
  "/src/routes/console.workspace.tsx",
  "/src/routes/showcase.film.tsx",
  "/src/routes/blog.$slug.tsx",
  "/src/routes/research.$slug.tsx",
  "/src/routes/research.implementations.$slug.tsx",
  "/src/routes/team.$slug.tsx",
  "/src/routes/products.$slug.tsx",
  "/src/routes/api/auth/$.ts",
  "/src/routes/_layout.settings.tsx",
  "/src/routes/(marketing)/pricing.tsx",
  "/src/routes/quasar/index.tsx",
  "/src/routes/quasar/sites.$id.tsx",
  "/src/routes/-components/card.tsx",
  "/src/routes/files.$.tsx",
]);
const norm = (value: unknown) => normalizeTelemetryPath(value, fixture);

describe("routePatternsFromFiles: TanStack file-route conventions", () => {
  it("maps flat, directory, index, pathless and group names to paths", () => {
    expect([...fixture.staticPaths].sort()).toEqual(
      [
        "/",
        "/about",
        "/console",
        "/console/workspace",
        "/pricing",
        "/quasar",
        "/settings",
        "/showcase/film",
      ].sort(),
    );
  });

  it("skips __root, api routes, ignored files and splats", () => {
    expect(norm("/__root")).toBe("");
    expect(norm("/api/auth/anything")).toBe("");
    expect(norm("/components/card")).toBe("");
    expect(norm("/files/anything")).toBe("");
  });

  it("turns $param segments into single-slug matchers", () => {
    expect(norm("/research/implementations/abi-core")).toBe("/research/implementations/abi-core");
    expect(norm("/quasar/sites/site-42")).toBe("/quasar/sites/site-42");
  });
});

describe("normalizeTelemetryPath: keeps the telemetry table identifier-free (ported from mlai)", () => {
  it("passes a known static route through unchanged", () => {
    expect(norm("/")).toBe("/");
    expect(norm("/about")).toBe("/about");
    expect(norm("/showcase/film")).toBe("/showcase/film");
    expect(norm("/console")).toBe("/console");
  });

  it("passes each dynamic-slug family through", () => {
    expect(norm("/blog/wdbx-v2-release")).toBe("/blog/wdbx-v2-release");
    expect(norm("/research/neural-backtracking")).toBe("/research/neural-backtracking");
    expect(norm("/team/donald-filimon")).toBe("/team/donald-filimon");
    expect(norm("/products/abi")).toBe("/products/abi");
    expect(norm("/blog/zig-016-migration")).toBe("/blog/zig-016-migration");
  });

  it("drops an identifier smuggled in as a path", () => {
    expect(norm("/u/victim@example.com")).toBe("");
    expect(norm("/blog/victim@example.com")).toBe("");
    expect(norm("/team/user 12345 said something")).toBe("");
  });

  it("discards a query or fragment and keeps only the pathname it qualifies", () => {
    expect(norm("/about?utm_source=x&email=a@b.co")).toBe("/about");
    expect(norm("/about#section")).toBe("/about");
    expect(norm("/u/victim?token=abc")).toBe("");
  });

  it("drops an over-long path instead of truncating it", () => {
    expect(norm(`/blog/${"a".repeat(200)}`)).toBe("");
  });

  it("drops anything that is not a route-shaped string", () => {
    expect(norm("not-a-route")).toBe("");
    expect(norm("/nope")).toBe("");
    expect(norm("https://evil.test/about")).toBe("");
    expect(norm("")).toBe("");
    expect(norm(undefined)).toBe("");
    expect(norm(null)).toBe("");
    expect(norm(42)).toBe("");
    expect(norm({ toString: () => "/about" })).toBe("");
  });

  it("does not treat inherited Object properties as known routes", () => {
    expect(norm("constructor")).toBe("");
    expect(norm("__proto__")).toBe("");
    expect(norm("toString")).toBe("");
  });

  it("tolerates a trailing slash on an otherwise real route", () => {
    expect(norm("/about/")).toBe("/about");
    expect(norm("/blog/wdbx-v2-release/")).toBe("/blog/wdbx-v2-release");
  });

  it("rejects a deeper path under a dynamic family", () => {
    expect(norm("/blog/wdbx-v2-release/extra")).toBe("");
  });
});

describe("appRoutePatterns: the real src/routes tree", () => {
  it("globs this app's route files", () => {
    expect(routeFiles()).toContain("/src/routes/contact.tsx");
  });

  it("accepts real pages and rejects identifiers", () => {
    const real = appRoutePatterns();
    expect(normalizeTelemetryPath("/", real)).toBe("/");
    expect(normalizeTelemetryPath("/contact", real)).toBe("/contact");
    expect(normalizeTelemetryPath("/showcase/film", real)).toBe("/showcase/film");
    expect(normalizeTelemetryPath("/blog/wdbx-v2-release", real)).toBe("/blog/wdbx-v2-release");
    expect(normalizeTelemetryPath("/research/implementations/abi-core", real)).toBe(
      "/research/implementations/abi-core",
    );
    expect(normalizeTelemetryPath("/u/victim@example.com", real)).toBe("");
    expect(normalizeTelemetryPath("/api/telemetry", real)).toBe("");
  });
});

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://quesar.cloud/api/telemetry", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `192.0.2.${Math.random()}`,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function countEvents(event: string, path: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{
    n: number;
  }>`select count(*) as n from telemetry_events where event = ${event} and path = ${path}`;
  return Number(rows[0]?.n ?? 0);
}

describe("handleTelemetry", () => {
  const patterns = routePatternsFromFiles([
    "/src/routes/index.tsx",
    "/src/routes/telemetry-probe-page.tsx",
  ]);

  it("stores an allowlisted event with an allowlisted path and answers 204", async () => {
    const before = await countEvents("page_view", "/telemetry-probe-page");
    const res = await handleTelemetry(
      post({ event: "page_view", path: "/telemetry-probe-page" }),
      patterns,
    );
    expect(res.status).toBe(204);
    expect(await countEvents("page_view", "/telemetry-probe-page")).toBe(before + 1);
  }, 30_000);

  it("stores an unknown path as the empty string, never verbatim", async () => {
    const sql = await getSql();
    const res = await handleTelemetry(
      post({ event: "inquiry_open", path: "/u/victim@example.com" }),
      patterns,
    );
    expect(res.status).toBe(204);
    const leaked = await sql`select 1 from telemetry_events where path like ${"%victim%"}`;
    expect(leaked).toEqual([]);
  }, 30_000);

  it("rejects an unknown event with 400", async () => {
    const res = await handleTelemetry(post({ event: "email=a@b.co", path: "/" }), patterns);
    expect(res.status).toBe(400);
  });

  it("rejects non-object JSON with 400 and oversize bodies with 413", async () => {
    expect((await handleTelemetry(post("[]"), patterns)).status).toBe(400);
    expect(
      (await handleTelemetry(post({ event: "page_view", path: "x".repeat(5000) }), patterns))
        .status,
    ).toBe(413);
  });

  it("honors DNT and Sec-GPC without storing or counting anything", async () => {
    const before = await countEvents("page_view", "/");
    expect(
      (await handleTelemetry(post({ event: "page_view", path: "/" }, { DNT: "1" }), patterns))
        .status,
    ).toBe(204);
    expect(
      (await handleTelemetry(post({ event: "page_view", path: "/" }, { "Sec-GPC": "1" }), patterns))
        .status,
    ).toBe(204);
    expect(await countEvents("page_view", "/")).toBe(before);
  }, 30_000);

  it("allows 120 events per client per minute, then answers 429", async () => {
    const ip = `192.0.2.${Math.random()}`;
    const now = 1_970_000_000_000;
    const statuses: number[] = [];
    for (let i = 0; i < 121; i += 1) {
      const res = await handleTelemetry(
        post({ event: "bogus" }, { "x-forwarded-for": ip }),
        patterns,
        now,
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 120).every((status) => status === 400)).toBe(true);
    expect(statuses[120]).toBe(429);
  }, 60_000);
});
