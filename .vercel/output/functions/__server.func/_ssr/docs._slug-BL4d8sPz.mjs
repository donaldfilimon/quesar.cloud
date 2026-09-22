import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { D as docs, s as Route$12 } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, p as Pager } from "./catalog-mPups2gl.mjs";
import { r as SourceChips, t as ArticleBody } from "./article-Cq5ndJM_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/docs._slug-BL4d8sPz.js
var import_jsx_runtime = require_jsx_runtime();
function DocArticle() {
	const { slug } = Route$12.useParams();
	const resolved = slug === "intro" ? "getting-started" : slug;
	const doc = docs.find((item) => item.slug === resolved);
	if (!doc) throw notFound();
	const idx = docs.findIndex((item) => item.slug === resolved);
	const prev = docs[idx - 1];
	const next = docs[idx + 1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: doc.group,
			title: doc.title,
			lede: doc.description,
			atmosphere: "none"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArticleBody, {
			sections: doc.body,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceChips, { sources: doc.sources })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pager, {
			index: {
				to: "/docs",
				label: "All docs"
			},
			prev: prev ? {
				to: `/docs/${prev.slug}`,
				label: `Previous: ${prev.title}`
			} : void 0,
			next: next ? {
				to: `/docs/${next.slug}`,
				label: `Next: ${next.title}`
			} : void 0
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			next: [{
				to: "/developers",
				label: "Developers",
				body: "The READMEs these articles cite."
			}]
		})
	] });
}
//#endregion
export { DocArticle as component };
