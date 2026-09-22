import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, m as PersonaGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.abbey-W4kroD4R.js
var import_jsx_runtime = require_jsx_runtime();
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Abbey",
			title: "Care first. Clarity always. Competence throughout.",
			lede: "Personas, not products. The ABI product is violet; the Abi persona is cyan.",
			atmosphere: "lab"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaGrid, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/abbey",
				label: "Abbey product"
			},
			secondary: [{
				to: "/showcase",
				label: "Showcase"
			}],
			next: [{
				to: "/demo",
				label: "Persona demo",
				body: "Watch Abi score the blend coefficient."
			}]
		})
	] });
}
//#endregion
export { Page as component };
