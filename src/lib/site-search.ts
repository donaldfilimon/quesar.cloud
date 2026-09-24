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
