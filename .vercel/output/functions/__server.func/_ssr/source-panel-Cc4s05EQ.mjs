import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { C as pathForRepo, I as cn } from "./router-CTU_BGql.mjs";
import { t as loadGithub } from "./github-DVvoAF69.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/source-panel-Cc4s05EQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Tabs = Root2;
function TabsList({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
		className: cn("flex min-w-0 gap-1 overflow-x-auto border-b border-border px-3 py-2", className),
		...props
	});
}
function TabsTrigger({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		className: cn("h-10 shrink-0 rounded-md px-3 font-mono text-[11px] tracking-wide uppercase text-fg-muted", "hover:text-fg data-[state=active]:bg-bg-subtle data-[state=active]:text-fg", className),
		...props
	});
}
function TabsContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
		className: cn("outline-none", className),
		...props
	});
}
var FALLBACK = [
	{
		name: "abi",
		excerpt: "Nightly Rust framework for agent orchestration, WDBX semantic storage, and claim-honest capability reporting. The Zig tree has been removed.",
		htmlUrl: "https://github.com/donaldfilimon/abi"
	},
	{
		name: "wdbx",
		excerpt: "Provenance-aware episodic substrate extracted from donaldfilimon/abi on 2026-08-22 with history preserved. Memory is not a database lookup.",
		htmlUrl: "https://github.com/donaldfilimon/wdbx"
	},
	{
		name: "abbey",
		excerpt: "CLI/TUI companion that will not claim what the ledger cannot prove. Canonical capability ledger lives in src/claims.rs.",
		htmlUrl: "https://github.com/donaldfilimon/abbey"
	},
	{
		name: "skill-creator",
		excerpt: "Public agent skill for creating skills and shipping the company site without breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts.",
		htmlUrl: "https://github.com/donaldfilimon/skill-creator"
	}
];
function relFetched(iso) {
	if (!iso) return null;
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return null;
	const minutes = Math.max(0, Math.round((Date.now() - then) / 6e4));
	if (minutes < 1) return "just now";
	if (minutes === 1) return "1 min ago";
	if (minutes < 60) return `${minutes} min ago`;
	return `${Math.round(minutes / 60)}h ago`;
}
function GithubStatusLine() {
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [when, setWhen] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		loadGithub().then((payload) => {
			if (cancelled) return;
			setWhen(relFetched(payload.fetchedAt));
			setStatus(payload.readmes.length ? "live" : "local");
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-6 font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase",
		role: "status",
		children: status === "loading" ? "Asking GitHub…" : status === "live" ? `Live READMEs from donaldfilimon${when ? ` · ${when}` : ""}` : "GitHub did not answer · local excerpts"
	});
}
function SourcePanel() {
	const [cards, setCards] = (0, import_react.useState)(FALLBACK);
	const [live, setLive] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [fetchedAt, setFetchedAt] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		loadGithub().then((payload) => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0 overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[10px] tracking-[0.16em] text-accent uppercase",
					children: status === "loading" ? "asking GitHub…" : live ? "live README" : "local excerpt"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[10px] text-fg-subtle",
					children: status === "live" && when ? `donaldfilimon · ${when}` : "donaldfilimon"
				})]
			}),
			status === "local" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border-b border-border px-4 py-2 text-xs text-fg-muted",
				children: "GitHub did not answer. Showing the last verified excerpts. Product pages stay on this site."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: first,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsList, {
					"aria-label": "Repositories",
					children: cards.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: item.name,
						children: item.name
					}, item.name))
				}), cards.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: card.name,
					className: "p-5 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-2xl tracking-tight",
							children: card.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted",
							children: card.excerpt
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: pathForRepo(card.name),
							className: "mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent",
							children: ["Open ", card.name]
						})
					]
				}, card.name))]
			}, first)
		]
	});
}
//#endregion
export { SourcePanel as n, GithubStatusLine as t };
