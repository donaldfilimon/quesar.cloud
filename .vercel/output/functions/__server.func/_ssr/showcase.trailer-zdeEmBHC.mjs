import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as Trailer } from "./trailer-ByVOpF8h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.trailer-zdeEmBHC.js
var import_jsx_runtime = require_jsx_runtime();
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Trailer",
			title: "The short cut.",
			lede: "Played here. Not a hosted campaign site.",
			atmosphere: "wafer"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trailer, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/showcase",
				label: "Showcase"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Click a node for current versus not claimed."
			}, {
				to: "/quesar",
				label: "Quesar",
				body: "The product the trailer orients."
			}]
		})
	] });
}
//#endregion
export { Page as component };
