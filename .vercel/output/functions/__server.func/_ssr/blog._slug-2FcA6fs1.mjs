import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { N as blog, c as Route$14 } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as ArticleBody } from "./article-Cq5ndJM_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/blog._slug-2FcA6fs1.js
var import_jsx_runtime = require_jsx_runtime();
function BlogPost() {
	const { slug } = Route$14.useParams();
	const post = blog.find((item) => item.slug === slug);
	if (!post) throw notFound();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: `${post.tag} · ${post.date}`,
			title: post.title,
			lede: post.excerpt,
			atmosphere: "lab"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArticleBody, { sections: post.body }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/blog",
				label: "All notes"
			},
			next: [{
				to: "/research",
				label: "Research",
				body: "The papers these notes sit beside."
			}]
		})
	] });
}
//#endregion
export { BlogPost as component };
