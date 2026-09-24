import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReadmeCard } from "@/lib/github";
import { useGithubData } from "@/lib/use-github-data";
import { GithubSectionStatus } from "./section-status";
import { pathForRepo } from "@/lib/catalog";

const FALLBACK: ReadmeCard[] = [
  {
    name: "abi",
    excerpt:
      "Nightly Rust framework for agent orchestration, WDBX semantic storage, and claim-honest capability reporting. The Zig tree has been removed.",
    htmlUrl: "https://github.com/donaldfilimon/abi",
  },
  {
    name: "wdbx",
    excerpt:
      "Provenance-aware episodic substrate extracted from donaldfilimon/abi on 2026-08-22 with history preserved. Memory is not a database lookup.",
    htmlUrl: "https://github.com/donaldfilimon/wdbx",
  },
  {
    name: "abbey",
    excerpt:
      "CLI/TUI companion that will not claim what the ledger cannot prove. Canonical capability ledger lives in src/claims.rs.",
    htmlUrl: "https://github.com/donaldfilimon/abbey",
  },
  {
    name: "skill-creator",
    excerpt:
      "Public agent skill for creating skills and shipping the company site without breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts.",
    htmlUrl: "https://github.com/donaldfilimon/skill-creator",
  },
];

export function GithubStatusLine() {
  const { data, loading, retry } = useGithubData();
  return (
    <div className="mt-6">
      <GithubSectionStatus
        status={data?.sections.readmes}
        loading={loading}
        label="READMEs"
        retry={retry}
      />
    </div>
  );
}

export function SourcePanel() {
  const { data, loading, retry } = useGithubData();
  const cards = data?.readmes.length ? data.readmes : FALLBACK;
  const first = cards[0]?.name ?? "abi";

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <GithubSectionStatus
          status={data?.sections.readmes}
          loading={loading}
          label="READMEs"
          retry={retry}
        />
      </div>
      {!loading && !data?.readmes.length ? (
        <p className="border-b border-border px-4 py-2 text-xs text-fg-muted">
          GitHub did not answer. Showing the last verified excerpts. Product pages stay on this
          site.
        </p>
      ) : null}
      <Tabs defaultValue={first} key={first}>
        <TabsList aria-label="Repositories">
          {cards.map((item) => (
            <TabsTrigger key={item.name} value={item.name}>
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {cards.map((card) => (
          <TabsContent key={card.name} value={card.name} className="p-5 sm:p-6">
            <h3 className="font-display text-2xl tracking-tight">{card.name}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{card.excerpt}</p>
            <Link
              to={pathForRepo(card.name) as never}
              className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent"
            >
              Open {card.name}
            </Link>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
