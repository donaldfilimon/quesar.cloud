import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as ChipCutaway } from "./chip-cutaway-Cx-Jpi1M.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.explainer-CdJD6Pao.js
var import_jsx_runtime = require_jsx_runtime();
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Explainer",
			title: "Storage. Compute. Application.",
			lede: "WDBX, ABI, Abbey. Select a die.",
			atmosphere: "plates"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipCutaway, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/platform",
				label: "Platform"
			},
			secondary: [{
				to: "/showcase",
				label: "Showcase"
			}],
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "The same stack, named as nodes."
			}]
		})
	] });
}
//#endregion
export { Page as component };
