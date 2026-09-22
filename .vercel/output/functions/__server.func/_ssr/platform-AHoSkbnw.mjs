import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { $ as integrationApps, rt as layers, xt as wdbxSpecs } from "./router-CTU_BGql.mjs";
import { d as SpecList, p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { f as PageClose, m as PersonaGrid, s as DataTable } from "./catalog-mPups2gl.mjs";
import { t as ChipCutaway } from "./chip-cutaway-Cx-Jpi1M.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-AHoSkbnw.js
var import_jsx_runtime = require_jsx_runtime();
function PlatformPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Platform",
			title: "Inference, index, and data on machines you own.",
			lede: "Three layers on one chip: WDBX stores, ABI coordinates, Abbey speaks. Quesar is the product envelope that makes those relationships obvious. Gama is a founder-owned Swift framework — related by author, not claimed as a Quesar surface.",
			atmosphere: "plates"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Stack",
			title: "Bottom to top.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipCutaway, {})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4",
				children: layers.map((layer) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: layer.href,
					className: "no-underline",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						hover: true,
						accent: layer.accent,
						className: "grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-baseline",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
							children: layer.layer
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-2xl",
							children: layer.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg-muted",
							children: layer.body
						})] })]
					})
				}, layer.name))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Integration home",
			title: "Independent gates. One layout.",
			lede: "From donaldfilimon/MLAI-CORPORATION-WWW. A green web gate is not mobile evidence.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				rows: integrationApps,
				rowKey: (row) => row.path,
				columns: [
					{
						header: "Path",
						className: "font-mono text-[12px]",
						cell: (row) => row.path
					},
					{
						header: "Purpose",
						className: "text-fg-muted",
						cell: (row) => row.purpose
					},
					{
						header: "Status",
						cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: row.status })
					}
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Personas vs products",
			title: "Two color axes. Do not mix them.",
			lede: "Product accents: WDBX cyan, ABI violet, Abbey emerald. Persona colors: Abbey emerald, Aviva violet, Abi cyan. The ABI product is violet; the Abi persona is cyan.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaGrid, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Configuration",
			title: "What the active crate actually sets.",
			lede: "Sourced from the Rust substrate. Not a scoreboard.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecList, { rows: wdbxSpecs })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Related",
			title: "Gama is not Quesar.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-xl",
				children: "Gama"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted",
				children: [
					"A modular declarative Swift UI framework with TUI, Apple, WebAssembly, and embed backends. It lives at",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/gama",
						className: "text-accent",
						children: "Gama"
					}),
					". It is not a Quesar product, not an Abbey runtime, and not evidence of a shipped spatial engine."
				]
			})] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			secondary: [{
				to: "/quesar",
				label: "Quesar"
			}],
			next: [{
				to: "/abi",
				label: "ABI",
				body: "Nightly Rust orchestration."
			}, {
				to: "/abbey",
				label: "Abbey",
				body: "The claims-honest companion."
			}]
		})
	] });
}
//#endregion
export { PlatformPage as component };
