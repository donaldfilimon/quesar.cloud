import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as RepoList } from "./repo-list-CMBRkS91.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/source-Cp6f_Nmo.js
var import_jsx_runtime = require_jsx_runtime();
function SourceIndex() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Source",
			title: "The catalog stays here.",
			lede: "Public repositories, mapped to pages on this site. Live stars when GitHub answers. You do not need to leave to read what they are."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepoList, {}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/developers",
				label: "Developers"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Click a node for current versus not claimed."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Working orientations of the public tree."
			}]
		})
	] });
}
//#endregion
export { SourceIndex as component };
