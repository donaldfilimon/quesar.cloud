import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { et as integrityRules } from "./router-CTU_BGql.mjs";
import { p as Surface, r as CodeBlock, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, f as PageClose, l as IntegrityList } from "./catalog-mPups2gl.mjs";
import { t as Label$1 } from "./label-BdJrkPew.mjs";
import { t as Textarea } from "./textarea-1mlne-9h.mjs";
import { t as Input } from "./input-CLuOZ_Uu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/skill-creator-46U63WJM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SkillCreatorPage() {
	const [name, setName] = (0, import_react.useState)("site-integrity");
	const [purpose, setPurpose] = (0, import_react.useState)("Ship the company site without breaking Apple framing or provenance tags.");
	const skill = (0, import_react.useMemo)(() => `---
name: ${name || "untitled"}
description: ${purpose || "Describe the skill."}
---

# ${name || "untitled"}

${purpose}

## Integrity
- Use the approved Apple sentence only.
- Tag figures measured / target / reported.
- ABI is nightly Rust. Do not mix Zig-era claims.
- Do not invent WDBX recall, QPS, or latency.
`, [name, purpose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "skill-creator",
			title: "The same rules this site is written under.",
			lede: "Public agent skill for creating skills and shipping the company site without breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "current" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Compose",
			title: "A skill file, in the browser.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
						htmlFor: "skill-name",
						children: "Name"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "skill-name",
						className: "mt-1",
						value: name,
						onChange: (event) => setName(event.target.value.slice(0, 64))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
						htmlFor: "skill-purpose",
						className: "mt-4",
						children: "Purpose"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						id: "skill-purpose",
						className: "mt-1 bg-bg",
						value: purpose,
						onChange: (event) => setPurpose(event.target.value.slice(0, 280))
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
					code: skill,
					label: "SKILL.md"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Rules",
			title: "Copied from the public skill.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrityList, { rules: integrityRules })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/plugins",
				label: "Plugins"
			},
			next: [{
				to: "/docs",
				label: "Docs",
				body: "The same integrity language, as articles."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Other surfaces that follow these rules."
			}]
		})
	] });
}
//#endregion
export { SkillCreatorPage as component };
