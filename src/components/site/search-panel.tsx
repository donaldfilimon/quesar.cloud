import { Command } from "cmdk";
import { Search as SearchIcon } from "lucide-react";
import { useMemo } from "react";
import { architectureNodes, repos, searchIndex } from "@/lib/content";
import { isAbsoluteUrl } from "@/lib/internal";
import { blog } from "@/lib/mlai/categories/blog";
import { docs } from "@/lib/mlai/categories/docs";
import { products as productPages } from "@/lib/mlai/categories/products";
import { projects } from "@/lib/mlai/categories/projects";
import { research } from "@/lib/mlai/categories/research";
import { researchContext } from "@/lib/mlai/categories/research-context";
import { team } from "@/lib/mlai/categories/team";

/**
 * The search catalog and results list. Loaded on demand by `SiteSearch`
 * (`./search`), which sits in the header on every page: keeping this module
 * out of the root chunk keeps cmdk and every content dataset it indexes out
 * of the initial preload.
 */

export type Hit = {
  title: string;
  href: string;
  group: string;
  body: string;
  external: boolean;
  search?: Record<string, string>;
};

const catalog: Hit[] = [
  ...searchIndex.map((item) => ({
    title: item.title,
    href: item.href,
    group: item.group,
    body: item.body,
    external: isAbsoluteUrl(item.href),
  })),
  ...architectureNodes.map((node) => ({
    title: node.name,
    href: "/architecture",
    group: "Architecture",
    body: `${node.summary} Current in source versus not claimed.`,
    external: false,
    search: { node: node.id },
  })),
  ...repos.map((repo) => ({
    title: repo.name,
    href: repo.href,
    group: "Source",
    body: repo.summary,
    external: isAbsoluteUrl(repo.href),
  })),
  ...docs.map((doc) => ({
    title: doc.title,
    href: `/docs/${doc.slug}`,
    group: "Docs",
    body: doc.description,
    external: false,
  })),
  ...blog.map((post) => ({
    title: post.title,
    href: `/blog/${post.slug}`,
    group: "Blog",
    body: post.excerpt,
    external: false,
  })),
  ...research.publications.map((paper) => ({
    title: paper.title,
    href: `/research/${paper.slug}`,
    group: "Research",
    body: paper.abstract,
    external: false,
  })),
  ...researchContext.map((item) => ({
    title: item.title,
    href: `/research/implementations/${item.slug}`,
    group: "Implementations",
    body: item.summary,
    external: false,
  })),
  ...productPages.map((product) => ({
    title: product.name,
    href: `/products/${product.slug}`,
    group: "Product",
    body: product.intro,
    external: false,
  })),
  ...projects.map((project) => ({
    title: project.name,
    href: `/projects/${project.slug}`,
    group: "Projects",
    body: project.tagline,
    external: false,
  })),
  ...team
    .filter((person) => person.slug)
    .map((person) => ({
      title: person.name,
      href: `/team/${person.slug}`,
      group: "Team",
      body: person.tagline ?? person.bio,
      external: false,
    })),
];

function rank(query: string): Hit[] {
  const terms = query
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .slice(0, 80)
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return catalog.slice(0, 8);
  return catalog
    .map((item, index) => {
      const hay = `${item.title} ${item.group} ${item.body}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return { item, index, score: 0 };
      const score = terms.reduce(
        (n, t) =>
          n +
          (item.title.toLowerCase().includes(t) ? 8 : 0) +
          (item.group.toLowerCase().includes(t) ? 3 : 0) +
          (item.body.toLowerCase().includes(t) ? 1 : 0),
        0,
      );
      return { item, index, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 10)
    .map((row) => row.item);
}

export function SearchPanel({
  query,
  setQuery,
  onSelect,
}: {
  query: string;
  setQuery: (value: string) => void;
  onSelect: (hit: Hit) => void;
}) {
  const hits = useMemo(() => rank(query), [query]);
  return (
    <Command shouldFilter={false} className="bg-bg-elevated text-fg">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <SearchIcon className="size-4 text-fg-subtle" strokeWidth={1.75} />
        {/* The dialog's own open-focus runs before a first lazy load finishes. */}
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages, products, and public repositories"
          className="h-14 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      <Command.List className="max-h-[min(24rem,50vh)] overflow-y-auto py-2">
        <Command.Empty className="px-4 py-6 text-sm text-fg-muted">
          No pages match that query.
        </Command.Empty>
        {hits.map((hit) => (
          <Command.Item
            key={`${hit.group}-${hit.href}-${hit.search?.node ?? ""}`}
            value={`${hit.title} ${hit.href} ${hit.search?.node ?? ""}`}
            onSelect={() => onSelect(hit)}
            className="flex cursor-pointer flex-col items-start gap-0.5 px-4 py-3 data-[selected=true]:bg-bg-subtle"
          >
            <span className="text-xs text-fg-subtle">{hit.group}</span>
            <span className="text-sm font-medium text-fg">{hit.title}</span>
            <span className="line-clamp-1 text-xs text-fg-muted">{hit.body}</span>
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}
