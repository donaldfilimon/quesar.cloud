import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { pt as searchIndex, y as appSurfaces } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, t as AppLink } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/links-WWiwomlt.js
var import_jsx_runtime = require_jsx_runtime();
function LinksPage() {
	const groups = /* @__PURE__ */ new Map();
	for (const item of searchIndex) {
		const list = groups.get(item.group) ?? [];
		list.push({
			title: item.title,
			href: item.href
		});
		groups.set(item.group, list);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Links",
			title: "The map of this site.",
			lede: "Every public page and in-browser app, grouped. Nothing here sends you to GitHub."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-10 md:grid-cols-2",
				children: [...groups.entries()].map(([group, items]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
					children: group
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
						to: item.href,
						className: "text-sm text-fg-muted no-underline hover:text-fg",
						children: item.title
					}) }, item.href))
				})] }, group))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-10 font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Apps"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-wrap gap-3",
				children: appSurfaces.map((app) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
					to: app.path,
					className: "text-sm text-accent",
					children: app.name
				}) }, app.id))
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/",
				label: "Home"
			},
			next: [{
				to: "/apps",
				label: "Apps",
				body: "Working orientations of the same names."
			}]
		})
	] });
}
//#endregion
export { LinksPage as component };
