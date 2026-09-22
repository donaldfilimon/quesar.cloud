import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as WorkspaceApp } from "./workspace-app-CQXFdjYw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-CX1K4_o7.js
var import_jsx_runtime = require_jsx_runtime();
function WorkspacePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Workspace",
			title: "Documents, on this machine.",
			lede: "The shipping Abbey workspace runs locally with SQLite, Better Auth, a Python worker, and an agent package. This page is the in-browser orientation of that loop.",
			atmosphere: "lab",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, {
				status: "current",
				note: "Notes stay in this browser. Live model requires sign-in."
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceApp, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/abbey",
				label: "Abbey"
			},
			secondary: [{
				to: "/console",
				label: "Field notes"
			}],
			next: [{
				to: "/developers",
				label: "Developers",
				body: "Setup lives with the source."
			}]
		})
	] });
}
//#endregion
export { WorkspacePage as component };
