import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { k as products, o as Route$11 } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { _ as TruthList, d as NamedGrid, f as PageClose, o as CopyGrid, r as ChipRow } from "./catalog-mPups2gl.mjs";
import { t as PersonaRouter } from "./persona-router-UPXFZW5p.mjs";
import { n as Equation } from "./article-Cq5ndJM_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/products._slug-DFB4PfGb.js
var import_jsx_runtime = require_jsx_runtime();
function ProductPage() {
	const { slug } = Route$11.useParams();
	const product = products.find((item) => item.slug === slug);
	if (!product) throw notFound();
	const accent = product.accent === "aviva" ? "abi" : product.accent;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: product.kicker,
			title: product.name,
			lede: product.intro
		}),
		product.sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: section.eyebrow,
			title: section.title,
			lede: section.sub,
			children: [
				section.paragraphs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted sm:text-base",
					children: p
				}, p.slice(0, 40))),
				section.equations?.map((eq) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Equation, {
					tex: eq.tex,
					note: eq.note
				}, eq.tex)),
				section.blendTable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
						items: section.blendTable.map((row) => ({
							name: row.range,
							body: row.meaning
						})),
						columns: ""
					})
				}) : null,
				section.pillars ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, {
						items: section.pillars.map((pillar) => ({
							title: pillar.title,
							body: pillar.description,
							note: pillar.eq,
							accent: pillar.accent === "aviva" ? "abi" : pillar.accent
						})),
						columns: "md:grid-cols-3"
					})
				}) : null,
				section.steps ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruthList, { items: section.steps.map((step) => ({
						n: step.n,
						title: step.title,
						body: step.description
					})) })
				}) : null,
				section.demo === "persona-router" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaRouter, {})
				}) : null,
				section.demo === "cosine-sim" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					accent,
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-sm",
						children: "cos(θ) = (A · B) / (‖A‖ ‖B‖)"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: "Configuration fact for the active crate, not a recall scoreboard."
					})]
				}) : null,
				section.demo === "sharding-latency" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-fg-muted",
						children: "Reference cluster replication exists in source. It does not establish production sharding or a latency SLA."
					})
				}) : null,
				section.chips ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { items: section.chips })
				}) : null
			]
		}, section.title)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/products",
				label: "All products"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Place this product on the stack."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Working orientations of the same names."
			}]
		})
	] });
}
//#endregion
export { ProductPage as component };
