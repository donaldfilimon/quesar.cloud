import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { y as appSurfaces } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/apps-D00kUhwI.js
var import_jsx_runtime = require_jsx_runtime();
function AppsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Apps",
			title: "Every surface, in this site.",
			lede: "The shipping apps run on your machine. These pages are working orientations — documents, vaults, routers, and studios — so you do not have to leave for GitHub to see what they are."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: appSurfaces.map((app) => ({
			title: app.name,
			body: app.body,
			kicker: app.kicker,
			status: app.status,
			href: app.path
		})) }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			next: [
				{
					to: "/workspace",
					label: "Workspace",
					body: "Documents on this machine."
				},
				{
					to: "/console",
					label: "Field notes",
					body: "Sign in and save what is current versus not claimed."
				},
				{
					to: "/developers",
					label: "Developers",
					body: "Live READMEs when GitHub answers."
				}
			]
		})
	] });
}
//#endregion
export { AppsPage as component };
