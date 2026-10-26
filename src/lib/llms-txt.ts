import { SITE_ORIGIN, clampDescription } from "./seo";
import { site } from "./site-identity";
import { searchCatalog } from "./site-search-catalog";

const SECTIONS = [
  ["site", "Site"],
  ["docs", "Docs"],
  ["research", "Research"],
  ["projects", "Projects"],
] as const;

/** Private, app or noindex routes: never advertised in llms.txt. */
export const LLMS_EXCLUDED = [
  "/console",
  "/dashboard",
  "/profile",
  "/admin",
  "/login",
  "/signup",
  "/unauthorized",
  "/financial-model",
  "/tf-pose-demo",
  "/quasar",
] as const;

const excluded = (href: string) =>
  LLMS_EXCLUDED.some((prefix) => href === prefix || href.startsWith(`${prefix}/`));

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The /llms.txt index (llms.txt convention): derived from the search catalog,
 * the site's single inventory, so it never keeps a second list of pages.
 * Import this only from `app/llms.txt/route.ts`: the catalog pulls every
 * content module, which must stay out of the shared client bundle.
 */
export function buildLlmsTxt(): string {
  const groups = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const hit of searchCatalog) {
    if (hit.external || !hit.href || seen.has(hit.href) || excluded(hit.href)) continue;
    seen.add(hit.href);
    const heading = SECTIONS.find(([category]) => category === hit.category)?.[1] ?? "More";
    const body = clampDescription(collapse(hit.body));
    const line = `- [${collapse(hit.title)}](${SITE_ORIGIN}${hit.href})${body ? `: ${body}` : ""}`;
    groups.set(heading, [...(groups.get(heading) ?? []), line]);
  }
  const order = [...SECTIONS.map(([, h]) => h as string), "More"];
  const sections = order
    .filter((h) => groups.has(h))
    .map((h) => `## ${h}\n${groups.get(h)!.join("\n")}`);
  const description = collapse(site.description);
  const mission = collapse(site.mission);
  const intro = mission === description ? "" : `${mission}\n\n`;
  return `# ${site.name}\n\n> ${description}\n\n${intro}${sections.join("\n\n")}\n`;
}
