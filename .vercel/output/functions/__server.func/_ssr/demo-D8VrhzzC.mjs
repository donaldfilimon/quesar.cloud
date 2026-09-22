import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { d as NamedGrid, f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as PersonaRouter } from "./persona-router-UPXFZW5p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/demo-D8VrhzzC.js
var import_jsx_runtime = require_jsx_runtime();
function DemoPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Demo",
			title: "Watch Abi route in real time.",
			lede: "Type a message. A keyword-sentiment heuristic scores the blend coefficient α. The inspected local router uses deterministic rules; this demo is illustrative, not evidence of a learned classifier."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaRouter, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
				items: [
					{
						name: "α > 0.8",
						body: "Pure Abbey — empathetic, scaffolded."
					},
					{
						name: "0.2–0.8",
						body: "Blend — Aviva's facts, Abbey's voice, mixed by Abi."
					},
					{
						name: "α < 0.2",
						body: "Pure Aviva — concise, unfiltered."
					}
				],
				columns: "md:grid-cols-3"
			})
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/abbey-bot",
				label: "Companion thread"
			},
			next: [{
				to: "/abbey",
				label: "Abbey",
				body: "The product those personas sit inside."
			}, {
				to: "/architecture",
				label: "Architecture",
				body: "Where routing is named as a node."
			}]
		})
	] });
}
//#endregion
export { DemoPage as component };
