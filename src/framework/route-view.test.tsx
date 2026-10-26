import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/", hydrated: false }));
vi.mock("./router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./router")>()),
  useHydrated: () => state.hydrated,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.pathname } }),
}));

import { HeadTags, RouteView } from "./route-view";
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

describe("RouteView heading for client-only routes", () => {
  const Body = () => <main>route body</main>;
  const route = (ssr: boolean, title = "Film · Quesar") => ({
    options: { ssr, component: Body, head: () => ({ meta: [{ title }] }) },
  });
  const h1s = (html: string) => html.match(/<h1[^>]*>.*?<\/h1>/g) ?? [];

  it("renders one hidden h1 with the brandless title, not the component, before hydration", () => {
    state.hydrated = false;
    state.pathname = "/showcase/film";
    const html = renderToStaticMarkup(<RouteView route={route(false)} />);
    expect(h1s(html)).toEqual(['<h1 class="sr-only">Film</h1>']);
    expect(html).not.toContain("route body");
  });

  it("strips other brand suffixes", () => {
    state.hydrated = false;
    const html = renderToStaticMarkup(<RouteView route={route(false, "Mega — MLAI")} />);
    expect(h1s(html)).toEqual(['<h1 class="sr-only">Mega</h1>']);
  });

  it("renders the component and no injected h1 after hydration", () => {
    state.hydrated = true;
    const html = renderToStaticMarkup(<RouteView route={route(false)} />);
    expect(html).toContain("route body");
    expect(h1s(html)).toEqual([]);
  });

  it("never injects an h1 on an ssr route", () => {
    state.hydrated = false;
    const html = renderToStaticMarkup(<RouteView route={route(true)} />);
    expect(html).toContain("route body");
    expect(h1s(html)).toEqual([]);
  });
});
