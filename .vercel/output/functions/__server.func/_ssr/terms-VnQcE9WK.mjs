import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/terms-VnQcE9WK.js
var import_jsx_runtime = require_jsx_runtime();
function TermsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Terms",
			title: "This site orients. It does not host your sessions.",
			lede: "Last updated 22 September 2026. These terms cover the public website and in-browser app orientations.",
			atmosphere: "none"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-3xl space-y-6 text-sm leading-relaxed text-fg-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Machine Learning Advanced Innovations, Inc. (“MLAI”) provides this website as orientation for Quesar, ABI, WDBX, Abbey, and related public work. It is not a hosted assistant, not a production API, and not a substitute for the local applications described on the app pages." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "In-browser workspaces, vaults, and studios store data in your browser unless you sign in to the field console, in which case notes are scoped to your account. Do not place secrets, regulated corpora, or production credentials here." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Public source is described on this site. Core runtimes are Apache-2.0 as stated in each tree. Status labels (Current, Partial, Experimental, Planned, Research) mean what the status page says they mean." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "MLAI software is independent and is not affiliated with, endorsed by, or sponsored by Apple Inc." })
			]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/privacy",
				label: "Privacy"
			},
			secondary: [{
				to: "/security",
				label: "Security"
			}]
		})
	] });
}
//#endregion
export { TermsPage as component };
