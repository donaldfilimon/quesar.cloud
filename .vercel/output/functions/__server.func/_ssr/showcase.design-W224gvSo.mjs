import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { h as Logo } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { d as NamedGrid, f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.design-W224gvSo.js
var import_jsx_runtime = require_jsx_runtime();
var tokens = [
	{
		name: "accent",
		body: "Cool metal. Primary action, not a glow."
	},
	{
		name: "abi",
		body: "Violet. Product orchestration — not the Abi persona."
	},
	{
		name: "wdbx",
		body: "Emerald. Memory substrate."
	},
	{
		name: "abbey",
		body: "Warm rose. Companion product — Abbey persona is a separate axis."
	}
];
var swatch = {
	accent: "bg-accent",
	abi: "bg-abi",
	wdbx: "bg-wdbx",
	abbey: "bg-abbey"
};
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Design",
			title: "Tokens, not a theme pack.",
			lede: "Cyan, violet, emerald — product accents and persona colors stay on separate axes."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg-muted",
					children: "The M in the mark is a weighted directed graph."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-16 rounded-md ${swatch[token.name]}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-[11px] uppercase",
					children: token.name
				})] }, token.name))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 font-display text-4xl italic",
				children: "Private intelligence, built around you."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
					items: tokens,
					columns: "sm:grid-cols-2"
				})
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/showcase",
				label: "Showcase"
			},
			next: [{
				to: "/",
				label: "Home",
				body: "The same tokens on the live product."
			}]
		})
	] });
}
//#endregion
export { Page as component };
