import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { b as frozenCli } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, d as NamedGrid, f as PageClose, r as ChipRow } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plugins-Cg0ch_vo.js
var import_jsx_runtime = require_jsx_runtime();
var packs = [
	{
		name: "claims",
		body: "Ledger language, status labels, and refusal copy used across Abbey and this site."
	},
	{
		name: "wdbx-tools",
		body: "Scripts consumed by ABI sync. Not a hosted plugin store."
	},
	{
		name: "site-integrity",
		body: "Apple sentence, provenance tags, Apache-2.0, toolchain facts."
	},
	{
		name: "mcp-allowlist",
		body: "Contract-covered tool names. Unknown tools fail closed."
	}
];
function PluginsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Plugins",
			title: "Skills the runtime actually loads.",
			lede: "abi-mega: skills, assets, and scripts consumed by /sync-clis. Founder tooling, not a hosted marketplace.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "partial" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
				items: packs,
				nameClass: "text-abi"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-10 font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Frozen CLI surface"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { items: frozenCli })
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/skill-creator",
				label: "skill-creator"
			},
			secondary: [{
				to: "/abi",
				label: "ABI"
			}],
			next: [{
				to: "/apps",
				label: "Apps",
				body: "Other founder and product surfaces."
			}]
		})
	] });
}
//#endregion
export { PluginsPage as component };
