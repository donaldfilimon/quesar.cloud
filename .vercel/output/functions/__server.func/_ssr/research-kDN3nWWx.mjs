import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { P as research, dt as researchSources, ft as researchTopics } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/research-kDN3nWWx.js
var import_jsx_runtime = require_jsx_runtime();
function ResearchPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Research",
			title: "Ideas with their evidence attached.",
			lede: "Explore assistant behavior, memory and retrieval, evidence selection, compute, integrations, and local interfaces. The public collection preserves citations, attachment metadata, provenance, and implementation limitations."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Topics",
			title: "Precise language. No borrowed benchmarks.",
			lede: "If a number is not produced by a repository test or a documented artifact, it does not appear here. Performance comparisons against other model vendors are not used.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: researchTopics.map((topic) => ({
				title: topic.title,
				body: `${topic.body} Applies to ${topic.applies}.`,
				status: topic.status
			})) })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Collection",
			title: "Notes, overviews, and implementation guides.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4",
				children: research.publications.map((paper) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/research/$slug",
					params: { slug: paper.slug },
					className: "no-underline",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						hover: true,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
								children: [
									paper.tag,
									" · ",
									paper.status,
									" · ",
									paper.readTime
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-2 font-display text-xl",
								children: paper.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed text-fg-muted",
								children: paper.abstract
							})
						]
					})
				}, paper.slug))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Sources",
			title: "Setup and claims, on this site.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: researchSources.map((source) => ({
				title: source.title,
				body: source.body,
				href: source.href
			})) })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, { next: [{
			to: "/developers",
			label: "Developers",
			body: "Run the gates that produce the evidence."
		}, {
			to: "/architecture",
			label: "Architecture",
			body: "Map topics onto the stack."
		}] })
	] });
}
//#endregion
export { ResearchPage as component };
