import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _ as ProvTag, tt as investor } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as about } from "./about-miNX_GPR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/financial-model-DbNZCJZC.js
var import_jsx_runtime = require_jsx_runtime();
function FinancialModelPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Financial model",
			title: "Targets, written as targets.",
			lede: "ARR, unit economics, and TAM figures on this page are tagged. Do not cite them as bookings.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Thesis",
			title: "Why on-device changes the cost curve.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-3",
				children: about.investorThesis.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-xl",
					children: card.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-fg-muted",
					children: card.description
				})] }, card.title))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "ARR",
			title: "Projection, not revenue.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-5",
				children: investor.arr.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "surface p-4 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] uppercase text-fg-subtle",
						children: row.year
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-display text-2xl tabular",
						children: [
							"$",
							row.v,
							"M"
						]
					})]
				}, row.year))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/investors",
				label: "Investor notes"
			},
			next: [{
				to: "/company",
				label: "Company",
				body: "Registration-level facts beside the model."
			}]
		})
	] });
}
//#endregion
export { FinancialModelPage as component };
