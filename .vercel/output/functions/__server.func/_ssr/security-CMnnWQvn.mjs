import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/security-CMnnWQvn.js
var import_jsx_runtime = require_jsx_runtime();
function SecurityPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Security",
			title: "Responsible language. Documented hazards.",
			lede: "We do not describe Quesar as 100% private, completely secure, military-grade, or unhackable. Security claims track source, tests, and operator choices."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "What we will say",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "max-w-2xl space-y-3 text-sm leading-relaxed text-fg-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Ed25519 signatures and SHA-256 content addressing are used on WDBX transaction and segment objects where implemented." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "ABI workers describe authenticated, audience-bound admission with finite leases and replay resistance as contracts — not as a deployed cluster." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Abbey daemon authentication uses a local bearer token on a Unix socket when that surface is run." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "GPU capability reporting is honest about missing kernels rather than implying acceleration that is not linked." })
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "What we will not say",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "max-w-2xl space-y-3 text-sm leading-relaxed text-fg-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "That the reference cluster protocol is production sharding." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "That FHE reference paths, AES/RBAC, or key rotation are complete products." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "That the local site builder is safe to expose beyond a trusted LAN." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "That storing a record makes it true, or that a signature makes a deployment federated." })
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/contact",
				label: "Contact"
			},
			next: [{
				to: "/privacy",
				label: "Privacy",
				body: "What this site stores, and what it does not."
			}]
		})
	] });
}
//#endregion
export { SecurityPage as component };
