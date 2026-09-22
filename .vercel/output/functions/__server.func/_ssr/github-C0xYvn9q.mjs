import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/github-C0xYvn9q.js
var HEADERS = {
	Accept: "application/vnd.github+json",
	"User-Agent": "quesar-mlai-site"
};
var RAW_HEADERS = {
	Accept: "text/plain",
	"User-Agent": "quesar-mlai-site"
};
var FEATURED_READMES = [
	"abi",
	"wdbx",
	"abbey",
	"MLAI-CORPORATION-WWW",
	"skill-creator",
	"abbey-bot",
	"gama"
];
var cache = null;
var TTL_MS = 3e5;
async function readJson(url) {
	const response = await fetch(url, { headers: HEADERS });
	if (!response.ok) throw new Error(`github ${response.status}`);
	return response.json();
}
function excerptMarkdown(md) {
	const text = md.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ").replace(/!\[[^\]]*]\([^)]*\)/g, " ").replace(/\[([^\]]+)]\([^)]*\)/g, "$1").split("\n").map((line) => line.trim()).filter((line) => {
		if (!line) return false;
		if (line.startsWith("#")) return false;
		if (line.startsWith("---")) return false;
		if (line.startsWith("|")) return false;
		if (line.startsWith("- [")) return false;
		if (line.startsWith("* [")) return false;
		if (/^[-*_]{3,}$/.test(line)) return false;
		return true;
	}).slice(0, 4).join(" ").replace(/\s+/g, " ").trim();
	if (text.length <= 420) return text;
	return `${text.slice(0, 417).replace(/\s+\S*$/, "")}…`;
}
async function readReadme(name) {
	try {
		const response = await fetch(`https://raw.githubusercontent.com/donaldfilimon/${name}/main/README.md`, { headers: RAW_HEADERS });
		if (!response.ok) return null;
		const excerpt = excerptMarkdown(await response.text());
		if (!excerpt) return null;
		return {
			name,
			excerpt,
			htmlUrl: `https://github.com/donaldfilimon/${name}`
		};
	} catch {
		return null;
	}
}
var loadGithub_createServerFn_handler = createServerRpc({
	id: "afaddab47e472f5b1d23e9ff5a5780608fab3db4d6e80f197569e2747dc035d0",
	name: "loadGithub",
	filename: "src/lib/github.ts"
}, (opts) => loadGithub.__executeServer(opts));
var loadGithub = createServerFn({ method: "GET" }).handler(loadGithub_createServerFn_handler, async () => {
	if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
	try {
		const [repoJson, eventJson, readmeResults] = await Promise.all([
			readJson("https://api.github.com/users/donaldfilimon/repos?per_page=100&sort=updated"),
			readJson("https://api.github.com/users/donaldfilimon/events/public?per_page=12"),
			Promise.all(FEATURED_READMES.map((name) => readReadme(name)))
		]);
		const repos = (Array.isArray(repoJson) ? repoJson : []).filter((item) => item.name && item.html_url).map((item) => ({
			name: String(item.name),
			description: typeof item.description === "string" ? item.description : null,
			language: typeof item.language === "string" ? item.language : null,
			stars: Number(item.stargazers_count ?? 0),
			forks: Number(item.forks_count ?? 0),
			updated: typeof item.updated_at === "string" ? item.updated_at : "",
			homepage: typeof item.homepage === "string" ? item.homepage : null,
			htmlUrl: String(item.html_url),
			archived: Boolean(item.archived),
			topics: Array.isArray(item.topics) ? item.topics.filter((t) => typeof t === "string") : []
		}));
		const events = (Array.isArray(eventJson) ? eventJson : []).filter((e) => e.id && e.repo?.name).slice(0, 8).map((e) => ({
			id: e.id,
			type: e.type ?? "Event",
			repo: (e.repo?.name ?? "").replace(/^donaldfilimon\//, ""),
			created: e.created_at ?? ""
		}));
		const readmes = readmeResults.filter((card) => Boolean(card));
		const data = {
			state: repos.length ? "ready" : "unavailable",
			repos,
			events,
			readmes,
			fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		cache = {
			at: Date.now(),
			data
		};
		return data;
	} catch {
		return {
			state: "unavailable",
			repos: [],
			events: [],
			readmes: [],
			fetchedAt: null
		};
	}
});
//#endregion
export { loadGithub_createServerFn_handler };
