import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as ArchitectureDiagram } from "./architecture-diagram-6BkP2AZR.mjs";
import { t as RepoList } from "./repo-list-CMBRkS91.mjs";
import { t as ChipCutaway } from "./chip-cutaway-Cx-Jpi1M.mjs";
import { t as Trailer } from "./trailer-ByVOpF8h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/showcase.mega-bCqDlynb.js
var import_jsx_runtime = require_jsx_runtime();
function Page() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Mega",
			title: "The whole board.",
			lede: "Film, chip, architecture, source. Still not a hosted session."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trailer, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipCutaway, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureDiagram, { compact: true })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepoList, { compact: true })
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/",
				label: "Home"
			},
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Inspect a node."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Live READMEs when GitHub answers."
			}]
		})
	] });
}
//#endregion
export { Page as component };
