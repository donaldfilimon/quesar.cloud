import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, t as AtmosphereMedia, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.film-BIDzztkZ.js
var import_jsx_runtime = require_jsx_runtime();
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Film",
			title: "Atmosphere, not a score.",
			lede: "A longer look at the lab. Nothing here is a latency claim.",
			atmosphere: "none"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative min-h-[22rem] overflow-hidden rounded-[24px] bg-bg-elevated",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtmosphereMedia, { still: "/media/atmosphere-lab.jpg" })
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/showcase",
				label: "Showcase"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Status lives on the diagram, not in the film."
			}]
		})
	] });
}
//#endregion
export { Page as component };
