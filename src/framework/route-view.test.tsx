import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("./router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./router")>()),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.pathname } }),
}));

import { HeadTags } from "./route-view";
import { site } from "@/lib/site-identity";

function ldScripts(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as Record<string, unknown>,
  );
}

function render(pathname: string, title: string, canonical = true) {
  state.pathname = pathname;
  return ldScripts(
    renderToStaticMarkup(<HeadTags head={{ meta: [{ title }] }} canonical={canonical} />),
  );
}

describe("HeadTags structured data", () => {
  it("adds a BreadcrumbList on a canonical non-root page", () => {
    const scripts = render("/blog/some-post", "Some Post · Quesar");
    const crumbs = scripts.filter((s) => s["@type"] === "BreadcrumbList");
    expect(crumbs).toHaveLength(1);
    const items = crumbs[0]!.itemListElement as Array<{ name: string }>;
    expect(items.map((i) => i.name)).toEqual(["Home", "Blog", "Some Post"]);
  });

  it("emits the site graph exactly once", () => {
    const scripts = render("/blog/some-post", "Some Post · Quesar");
    expect(scripts.filter((s) => "@graph" in s)).toHaveLength(1);
  });

  it("adds no BreadcrumbList on the home page", () => {
    const scripts = render("/", `${site.name} — ${site.company}`);
    expect(scripts.some((s) => s["@type"] === "BreadcrumbList")).toBe(false);
    expect(scripts.filter((s) => "@graph" in s)).toHaveLength(1);
  });

  it("adds no BreadcrumbList on the 404 (canonical off)", () => {
    const scripts = render("/missing", "Not found", false);
    expect(scripts.some((s) => s["@type"] === "BreadcrumbList")).toBe(false);
  });
});
