import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _ as ProvTag, xt as wdbxSpecs } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, u as MetricCard } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/benchmarks-CCe6CEId.js
var import_jsx_runtime = require_jsx_runtime();
function BenchmarksPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Benchmarks",
			title: "No borrowed numbers.",
			lede: "Graph defaults are configuration. Recall, QPS, and latency do not appear unless a named artifact produced them. Nothing on this page is a vendor comparison.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "measured" })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4 md:grid-cols-2",
			children: wdbxSpecs.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
				k: row.k,
				v: row.v
			}, row.k))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-8 max-w-2xl text-sm text-fg-muted",
			children: "Reproduce on your hardware. Record commit, toolchain, and output. A green web check is not GPU evidence."
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/research",
				label: "Research"
			},
			next: [{
				to: "/wdbx",
				label: "WDBX",
				body: "The substrate these configuration facts describe."
			}]
		})
	] });
}
//#endregion
export { BenchmarksPage as component };
