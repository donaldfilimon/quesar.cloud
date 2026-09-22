import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _ as ProvTag, bt as wdbxCrates, xt as wdbxSpecs, yt as wdbxCapabilities } from "./router-CTU_BGql.mjs";
import { d as SpecList, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { d as NamedGrid, f as PageClose, s as DataTable } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/wdbx-s3ouLS7q.js
var import_jsx_runtime = require_jsx_runtime();
function WdbxPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "WDBX",
			title: "Memory is not a lookup.",
			lede: "A vector database can retrieve similar content. An episodic substrate must also preserve context, causal dependencies, outcomes, versions, constraints, and evidence — so a later query can ask what happened, what was predicted, what was done, what followed, and why this record is trusted.",
			atmosphere: "board",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "current" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-fg-muted",
					children: "Structural substrate is in source. Evidence-weighted retrieval is planned."
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Capabilities",
			title: "Implemented structure. Honest gaps.",
			lede: "Status is measured against the source, not against a product name. Storage integrity does not establish truth. The reference cluster protocol does not establish production sharding.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
				minWidth: "40rem",
				rows: wdbxCapabilities,
				rowKey: (row) => row.concern,
				columns: [
					{
						header: "Concern",
						cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: row.concern
						})
					},
					{
						header: "What exists",
						className: "text-fg-muted",
						cell: (row) => row.what
					},
					{
						header: "Status",
						cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: row.status })
					}
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Configuration",
			title: "Facts from the active crate.",
			lede: "Not latency, not recall, not QPS. Graph construction parameters as the Rust tree sets them.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "measured" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecList, { rows: wdbxSpecs })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Crates",
			title: "The substrate ABI owns.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
				items: wdbxCrates,
				accent: "wdbx",
				nameClass: "text-wdbx"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm text-fg-subtle",
				children: [
					"Crate names keep the ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "abi-"
					}),
					" prefix deliberately. ABI owns this layer. The repository provides source, not a hosted database. Extracted from donaldfilimon/abi on 2026-08-22 with history preserved. A Python witness encoder at ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "tools/abbey_cbor_episode_v1.py"
					}),
					" ",
					"agrees on golden vectors for ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "abbey-cbor-episode-v1"
					}),
					"."
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/docs/wdbx",
				label: "WDBX docs"
			},
			secondary: [{
				to: "/abi",
				label: "ABI runtime"
			}, {
				to: "/research",
				label: "Research notes"
			}]
		})
	] });
}
//#endregion
export { WdbxPage as component };
