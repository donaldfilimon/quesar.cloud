export type LiveRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated: string;
  homepage: string | null;
  htmlUrl: string;
  archived: boolean;
  topics: string[];
};

export type EventItem = {
  id: string;
  type: string;
  repo: string;
  created: string;
};

export type ReadmeCard = {
  name: string;
  excerpt: string;
  htmlUrl: string;
};

/**
 * `snapshot`: GitHub did not answer, so the section shows the copy captured
 * when the static site was built (`scripts/github-snapshot-plugin.ts`).
 */
export type Freshness = {
  state: "fresh" | "stale" | "snapshot" | "unavailable";
  fetchedAt: string | null;
};
export type GithubPayload = {
  state: "ready" | "unavailable";
  repos: LiveRepo[];
  events: EventItem[];
  readmes: ReadmeCard[];
  fetchedAt: string | null;
  sections: { repos: Freshness; events: Freshness; readmes: Freshness };
};
const README_NAMES = ["quesar.cloud", "abi", "wdbx", "abbey", "skill-creator", "abbey-bot", "gama"];
type Slot<T> = { data?: T; at: number | null; next: number; failed: boolean };
const slot = <T>(): Slot<T> => ({ at: null, next: 0, failed: false });
const freshness = <T>(s: Slot<T>): Freshness => ({
  state: s.at === null ? "unavailable" : s.failed ? "stale" : "fresh",
  fetchedAt: s.at === null ? null : new Date(s.at).toISOString(),
});
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid GitHub record");
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid GitHub collection");
  return value;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Invalid GitHub string");
  return value;
}
const nullableString = (value: unknown) => (typeof value === "string" ? value : null);
const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
function repositories(value: unknown): LiveRepo[] {
  return array(value).map((raw) => {
    const item = record(raw);
    const htmlUrl = string(item.html_url);
    if (!htmlUrl.startsWith("https://github.com/")) throw new Error("Invalid repository URL");
    return {
      name: string(item.name),
      htmlUrl,
      description: nullableString(item.description),
      language: nullableString(item.language),
      stars: count(item.stargazers_count),
      forks: count(item.forks_count),
      updated: nullableString(item.updated_at) ?? "",
      homepage: nullableString(item.homepage),
      archived: item.archived === true,
      topics: Array.isArray(item.topics)
        ? item.topics.filter((t): t is string => typeof t === "string")
        : [],
    };
  });
}
function events(value: unknown): EventItem[] {
  return array(value)
    .slice(0, 8)
    .map((raw) => {
      const item = record(raw);
      return {
        id: string(item.id),
        type: nullableString(item.type) ?? "Event",
        repo: string(record(item.repo).name).replace(/^donaldfilimon\//, ""),
        created: nullableString(item.created_at) ?? "",
      };
    });
}

export function excerptMarkdown(md: string) {
  const cleaned = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (line.startsWith("#")) return false;
      if (line.startsWith("---")) return false;
      if (line.startsWith("|")) return false;
      if (line.startsWith("- [")) return false;
      if (line.startsWith("* [")) return false;
      if (/^[-*_]{3,}$/.test(line)) return false;
      // Setext H1 underline ("Title\n=====").
      if (/^=+$/.test(line)) return false;
      return true;
    })
    // Unwrap links only after filtering, so the "- [" / "* [" TOC rules still see them.
    .map((line) => line.replace(/\[([^\]]+)]\([^)]*\)/g, "$1").trim())
    .filter(Boolean);
  const text = cleaned.slice(0, 4).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 420) return text;
  return `${text.slice(0, 417).replace(/\s+\S*$/, "")}…`;
}

/** One loader instance owns one in-memory cache and one shared refresh. */
export function createGithubLoader(fetcher: typeof fetch = fetch, now = Date.now) {
  const repoCache = slot<LiveRepo[]>();
  const eventCache = slot<EventItem[]>();
  const readmeCaches = README_NAMES.map(() => slot<ReadmeCard>());
  let active: Promise<GithubPayload> | undefined;

  async function request<T>(url: string, decode: (response: Response) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        fetcher(url, {
          signal: controller.signal,
          headers: {
            Accept: url.includes("api.github.com") ? "application/vnd.github+json" : "text/plain",
          },
        }).then((response) => {
          if (!response.ok) throw new Error(`GitHub ${response.status}`);
          return decode(response);
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("GitHub timeout"));
          }, 10000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function refresh<T>(cache: Slot<T>, fetchData: () => Promise<T>, force: boolean) {
    if (!force && now() < cache.next) return;
    try {
      cache.data = await fetchData();
      cache.at = now();
      cache.failed = false;
      cache.next = now() + 300000;
    } catch {
      cache.failed = true;
      cache.next = now() + 30000;
    }
  }
  function payload(): GithubPayload {
    const readmes = readmeCaches.flatMap((cache) => (cache.data ? [cache.data] : []));
    const timestamps = readmeCaches.flatMap((cache) => (cache.at === null ? [] : [cache.at]));
    const readmeState: Freshness = {
      state:
        readmes.length === 0
          ? "unavailable"
          : readmeCaches.every((cache) => cache.at !== null && !cache.failed)
            ? "fresh"
            : "stale",
      fetchedAt: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
    };
    return {
      state: repoCache.at === null ? "unavailable" : "ready",
      repos: repoCache.data ?? [],
      events: eventCache.data ?? [],
      readmes,
      fetchedAt: readmeState.fetchedAt,
      sections: {
        repos: freshness(repoCache),
        events: freshness(eventCache),
        readmes: readmeState,
      },
    };
  }
  return function load(force = false): Promise<GithubPayload> {
    if (active) return active;
    active = Promise.all([
      refresh(
        repoCache,
        () =>
          request(
            "https://api.github.com/users/donaldfilimon/repos?per_page=100&sort=updated",
            async (response) => repositories(await response.json()),
          ),
        force,
      ),
      refresh(
        eventCache,
        () =>
          request(
            "https://api.github.com/users/donaldfilimon/events/public?per_page=12",
            async (response) => events(await response.json()),
          ),
        force,
      ),
      ...README_NAMES.map((name, index) =>
        refresh(
          readmeCaches[index],
          () =>
            request(
              `https://raw.githubusercontent.com/donaldfilimon/${name}/main/README.md`,
              async (response) => {
                const excerpt = excerptMarkdown(await response.text());
                if (!excerpt) throw new Error("Empty README");
                return { name, excerpt, htmlUrl: `https://github.com/donaldfilimon/${name}` };
              },
            ),
          force,
        ),
      ),
    ])
      .then(payload)
      .finally(() => {
        active = undefined;
      });
    return active;
  };
}
export const fetchGithubPayload = createGithubLoader();

/**
 * Fill every section the live refresh could not load from the build-time
 * snapshot. A section with any live data keeps it; README cards merge by name,
 * live first, so one failed README does not blank the others.
 */
export function withSnapshot(live: GithubPayload, snapshot: GithubPayload | null): GithubPayload {
  if (!snapshot) return live;
  const fromSnapshot = (section: keyof GithubPayload["sections"]): Freshness => ({
    state: "snapshot",
    fetchedAt: snapshot.sections[section].fetchedAt,
  });
  const fillFromSnapshot = (section: "repos" | "events") =>
    live.sections[section].state === "unavailable" && snapshot[section].length > 0;

  const liveNames = new Set(live.readmes.map((card) => card.name));
  const filled = snapshot.readmes.filter((card) => !liveNames.has(card.name));
  const readmes = [...live.readmes, ...filled].sort(
    (a, b) => README_NAMES.indexOf(a.name) - README_NAMES.indexOf(b.name),
  );

  const repos = fillFromSnapshot("repos") ? snapshot.repos : live.repos;
  return {
    state: repos.length ? "ready" : live.state,
    repos,
    events: fillFromSnapshot("events") ? snapshot.events : live.events,
    readmes,
    fetchedAt: live.fetchedAt ?? snapshot.fetchedAt,
    sections: {
      repos: fillFromSnapshot("repos") ? fromSnapshot("repos") : live.sections.repos,
      events: fillFromSnapshot("events") ? fromSnapshot("events") : live.sections.events,
      readmes: filled.length ? fromSnapshot("readmes") : live.sections.readmes,
    },
  };
}

/** Build-time capture for the static site: everything a live load returns, or null when GitHub did not answer. */
export async function captureGithubSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<GithubPayload | null> {
  const payload = await createGithubLoader(fetcher)(true);
  return payload.state === "ready" ? payload : null;
}

/** Accepts a snapshot asset only if it still has the payload shape this build renders. */
export function parseSnapshot(value: unknown): GithubPayload | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<GithubPayload>;
  const sections = v.sections;
  const ok =
    v.state === "ready" &&
    Array.isArray(v.repos) &&
    Array.isArray(v.events) &&
    Array.isArray(v.readmes) &&
    !!sections &&
    ["repos", "events", "readmes"].every(
      (key) => typeof sections[key as keyof typeof sections]?.state === "string",
    );
  return ok ? (value as GithubPayload) : null;
}
