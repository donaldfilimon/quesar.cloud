import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/privacy-Fpf1hXVE.js
var import_jsx_runtime = require_jsx_runtime();
function PrivacyPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Privacy",
			title: "This site does not take your data because it cannot.",
			lede: "The public Quesar website is orientation plus an optional console for field notes. It does not host assistant sessions, accept document uploads, or run generation. Product privacy lives in the architecture you run locally."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			title: "What this website collects",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-sm leading-relaxed text-fg-muted",
				children: "This product site stores a theme preference in your browser when you toggle light or dark. If you sign in, it stores an account and the field notes you write in the console. Notes are scoped to your account on the server. They are not Abbey memory and not a hosted WDBX store. If you click through to GitHub, GitHub's own policies apply. Optional live repository metadata is requested from GitHub's public API in your browser; if that request fails, the page falls back to verified links with no statistics."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl text-sm leading-relaxed text-fg-muted",
				children: "We do not invent a hosted analytics program here. If this deployment injects platform tooling outside MLAI's source, that tooling is not an MLAI product claim."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Product",
			title: "Mechanisms, with scope.",
			lede: "Privacy in Quesar is a set of placement and inspection choices — not a promise that a system is unhackable.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid gap-3 md:grid-cols-2",
				children: [
					{
						title: "Local processing",
						body: "ABI, Abbey, and WDBX are built to run on operator-owned machines. Cloud backends are optional."
					},
					{
						title: "Operator-owned memory",
						body: "WDBX stores, episodes, evidence payloads, credentials, and runtime data stay private to their owners. Public repos are source, not a hosted database."
					},
					{
						title: "Controlled writes",
						body: "Persistence that is skipped or unavailable is not reported as a successful write. Admission checks reject replay and stale policy/consent bindings."
					},
					{
						title: "Provenance",
						body: "Content addressing and signatures support later inspection. They do not make a stored statement true."
					},
					{
						title: "Permissions",
						body: "Local builder has no authentication and binds to the LAN. That is a documented hazard, not a privacy feature. Run it on a trusted network."
					},
					{
						title: "Model selection",
						body: "Local models are optional. Live providers require stored credentials. This website does not broker them."
					}
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg bg-bg-elevated p-5 shadow-[var(--shadow-border)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base font-semibold",
						children: item.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: item.body
					})]
				}, item.title))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/security",
				label: "Security"
			},
			secondary: [{
				to: "/architecture",
				label: "Architecture"
			}],
			next: [{
				to: "/terms",
				label: "Terms",
				body: "The same limits, as a contract."
			}]
		})
	] });
}
//#endregion
export { PrivacyPage as component };
