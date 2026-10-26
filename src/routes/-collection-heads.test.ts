import { describe, expect, it } from "vitest";
import { blog } from "@/lib/mlai/categories/blog";
import { docs } from "@/lib/mlai/categories/docs";
import { products } from "@/lib/mlai/categories/products";
import { projects } from "@/lib/mlai/categories/projects";
import { research } from "@/lib/mlai/categories/research";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { team } from "@/lib/mlai/categories/team";
import { Route as blogRoute } from "./blog";
import { Route as docsRoute } from "./docs";
import { Route as implRoute } from "./research.implementations";
import { Route as productsRoute } from "./products";
import { Route as projectsRoute } from "./projects";
import { Route as researchRoute } from "./research";
import { Route as teamRoute } from "./team";

type Head = {
  meta?: { title?: string; name?: string; content?: string }[];
  scripts?: { type?: string; children?: string }[];
};

function collection(route: { options: { head?: (...a: never[]) => unknown } }) {
  const head = route.options.head!({} as never) as Head;
  const script = head.scripts?.find((s) => s.type === "application/ld+json");
  expect(script).toBeDefined();
  return { head, ld: JSON.parse(script!.children!) };
}

const cases = [
  ["blog", blogRoute, "/blog", blog.length],
  ["research", researchRoute, "/research", research.publications.length],
  ["implementations", implRoute, "/research/implementations", researchContext.length],
  ["docs", docsRoute, "/docs", docs.length],
  ["products", productsRoute, "/products", products.length],
  ["projects", projectsRoute, "/projects", projects.length],
  ["team", teamRoute, "/team", team.filter((p) => p.slug).length],
] as const;

describe("index pages emit CollectionPage", () => {
  for (const [label, route, path, count] of cases) {
    it(`${label}: CollectionPage with ${count} items`, () => {
      const { ld } = collection(route as never);
      expect(ld["@type"]).toBe("CollectionPage");
      expect(ld.url).toBe(`https://quesar.cloud${path}`);
      expect(ld.mainEntity.numberOfElements).toBe(count);
      expect(ld.mainEntity.itemListElement).toHaveLength(count);
      for (const item of ld.mainEntity.itemListElement) {
        expect(item.url.startsWith(`https://quesar.cloud${path}/`)).toBe(true);
      }
    });
  }

  it("reuses the title and description passed to pageHead", () => {
    const { head, ld } = collection(blogRoute as never);
    const title = head.meta?.find((m) => m.title)?.title;
    expect(ld.name).toBe(title);
  });
});
