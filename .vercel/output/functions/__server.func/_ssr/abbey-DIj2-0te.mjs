import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { B as abbeyWorkspaceFacts, L as abbeyCommands, R as abbeyLedger, _ as ProvTag, q as companionPersonas, z as abbeyWorkflow } from "./router-CTU_BGql.mjs";
import { d as SpecList, r as CodeBlock, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { a as CommandList, f as PageClose, g as StatGrid, m as PersonaGrid, n as BulletSurface, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/abbey-DIj2-0te.js
var import_jsx_runtime = require_jsx_runtime();
function AbbeyPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Abbey",
			title: "Intelligence Without Limits — with a claims ledger.",
			lede: "Abbey is the human-facing surface on MLAI architecture. Simple picture first: a local workspace with assistant context. Technical picture: a claims-honest companion over ABI and WDBX. That line belongs to Abbey, not to Quesar. This website does not provision an assistant session.",
			atmosphere: "lab",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "current" })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Simple",
			title: "A local document workspace with assistant context.",
			lede: "The website-app in the integration repository is the workspace you run yourself. A local model is optional. Follow that app's own setup and account boundaries.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletSurface, { items: abbeyWorkspaceFacts }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/workspace",
						children: "Abbey workspace"
					})
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Personas",
			title: "Abbey, Aviva, Abi — profiles, not products.",
			lede: "Routing is a design mechanism described in the ABI tree. Per-persona quality is evaluated, not assumed. Product ABI is violet; persona Abi is cyan.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaGrid, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-sm text-fg-subtle",
					children: "The Abbey CLI uses a different persona axis — Gemma interprets, Max implements — carried by prompts under fm and abi backends. Those are not distinct models and not a second product line."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: companionPersonas.map((p) => ({
						title: p.name,
						body: p.body,
						kicker: "CLI persona"
					})) })
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Technical",
			title: "Companion, ledger, refusal.",
			lede: "The Abbey CLI/TUI is the companion that will not claim what the ledger cannot prove. WDBX is optional memory, off by default, with SQLite as the default store.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatGrid, {
					columns: "sm:grid-cols-5",
					cells: [
						{
							k: "Current",
							v: String(abbeyLedger.current)
						},
						{
							k: "Partial",
							v: String(abbeyLedger.partial)
						},
						{
							k: "Proposed",
							v: String(abbeyLedger.proposed)
						},
						{
							k: "Blocked",
							v: String(abbeyLedger.blocked)
						},
						{
							k: "Out of scope",
							v: String(abbeyLedger.outOfScope)
						}
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 mb-6 text-sm text-fg-muted",
					children: [
						"Enumerated with evidence in ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "font-mono",
							children: abbeyLedger.source
						}),
						", schema ",
						abbeyLedger.schema,
						", digest ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "font-mono text-[11px] break-all",
							children: abbeyLedger.digest
						}),
						".",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, {
							tag: "reported",
							className: "ml-1 align-middle"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatGrid, { cells: [
					{
						k: "Goals",
						v: String(abbeyWorkflow.goals)
					},
					{
						k: "Done",
						v: String(abbeyWorkflow.done)
					},
					{
						k: "Checked todos",
						v: String(abbeyWorkflow.checked)
					},
					{
						k: "Open todos",
						v: String(abbeyWorkflow.open)
					}
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 mb-6 text-sm text-fg-subtle",
					children: [
						"Executable workflow ledger from ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "font-mono",
							children: abbeyWorkflow.source
						}),
						": ",
						abbeyWorkflow.done,
						" ",
						"done, ",
						abbeyWorkflow.inProgress,
						" in progress, ",
						abbeyWorkflow.proposed,
						" proposed, ",
						abbeyWorkflow.blocked,
						" blocked.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, {
							tag: "reported",
							className: "ml-1 align-middle"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecList, { rows: [
					{
						k: "Toolchain",
						v: abbeyLedger.toolchain
					},
					{
						k: "Backends",
						v: abbeyLedger.backends.join(" · ")
					},
					{
						k: "Default memory",
						v: "SQLite"
					},
					{
						k: "WDBX backend",
						v: "opt-in feature flag"
					}
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandList, { rows: abbeyCommands })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
						label: "donaldfilimon/abbey",
						code: `./install.sh
abbey claims
abbey memory search "deploy target"
# optional WDBX backend
ABBEY_CARGO_FEATURES=wdbx cargo build --release`
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/workspace",
				label: "Abbey workspace"
			},
			secondary: [{
				to: "/abbey-bot",
				label: "abbey-bot"
			}],
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "See where Abbey sits in the stack."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Setup and claims-ledger source."
			}]
		})
	] });
}
//#endregion
export { AbbeyPage as component };
