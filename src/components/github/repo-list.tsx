import { useEffect, useMemo, useState } from "react";
import { AppLink } from "@/components/site/app-link";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { repos, type RepoKind } from "@/lib/content";
import { loadGithubData, type EventItem, type LiveRepo } from "@/lib/github";
import { pathForRepo } from "@/lib/catalog";
import { isAbsoluteUrl } from "@/lib/internal";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "unavailable";

const FEATURED = new Set<string>(repos.map((r) => r.name));

function relTime(iso: string) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const days = Math.max(0, Math.round((Date.now() - then) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function eventLabel(type: string) {
  if (type === "PushEvent") return "pushed";
  if (type === "CreateEvent") return "created";
  if (type === "IssuesEvent") return "issue";
  if (type === "PullRequestEvent") return "pull request";
  if (type === "ReleaseEvent") return "release";
  if (type === "WatchEvent") return "starred";
  if (type === "ForkEvent") return "forked";
  return type.replace(/Event$/, "").toLowerCase();
}

export function RepoList({ compact = false }: { compact?: boolean }) {
  const [live, setLive] = useState<LiveRepo[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | RepoKind>("all");

  useEffect(() => {
    let cancelled = false;
    void loadGithubData().then((payload) => {
      if (cancelled) return;
      setLive(payload.repos);
      setEvents(payload.events);
      setState(payload.state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    const byName = new Map(live.map((r) => [r.name, r]));
    return repos
      .filter((repo) => kind === "all" || repo.kind === kind)
      .filter((repo) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const hay = `${repo.name} ${repo.summary} ${repo.language}`.toLowerCase();
        return hay.includes(q);
      })
      .map((repo) => ({ repo, live: byName.get(repo.name) }));
  }, [live, query, kind]);

  const extras = useMemo(() => {
    if (compact || query.trim()) return [];
    return live.filter((r) => !FEATURED.has(r.name) && !r.archived).slice(0, 12);
  }, [live, compact, query]);

  return (
    <div>
      {state === "ready" ? (
        <p className="mb-4 text-xs text-fg-subtle" role="status">
          Live repository metadata from donaldfilimon
        </p>
      ) : null}
      {state === "unavailable" ? (
        <p className="mb-4 text-sm text-fg-muted" role="status">
          Live repository metadata is unavailable. Pages below still describe each public tree.
        </p>
      ) : null}
      {state === "loading" ? (
        <p className="mb-4 text-sm text-fg-muted" role="status">
          Loading public repository metadata…
        </p>
      ) : null}

      {!compact ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, language, or summary"
            aria-label="Filter repositories"
            className="flex-1"
          />
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(value) => {
              if (value) setKind(value as "all" | RepoKind);
            }}
            aria-label="Repository kind"
            className="flex-wrap"
          >
            {(["all", "core", "surface", "skill", "related"] as const).map((k) => (
              <ToggleGroupItem key={k} value={k}>
                {k}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      <ul className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
        {catalog.map(({ repo, live: row }) => {
          const badge = repo.badge ?? (row?.archived ? "archived" : null);
          const summary = repo.pinnedSummary ? repo.summary : row?.description || repo.summary;
          return (
            <li key={repo.name}>
              <AppLink
                to={repo.href}
                external={isAbsoluteUrl(repo.href)}
                className="surface surface-hover flex h-full flex-col p-4 no-underline"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-mono text-[0.7rem] text-fg-subtle">
                    {repo.owner}/{repo.name}
                  </p>
                  {badge ? <span className="text-xs text-fg-subtle">{badge}</span> : null}
                </div>
                <p className="mt-2 text-sm font-medium text-fg">{summary}</p>
                {row?.topics?.length ? (
                  <p className="mt-2 font-mono text-[10px] text-fg-subtle">
                    {row.topics.slice(0, 6).join(" · ")}
                  </p>
                ) : null}
                <p className="mt-auto pt-4 font-mono text-[0.7rem] text-fg-muted">
                  {row?.language ?? repo.language}
                  {row ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {row.stars} {row.stars === 1 ? "star" : "stars"}
                      {row.updated ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          {relTime(row.updated)}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </p>
              </AppLink>
            </li>
          );
        })}
      </ul>

      {catalog.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">No repositories match that filter.</p>
      ) : null}

      {!compact && extras.length ? (
        <div className="mt-10">
          <p className="text-xs text-fg-subtle">Also public</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((row) => (
              <li key={row.name}>
                <AppLink
                  to={pathForRepo(row.name)}
                  className="surface surface-hover block p-4 no-underline"
                >
                  <p className="font-mono text-[0.7rem] text-fg">{row.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-muted">
                    {row.description || "No description."}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-fg-subtle">
                    {row.language ?? "—"} · {row.stars} ★ · {relTime(row.updated)}
                  </p>
                </AppLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && events.length ? (
        <div className="mt-10">
          <p className="text-xs text-fg-subtle">Recent public activity</p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg shadow-[var(--shadow-border)]">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-baseline justify-between gap-4 bg-bg-elevated px-4 py-3"
              >
                <p className="text-sm text-fg-muted">
                  <AppLink
                    to={pathForRepo(event.repo.split("/").pop() ?? event.repo)}
                    className="font-mono text-fg no-underline hover:text-accent"
                  >
                    {event.repo}
                  </AppLink>
                  <span className="mx-2 text-fg-subtle">{eventLabel(event.type)}</span>
                </p>
                <p className="shrink-0 font-mono text-[10px] text-fg-subtle">
                  {relTime(event.created)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
