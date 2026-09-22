import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { j as startJourneys } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/get-started-B0Gb2kop.js
var import_jsx_runtime = require_jsx_runtime();
function GetStartedPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Get started",
			title: "Pick a journey. Stay here.",
			lede: "Orientation on this site. Setup commands live on the matching app and docs pages — not as a redirect away."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: startJourneys.map((item) => ({
			title: item.title,
			body: item.description,
			kicker: item.availability,
			note: item.prerequisites,
			href: item.href
		})) }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/docs/getting-started",
				label: "Docs: getting started"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Click a node for current versus not claimed."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Working orientations of the shipping surfaces."
			}]
		})
	] });
}
//#endregion
export { GetStartedPage as component };
