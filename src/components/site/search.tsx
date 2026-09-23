import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { architectureNodes, repos, searchIndex } from "@/lib/content";
import { blog, docs, productPages, projects, research, researchContext, team } from "@/lib/mlai";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Hit = {
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
    external: item.href.startsWith("http"),
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
    external: false,
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

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const hits = useMemo(() => rank(query), [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      event.preventDefault();
      setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQuery("");
    if (hit.external) {
      window.open(hit.href, "_blank", "noopener,noreferrer");
      return;
    }
    void navigate({ to: hit.href as never, search: hit.search as never });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
          aria-label="Search the site"
        >
          <SearchIcon className="size-4" strokeWidth={1.75} />
          <span className="hidden text-xs xl:inline">Search</span>
          <kbd className="hidden rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle xl:inline">
            ⌘K
          </kbd>
        </button>
      </DialogTrigger>
      <DialogContent showClose={false} aria-describedby={undefined} className="p-0">
        <DialogTitle className="sr-only">Search Quesar and MLAI</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to architecture nodes, products, docs, and public repositories.
        </DialogDescription>
        <Command shouldFilter={false} className="bg-bg-elevated text-fg">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <SearchIcon className="size-4 text-fg-subtle" strokeWidth={1.75} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, products, and public repositories"
              className="h-14 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
          <Command.List className="max-h-[min(24rem,50vh)] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-6 text-sm text-fg-muted">No pages match that query.</Command.Empty>
            {hits.map((hit) => (
              <Command.Item
                key={`${hit.group}-${hit.href}-${hit.search?.node ?? ""}`}
                value={`${hit.title} ${hit.href} ${hit.search?.node ?? ""}`}
                onSelect={() => go(hit)}
                className="flex cursor-pointer flex-col items-start gap-0.5 px-4 py-3 data-[selected=true]:bg-bg-subtle"
              >
                <span className="text-xs text-fg-subtle">{hit.group}</span>
                <span className="text-sm font-medium text-fg">{hit.title}</span>
                <span className="line-clamp-1 text-xs text-fg-muted">{hit.body}</span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
