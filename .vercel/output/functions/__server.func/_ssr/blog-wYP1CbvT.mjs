import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { N as blog } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/blog-wYP1CbvT.js
var import_jsx_runtime = require_jsx_runtime();
function BlogPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Blog",
			title: "Notes with their hedges left on.",
			lede: "Essays and engineering logs. If a figure appears, it is tagged or it does not ship."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, {
			columns: "md:grid-cols-1",
			items: blog.map((post) => ({
				title: post.title,
				body: post.excerpt,
				kicker: `${post.tag} · ${post.date} · ${post.readTime}`,
				href: `/blog/${post.slug}`
			}))
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, { next: [{
			to: "/research",
			label: "Research",
			body: "The longer notes with sources attached."
		}, {
			to: "/changelog",
			label: "Changelog",
			body: "What moved, with dates."
		}] })
	] });
}
//#endregion
export { BlogPage as component };
