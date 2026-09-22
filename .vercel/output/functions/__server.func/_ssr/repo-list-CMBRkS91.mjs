import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { C as pathForRepo, I as cn, ut as repos } from "./router-CTU_BGql.mjs";
import { t as AppLink } from "./catalog-mPups2gl.mjs";
import { n as ToggleGroupItem, t as ToggleGroup } from "./toggle-group-j2D9SjS7.mjs";
import { t as Input } from "./input-CLuOZ_Uu.mjs";
import { t as loadGithub } from "./github-DVvoAF69.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/repo-list-CMBRkS91.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FEATURED = new Set(repos.map((r) => r.name));
function relTime(iso) {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return "";
	const days = Math.max(0, Math.round((Date.now() - then) / 864e5));
	if (days === 0) return "today";
	if (days === 1) return "yesterday";
	if (days < 30) return `${days}d ago`;
	if (days < 365) return `${Math.round(days / 30)}mo ago`;
	return `${Math.round(days / 365)}y ago`;
}
function eventLabel(type) {
	if (type === "PushEvent") return "pushed";
	if (type === "CreateEvent") return "created";
	if (type === "IssuesEvent") return "issue";
	if (type === "PullRequestEvent") return "pull request";
	if (type === "ReleaseEvent") return "release";
	if (type === "WatchEvent") return "starred";
	if (type === "ForkEvent") return "forked";
	return type.replace(/Event$/, "").toLowerCase();
}
function RepoList({ compact = false }) {
	const [live, setLive] = (0, import_react.useState)([]);
	const [events, setEvents] = (0, import_react.useState)([]);
	const [state, setState] = (0, import_react.useState)("loading");
	const [query, setQuery] = (0, import_react.useState)("");
	const [kind, setKind] = (0, import_react.useState)("all");
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		loadGithub().then((payload) => {
			if (cancelled) return;
			setLive(payload.repos);
			setEvents(payload.events);
			setState(payload.state);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	const catalog = (0, import_react.useMemo)(() => {
		const byName = new Map(live.map((r) => [r.name, r]));
		return repos.filter((repo) => kind === "all" || repo.kind === kind).filter((repo) => {
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return `${repo.name} ${repo.summary} ${repo.language}`.toLowerCase().includes(q);
		}).map((repo) => ({
			repo,
			live: byName.get(repo.name)
		}));
	}, [
		live,
		query,
		kind
	]);
	const extras = (0, import_react.useMemo)(() => {
		if (compact || query.trim()) return [];
		return live.filter((r) => !FEATURED.has(r.name) && !r.archived).slice(0, 12);
	}, [
		live,
		compact,
		query
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		state === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase",
			role: "status",
			children: "Live repository metadata from donaldfilimon"
		}) : null,
		state === "unavailable" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-fg-muted",
			role: "status",
			children: "Live repository metadata is unavailable. Pages below still describe each public tree."
		}) : null,
		state === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-fg-muted",
			role: "status",
			children: "Loading public repository metadata…"
		}) : null,
		!compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: query,
				onChange: (e) => setQuery(e.target.value),
				placeholder: "Filter by name, language, or summary",
				"aria-label": "Filter repositories",
				className: "flex-1"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroup, {
				type: "single",
				value: kind,
				onValueChange: (value) => {
					if (value) setKind(value);
				},
				"aria-label": "Repository kind",
				className: "flex-wrap",
				children: [
					"all",
					"core",
					"surface",
					"skill",
					"related"
				].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroupItem, {
					value: k,
					children: k
				}, k))
			})]
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2"),
			children: catalog.map(({ repo, live: row }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppLink, {
				to: repo.href,
				className: "surface surface-hover flex h-full flex-col p-4 no-underline",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate font-mono text-[0.7rem] text-fg-subtle",
							children: [
								repo.owner,
								"/",
								repo.name
							]
						}), row?.archived || repo.name === "mlai-website-app" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[10px] tracking-wide text-fg-subtle uppercase",
							children: "archived"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm font-medium text-fg",
						children: row?.description || repo.summary
					}),
					row?.topics?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-mono text-[10px] text-fg-subtle",
						children: row.topics.slice(0, 6).join(" · ")
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-auto pt-4 font-mono text-[0.7rem] text-fg-muted",
						children: [row?.language ?? repo.language, row ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: " · "
							}),
							row.stars,
							" ",
							row.stars === 1 ? "star" : "stars",
							row.updated ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: " · "
							}), relTime(row.updated)] }) : null
						] }) : null]
					})
				]
			}) }, repo.name))
		}),
		catalog.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 text-sm text-fg-muted",
			children: "No repositories match that filter."
		}) : null,
		!compact && extras.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.7rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Also public"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
				children: extras.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppLink, {
					to: pathForRepo(row.name),
					className: "surface surface-hover block p-4 no-underline",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.7rem] text-fg",
							children: row.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 line-clamp-2 text-xs text-fg-muted",
							children: row.description || "No description."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-[10px] text-fg-subtle",
							children: [
								row.language ?? "—",
								" · ",
								row.stars,
								" ★ · ",
								relTime(row.updated)
							]
						})
					]
				}) }, row.name))
			})]
		}) : null,
		!compact && events.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.7rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Recent public activity"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-border overflow-hidden rounded-lg shadow-[var(--shadow-border)]",
				children: events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-baseline justify-between gap-4 bg-bg-elevated px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-fg-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
							to: pathForRepo(event.repo.split("/").pop() ?? event.repo),
							className: "font-mono text-fg no-underline hover:text-accent",
							children: event.repo
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mx-2 text-fg-subtle",
							children: eventLabel(event.type)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "shrink-0 font-mono text-[10px] text-fg-subtle",
						children: relTime(event.created)
					})]
				}, event.id))
			})]
		}) : null
	] });
}
//#endregion
export { RepoList as t };
