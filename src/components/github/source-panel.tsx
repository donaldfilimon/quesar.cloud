import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadGithub, type ReadmeCard } from "@/lib/github";
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

function relFetched(iso: string | null) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function GithubStatusLine() {
  const [status, setStatus] = useState<"loading" | "live" | "local">("loading");
  const [when, setWhen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGithub().then((payload) => {
      if (cancelled) return;
      setWhen(relFetched(payload.fetchedAt));
      setStatus(payload.readmes.length ? "live" : "local");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase" role="status">
      {status === "loading"
        ? "Asking GitHub…"
        : status === "live"
          ? `Live READMEs from donaldfilimon${when ? ` · ${when}` : ""}`
          : "GitHub did not answer · local excerpts"}
    </p>
  );
}

export function SourcePanel() {
  const [cards, setCards] = useState<ReadmeCard[]>(FALLBACK);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<"loading" | "live" | "local">("loading");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGithub().then((payload) => {
      if (cancelled) return;
      setFetchedAt(payload.fetchedAt);
      if (payload.readmes.length) {
        setCards(payload.readmes);
        setLive(true);
        setStatus("live");
        return;
      }
      setStatus("local");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const first = cards[0]?.name ?? "abi";
  const when = relFetched(fetchedAt);

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.16em] text-accent uppercase">
          {status === "loading" ? "asking GitHub…" : live ? "live README" : "local excerpt"}
        </p>
        <p className="font-mono text-[10px] text-fg-subtle">
          {status === "live" && when ? `donaldfilimon · ${when}` : "donaldfilimon"}
        </p>
      </div>
      {status === "local" ? (
        <p className="border-b border-border px-4 py-2 text-xs text-fg-muted">
          GitHub did not answer. Showing the last verified excerpts. Product pages stay on this site.
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
