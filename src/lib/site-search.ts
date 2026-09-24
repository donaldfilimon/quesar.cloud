import { architectureNodes, repos, DOCS_HUB_ANCHORS } from "./content";
import { searchIndex } from "./search-pages";
import { isAbsoluteUrl } from "./internal";
import { blog } from "./mlai/categories/blog";
import { docs } from "./mlai/categories/docs";
import { products } from "./mlai/categories/products";
import { projects } from "./mlai/categories/projects";
import { research } from "./mlai/categories/research";
import { researchContext } from "./mlai/categories/research-context";
import { team } from "./mlai/categories/team";

export const searchCategories = [
  ["all", "All"],
  ["projects", "Projects & Products"],
  ["docs", "Docs"],
  ["research", "Research"],
  ["source", "Source"],
  ["site", "Site"],
] as const;
export type SearchCategory = (typeof searchCategories)[number][0];
export type SearchHit = {
  title: string;
  href: string;
  group: string;
  body: string;
  category: Exclude<SearchCategory, "all">;
  external: boolean;
  search?: Record<string, string>;
  hash?: string;
};
function entry(
  title: string,
  href: string,
  group: string,
  body: string,
  category: SearchHit["category"],
): SearchHit {
  return { title, href, group, body, category, external: isAbsoluteUrl(href) };
}
export const searchCatalog: SearchHit[] = [
  ...searchIndex.map((i) =>
    entry(
      i.title,
      i.href,
      i.group,
      i.body,
      i.href.startsWith("/docs")
        ? "docs"
        : i.href.startsWith("/research")
          ? "research"
          : i.group === "Product" || i.group === "Apps"
            ? "projects"
            : "site",
    ),
  ),
  ...architectureNodes.map((i) => ({
    ...entry(i.name, "/architecture", "Architecture", i.summary, "site"),
    search: { node: i.id },
  })),
  ...repos.map((i) => entry(i.name, i.href, "Source", i.summary, "source")),
  ...docs.map((i) => entry(i.title, `/docs/${i.slug}`, "Docs", i.description, "docs")),
  ...DOCS_HUB_ANCHORS.map((i) => ({
    ...entry(i.label, "/docs", "Docs reference", i.label, "docs"),
    hash: i.id,
  })),
  ...blog.map((i) => entry(i.title, `/blog/${i.slug}`, "Blog", i.excerpt, "site")),
  ...research.publications.map((i) =>
    entry(i.title, `/research/${i.slug}`, "Research", i.abstract, "research"),
  ),
  ...researchContext.map((i) =>
    entry(i.title, `/research/implementations/${i.slug}`, "Implementations", i.summary, "research"),
  ),
  ...products.map((i) => entry(i.name, `/products/${i.slug}`, "Product", i.intro, "projects")),
  ...projects.map((i) => entry(i.name, `/projects/${i.slug}`, "Projects", i.tagline, "projects")),
  ...team
    .filter((i) => i.slug)
    .map((i) => entry(i.name, `/team/${i.slug}`, "Team", i.tagline ?? i.bio, "site")),
];
const normalize = (value: string) =>
  value.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
export function destinationKey(hit: SearchHit): string {
  return JSON.stringify([hit.href, Object.entries(hit.search ?? {}).sort(), hit.hash ?? ""]);
}
export function rankHits(
  catalog: readonly SearchHit[],
  query: string,
  category: SearchCategory = "all",
): SearchHit[] {
  const q = normalize(query).slice(0, 80);
  const terms = q.split(" ").filter(Boolean);
  const seen = new Set<string>();
  return catalog
    .map((item, index) => {
      const title = normalize(item.title);
      const hay = normalize(`${item.title} ${item.group} ${item.body}`);
      return {
        item,
        index,
        matches: terms.every((t) => hay.includes(t)),
        score: title === q ? 2 : title.startsWith(q) ? 1 : 0,
      };
    })
    .filter(({ item, matches }) => matches && (category === "all" || item.category === category))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter(({ item }) => {
      const key = destinationKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, q ? 10 : 8)
    .map(({ item }) => item);
}
