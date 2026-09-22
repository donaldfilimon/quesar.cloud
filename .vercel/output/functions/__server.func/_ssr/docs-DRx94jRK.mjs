import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { D as docs } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/docs-DRx94jRK.js
var import_jsx_runtime = require_jsx_runtime();
var docNav = [
	{
		group: "Start",
		items: [{
			id: "intro",
			label: "Introduction",
			description: "Build private, traceable AI workflows on the ABI runtime with retrieval provenance, policy-gated agents, and audit trails.",
			body: "MLAI developer platform documentation introduction overview"
		}, {
			id: "runtime",
			label: "ABI Runtime",
			description: "Rust framework for local AI orchestration, semantic vector storage, and GPU capability reporting.",
			body: "abi-cli abi-mcp abi-ai abi-sea abi-wdbx abi-gpu tools/cargo.sh tools/check.sh backends dashboard"
		}]
	},
	{
		group: "Security & trust",
		items: [{
			id: "trust",
			label: "Security & trust",
			description: "WorkOS AuthKit sessions, rate-limited public inquiries, and evaluation gates before autonomous write or external tool calls.",
			body: "authentication WorkOS AuthKit rate limit evaluation gates fail closed"
		}]
	},
	{
		group: "Architecture",
		items: [
			{
				id: "personas",
				label: "Persona Routing",
				description: "Abbey, Aviva, and Abi as distinct interaction roles with policy-weighted routing — not three separately deployed commercial services.",
				body: "Abbey Aviva Abi persona routing governance empathy expert"
			},
			{
				id: "wdbx",
				label: "WDBX Retrieval",
				description: "Inspectable nearest-neighbor retrieval from the active Rust substrate (layered HNSW, MVCC).",
				body: "WDBX HNSW MVCC cosine SIMD vector search backtrace provenance abi-wdbx"
			},
			{
				id: "wdbx-v2",
				label: "WDBX V2 Docs",
				description: "Frozen Zig-era documentation mirror retained for historical reference — not the current Rust implementation guide.",
				body: "historical Zig mirror protocols documentation attachment PDF"
			},
			{
				id: "mcp",
				label: "MCP Server",
				description: "JSON-RPC 2.0 over stdio with an optional loopback HTTP listener for local tool handlers.",
				body: "MCP JSON-RPC stdio ai_learn ai_complete wdbx_query gpu_status plugin_list"
			}
		]
	},
	{
		group: "Operations",
		items: [{
			id: "deployment",
			label: "Deployment",
			description: "Checklist for packaging orchestration, retrieval, audit logs, and controls across deployment targets.",
			body: "deployment cloud VPC on-premise offline-first private runtime"
		}]
	},
	{
		group: "Reference",
		items: [{
			id: "api",
			label: "Protected API",
			description: "Console and API surfaces that require an invited organization session and fail closed without credentials.",
			body: "console API session ADMIN_EMAILS protected routes"
		}]
	}
];
function slugFor(id) {
	return id === "intro" ? "getting-started" : id;
}
function DocsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Docs",
			title: "Start with the source. Stay on the site.",
			lede: "Sidebar, search, and articles are the same corpus. Setup commands are copied from READMEs. A successful gate is evidence for that checkout — not for a hosted product."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				"aria-label": "Docs",
				children: docNav.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
						children: group.group
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-1",
						children: group.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/docs/$slug",
							params: { slug: slugFor(item.id) },
							className: "flex min-h-11 items-center text-sm text-fg-muted no-underline hover:text-fg",
							children: item.label
						}) }, item.id))
					})]
				}, group.group))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4",
				children: docs.map((doc) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: doc.slug === "getting-started" ? "intro" : doc.slug,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
							children: doc.group
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-2 font-display text-2xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/docs/$slug",
								params: { slug: doc.slug },
								className: "text-fg no-underline hover:underline",
								children: doc.title
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg-muted",
							children: doc.description
						})
					] })
				}, doc.slug))
			})]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/get-started",
				label: "Get started"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "The same layers, as a diagram."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Live READMEs when GitHub answers."
			}]
		})
	] });
}
//#endregion
export { DocsPage as component };
