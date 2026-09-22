import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { gt as showcaseRooms } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
import { t as Trailer } from "./trailer-ByVOpF8h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase-bLlmgMrG.js
var import_jsx_runtime = require_jsx_runtime();
function ShowcasePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Showcase",
			title: "Look, then inspect.",
			lede: "Atmosphere is not evidence. The film is orientation. Status lives on the product pages."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trailer, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-10",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, {
				items: showcaseRooms.map((room) => ({
					title: room.title,
					body: room.body,
					href: room.href
				})),
				columns: "sm:grid-cols-2 lg:grid-cols-3"
			})
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			next: [{
				to: "/quesar",
				label: "Quesar",
				body: "The product that the film orients."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Working surfaces, not stills."
			}]
		})
	] });
}
//#endregion
export { ShowcasePage as component };
