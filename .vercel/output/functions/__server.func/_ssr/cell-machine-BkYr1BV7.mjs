import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as CellMachine } from "./cell-machine-Dhr3saX-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cell-machine-BkYr1BV7.js
var import_jsx_runtime = require_jsx_runtime();
function CellMachinePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Cell machine",
			title: "A grid that keeps its own time.",
			lede: "Conway-style cellular automaton, playable here. Research experiment. Not a Quesar product, not a hosted world, and not evidence of a shipped simulation engine.",
			atmosphere: "plates",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "research" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CellMachine, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/apps",
				label: "Apps"
			},
			next: [{
				to: "/source/cell-machine",
				label: "Source note",
				body: "The public tree this experiment belongs to."
			}, {
				to: "/research",
				label: "Research",
				body: "Other founder and lab work, labeled as such."
			}]
		})
	] });
}
//#endregion
export { CellMachinePage as component };
