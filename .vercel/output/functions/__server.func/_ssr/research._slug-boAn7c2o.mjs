import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { P as research, i as Route$9 } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, n as BulletSurface } from "./catalog-mPups2gl.mjs";
import { r as SourceChips, t as ArticleBody } from "./article-Cq5ndJM_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/research._slug-boAn7c2o.js
var import_jsx_runtime = require_jsx_runtime();
function ResearchPaper() {
	const { slug } = Route$9.useParams();
	const paper = research.publications.find((item) => item.slug === slug);
	if (!paper) throw notFound();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: `${paper.tag} · ${paper.status}`,
			title: paper.title,
			lede: paper.abstract,
			atmosphere: "board"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-8 grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
					children: "Practical summary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-fg-muted",
					children: paper.practicalSummary
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
						children: "Status"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: paper.statusNote
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-[11px] text-fg-subtle",
						children: ["Reviewed ", paper.reviewedAt]
					})
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArticleBody, { sections: paper.body }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-10 font-display text-xl",
				children: "Limitations"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletSurface, { items: paper.limitations })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceChips, { sources: paper.sources.map((s) => ({
				title: s.title,
				url: s.url,
				scope: s.kind
			})) })
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/research",
				label: "Research index"
			},
			next: [{
				to: "/docs",
				label: "Docs",
				body: "Implementation notes for the same stack."
			}]
		})
	] });
}
//#endregion
export { ResearchPaper as component };
