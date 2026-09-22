import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { ct as quesarWhat, st as quesarSurfaces } from "./router-CTU_BGql.mjs";
import { f as StepList, r as CodeBlock, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { f as PageClose, o as CopyGrid, s as DataTable } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/quesar-DxHEbj49.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function scaffold(prompt) {
	const safe = (prompt.trim().slice(0, 48) || "Studio site").replace(/[<>]/g, "");
	return `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${safe}</title>
<style>
  :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; background: #07090d; color: #eef1f5; }
  main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem; }
  p.k { font: 500 11px/1 ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; color: #6ecad8; }
  h1 { font-family: Georgia, serif; font-size: 2.4rem; letter-spacing: -0.03em; }
  .card { border: 1px solid rgba(238,241,245,.1); border-radius: 16px; padding: 1.1rem 1.2rem; margin-top: 1rem; }
  .muted { color: #8b96a4; line-height: 1.55; }
</style>
<main>
  <p class="k">Quasar local preview</p>
  <h1>${safe}</h1>
  <p class="muted">Generated in the browser as an orientation of the local builder. The shipping v1 writes a Next.js project to disk via the Bun service — it does not host, deploy, or bill.</p>
  <div class="card"><p class="muted">${prompt.replace(/[<>]/g, "").slice(0, 280) || "Describe a site to see the scaffold."}</p></div>
</main>
</html>`;
}
function QuasarStudio() {
	const [prompt, setPrompt] = (0, import_react.useState)("A lab notebook for private retrieval experiments, with a claims legend.");
	const html = (0, import_react.useMemo)(() => scaffold(prompt), [prompt]);
	const src = (0, import_react.useMemo)(() => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`, [html]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
					children: "Studio"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-2 font-display text-2xl",
					children: "Prompt to a preview."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-fg-muted",
					children: "Browser scaffold only. Real generation needs the local Bun service and Anthropic credentials."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: prompt,
					onChange: (event) => setPrompt(event.target.value.slice(0, 500)),
					className: "mt-4 min-h-32 w-full rounded-md bg-bg px-3 py-3 text-sm shadow-[var(--shadow-border)] outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					className: "mt-3",
					onClick: () => setPrompt((p) => p.trim() || p),
					children: "Refresh preview"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "overflow-hidden rounded-[18px] bg-bg shadow-[var(--shadow-border)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border-b border-border px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase",
				children: "next dev · local"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
				title: "Quasar preview",
				src,
				className: "h-[28rem] w-full bg-bg"
			})]
		})]
	});
}
function QuesarPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Quesar",
			title: "Infrastructure for private, persistent, adaptive AI.",
			lede: "Quesar is the product experience that connects ABI, WDBX, and Abbey. It is not a chatbot, not a vector database, and not a hosted wrapper around a public model.",
			atmosphere: "wafer",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "partial" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-fg-muted",
					children: "Public orientation and a signed-in console are current. Hosted assistant sessions are not."
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "What it is",
			title: "A system you can place, inspect, and bound.",
			lede: "Quesar exists because intelligence that forgets you at the end of every session is not a foundation you can build on — and intelligence that requires you to surrender memory to a remote cluster is not a foundation you should have to accept.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: quesarWhat })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Name",
			title: "Quesar is the product. Quasar is the local builder.",
			lede: "They are not interchangeable. The integration repository keeps the builder at apps/quasar and the production website at apps/quasar-web.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: [{
				title: "Quesar",
				body: "The infrastructure product: orchestration, private memory, local compute. This site is orientation for that product.",
				accent: "accent"
			}, {
				title: "Quasar",
				body: "A local v1 website builder: generate a Next.js project and preview it on your own machine. Bun 1.4, Anthropic credentials, a service and Expo app. Hosting, deploy adapters, and builder authentication are outside this version."
			}] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Quasar v1",
			title: "Four parts. Preview means next dev on your machine.",
			lede: "From the integration README. Unit suite is not a live Anthropic generation.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepList, { steps: [
					{
						title: "packages/shared",
						body: "TypeScript types and zod schemas shared by the service and the Expo app — Site, GenerationEvent, PreviewStatus, request bodies."
					},
					{
						title: "packages/service",
						body: "Local Bun service (default port 4700): registry, path guard, site filesystem tools, generation engine, scaffolder, preview manager."
					},
					{
						title: "templates/next-site",
						body: "A buildable, checked-in Next.js 16 + Tailwind v4 starter, copied per-site as the generation baseline. Own lockfile, outside the root workspace."
					},
					{
						title: "apps/quasar",
						body: "Expo SDK 53 app that drives the local service. There is no deploy step in v1."
					}
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						label: "apps/quasar",
						code: `bun run dev:quasar
# LAN service has no auth — trusted network only
# see apps/quasar/README.md#how-to-run`
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuasarStudio, {})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Surfaces",
			title: "What exists in public source today.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				rows: quesarSurfaces,
				rowKey: (row) => row.surface,
				columns: [
					{
						header: "Surface",
						cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: row.surface
						})
					},
					{
						header: "Role",
						className: "text-fg-muted",
						cell: (row) => row.role
					},
					{
						header: "Status",
						cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: row.status })
					}
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm text-fg-subtle",
				children: [
					"The builder service listens on the LAN without authentication — run it only on a network you trust. In-browser studio above. Setup notes:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/docs/$slug",
						params: { slug: "getting-started" },
						className: "text-accent",
						children: "getting started"
					}),
					"."
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Next",
			title: "Inspect the layers.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/architecture",
						children: "Architecture"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/platform",
						children: "Platform"
					})
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, { next: [{
			to: "/wdbx",
			label: "WDBX",
			body: "The memory substrate under the product."
		}, {
			to: "/abi",
			label: "ABI",
			body: "Nightly Rust orchestration."
		}] })
	] });
}
//#endregion
export { QuesarPage as component };
