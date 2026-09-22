import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { p as Surface, r as CodeBlock } from "./section-MuxObx9K.mjs";
import { t as AppLink } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/article-Cq5ndJM_.js
var import_jsx_runtime = require_jsx_runtime();
function ArticleBody({ sections, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-3xl space-y-10",
		children: [sections.map((section, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
			section.heading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl tracking-tight",
				children: section.heading
			}) : null,
			section.paragraphs?.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm leading-relaxed text-fg-muted sm:text-base",
				children: p
			}, p.slice(0, 48))),
			section.list?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 space-y-2",
				children: section.list.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex gap-2 text-sm leading-relaxed text-fg-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-2 size-1.5 shrink-0 rounded-full bg-accent",
						"aria-hidden": "true"
					}), item]
				}, item))
			}) : null,
			section.math?.map((tex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-4 overflow-x-auto rounded-lg bg-bg-elevated px-4 py-3 font-mono text-[0.8rem] leading-7 text-fg shadow-[var(--shadow-border)]",
				children: tex
			}, tex)),
			section.code?.map((block, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
					code: block.code,
					label: block.file ?? block.lang ?? "source"
				})
			}, `${block.file ?? block.lang ?? "code"}-${i}`)),
			section.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-xs leading-relaxed text-fg-subtle",
				children: section.note
			}) : null
		] }, `${section.heading ?? "block"}-${index}`)), children]
	});
}
function SourceChips({ sources }) {
	if (!sources.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "mt-8 space-y-3",
		children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
				to: source.url,
				className: "text-sm font-medium text-accent no-underline hover:underline",
				children: source.title
			}), source.scope ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-fg-muted",
				children: source.scope
			}) : null]
		}, source.title))
	});
}
function Equation({ tex, note }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "mt-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-x-auto font-mono text-[0.85rem] leading-7 text-fg",
			children: tex
		}), note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-sm leading-relaxed text-fg-muted",
			children: note
		}) : null]
	});
}
//#endregion
export { Equation as n, SourceChips as r, ArticleBody as t };
