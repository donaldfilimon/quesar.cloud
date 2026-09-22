import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { H as abiCrates, U as abiDuties, V as abiCli, W as abiNotClaimed, it as mcpTools } from "./router-CTU_BGql.mjs";
import { r as CodeBlock, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { a as CommandList, d as NamedGrid, f as PageClose, i as ClaimList, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/abi-D11tOgB6.js
var import_jsx_runtime = require_jsx_runtime();
function AbiPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "ABI",
			title: "Orchestration you can inspect on your machine.",
			lede: "ABI routes requests, assembles context, and coordinates tools. The public GitHub tree is nightly Rust. The Zig tree has been removed. WDBX is a required sibling. Follow the repository README — do not mix toolchains. Local template completion does not establish model quality.",
			atmosphere: "wafer",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "current" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-fg-muted",
					children: "Requires the sibling WDBX workspace."
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Responsibilities",
			title: "What ABI actually does.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: abiDuties.map((item) => ({
				...item,
				accent: "abi"
			})) })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Public tree",
			title: "Nightly Rust. Use the repo wrappers.",
			lede: "Bare cargo is the wrong entry. ./tools/cargo.sh pins the toolchain the tree actually builds with.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
				label: "donaldfilimon/abi",
				code: `git clone https://github.com/donaldfilimon/wdbx
git clone https://github.com/donaldfilimon/abi
cd abi
./tools/cargo.sh
./tools/check.sh
./tools/cargo.sh build -p abi-cli`
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm text-fg-muted",
				children: [
					"GPU reporting returns ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "accelerated=false"
					}),
					" when native kernels are not linked. Persistence defaults to ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "$HOME/.abi/wdbx"
					}),
					". Disable with",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "ABI_WDBX_PERSIST=0"
					}),
					". License: Apache-2.0."
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Crates",
			title: "What the workspace actually ships.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
				items: abiCrates,
				accent: "abi",
				nameClass: "text-abi"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "MCP",
			title: "Contract-covered tools, not a hosted SDK.",
			lede: "stdio is the default. Optional loopback HTTP uses bearer auth. Persistent HTTP+SSE is not claimed. Tool names are from the ABI README.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NamedGrid, {
				items: mcpTools,
				nameClass: "text-abi"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "CLI",
			title: "Commands the public tree actually documents.",
			lede: "Copied from donaldfilimon/abi. Local template completion does not establish model quality.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandList, { rows: abiCli }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
					label: "abi-cli",
					code: `$ABI backends
$ABI scheduler status
$ABI dashboard --once --plain
$ABI complete "summarize ABI scheduler status"
$ABI agent plan "stage a safe WDBX refactor"
$ABI help --json`
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "External claims",
			title: "Do not cite what the ledger does not prove.",
			lede: "External collateral should cite a repository test, a benchmark artifact, or a documented source file before making a performance or capability claim.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClaimList, { items: abiNotClaimed })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/docs/runtime",
				label: "ABI setup"
			},
			secondary: [{
				to: "/products/abi",
				label: "ABI product"
			}],
			next: [{
				to: "/wdbx",
				label: "WDBX",
				body: "The required sibling substrate."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Gates, wrappers, and live GitHub."
			}]
		})
	] });
}
//#endregion
export { AbiPage as component };
