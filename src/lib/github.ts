import { createServerFn } from "@tanstack/react-start";
import { staticSite } from "@/lib/static-site";

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

export type GithubPayload = {
  state: "ready" | "unavailable";
  repos: LiveRepo[];
  events: EventItem[];
  readmes: ReadmeCard[];
  fetchedAt: string | null;
};

const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "quesar-mlai-site",
};

const RAW_HEADERS = {
  Accept: "text/plain",
  "User-Agent": "quesar-mlai-site",
};

const FEATURED_READMES = [
  "abi",
  "wdbx",
  "abbey",
  "MLAI-CORPORATION-WWW",
  "skill-creator",
  "abbey-bot",
  "gama",
] as const;

let cache: { at: number; data: GithubPayload } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function readJson(url: string, browser = false) {
  // In the browser, keep the request CORS-simple (no custom User-Agent).
  const response = await fetch(url, browser ? { headers: { Accept: HEADERS.Accept } } : { headers: HEADERS });
  if (!response.ok) throw new Error(`github ${response.status}`);
  return response.json();
}

function excerptMarkdown(md: string) {
  const cleaned = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
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
      return true;
    });
  const text = cleaned.slice(0, 4).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 420) return text;
  return `${text.slice(0, 417).replace(/\s+\S*$/, "")}…`;
}

async function readReadme(name: string, browser = false): Promise<ReadmeCard | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/donaldfilimon/${name}/main/README.md`,
      browser ? undefined : { headers: RAW_HEADERS },
    );
    if (!response.ok) return null;
    const md = await response.text();
    const excerpt = excerptMarkdown(md);
    if (!excerpt) return null;
    return {
      name,
      excerpt,
      htmlUrl: `https://github.com/donaldfilimon/${name}`,
    };
  } catch {
    return null;
  }
}

/** Fetch the public GitHub payload. Isomorphic: plain fetch against CORS-enabled endpoints. */
async function fetchGithubPayload(browser: boolean): Promise<GithubPayload> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const [repoJson, eventJson, readmeResults] = await Promise.all([
      readJson("https://api.github.com/users/donaldfilimon/repos?per_page=100&sort=updated", browser),
      readJson("https://api.github.com/users/donaldfilimon/events/public?per_page=12", browser),
      Promise.all(FEATURED_READMES.map((name) => readReadme(name, browser))),
    ]);
    const repos: LiveRepo[] = (Array.isArray(repoJson) ? repoJson : [])
      .filter((item: { name?: string; html_url?: string }) => item.name && item.html_url)
      .map((item: Record<string, unknown>) => ({
        name: String(item.name),
        description: typeof item.description === "string" ? item.description : null,
        language: typeof item.language === "string" ? item.language : null,
        stars: Number(item.stargazers_count ?? 0),
        forks: Number(item.forks_count ?? 0),
        updated: typeof item.updated_at === "string" ? item.updated_at : "",
        homepage: typeof item.homepage === "string" ? item.homepage : null,
        htmlUrl: String(item.html_url),
        archived: Boolean(item.archived),
        topics: Array.isArray(item.topics) ? item.topics.filter((t): t is string => typeof t === "string") : [],
      }));
    const events: EventItem[] = (Array.isArray(eventJson) ? eventJson : [])
      .filter((e: { id?: string; repo?: { name?: string } }) => e.id && e.repo?.name)
      .slice(0, 8)
      .map((e: { id: string; type?: string; repo?: { name?: string }; created_at?: string }) => ({
        id: e.id,
        type: e.type ?? "Event",
        repo: (e.repo?.name ?? "").replace(/^donaldfilimon\//, ""),
        created: e.created_at ?? "",
      }));
    const readmes = readmeResults.filter((card): card is ReadmeCard => Boolean(card));
    const data: GithubPayload = {
      state: repos.length ? "ready" : "unavailable",
      repos,
      events,
      readmes,
      fetchedAt: new Date().toISOString(),
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return { state: "unavailable", repos: [], events: [], readmes: [], fetchedAt: null };
  }
}

export const loadGithub = createServerFn({ method: "GET" }).handler(async (): Promise<GithubPayload> =>
  fetchGithubPayload(false),
);

/**
 * What components call. The server deployment goes through the server function
 * (cached, identified User-Agent); the static site has no server, so the browser
 * reads GitHub's public, CORS-enabled API directly.
 */
export function loadGithubData(): Promise<GithubPayload> {
  return staticSite ? fetchGithubPayload(true) : loadGithub();
}
