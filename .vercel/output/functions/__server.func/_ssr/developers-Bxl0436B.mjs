import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { ht as setups } from "./router-CTU_BGql.mjs";
import { p as Surface, r as CodeBlock, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, l as IntegrityList, o as CopyGrid } from "./catalog-mPups2gl.mjs";
import { t as JourneyRail } from "./journey-rail-2M6pcVAU.mjs";
import { t as RepoList } from "./repo-list-CMBRkS91.mjs";
import { n as SourcePanel, t as GithubStatusLine } from "./source-panel-Cc4s05EQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/developers-Bxl0436B.js
var import_jsx_runtime = require_jsx_runtime();
function DevelopersPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Source",
			title: "The public tree is the documentation.",
			lede: "Live GitHub metadata and README excerpts from donaldfilimon when GitHub answers. Architecture diagrams, setup, and verification gates. There is no fabricated SDK. Where an API exists, it is in the source. Where it does not, it is marked planned.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GithubStatusLine, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JourneyRail, { current: "developers" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Readmes",
			title: "First paragraphs, pulled from GitHub when it answers.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcePanel, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Repositories",
			title: "Catalog, live stars, and recent public activity.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepoList, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Local development",
			title: "Each surface has its own gate.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: setups.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl",
						children: item.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: item.body
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
							code: item.code,
							label: item.title
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: item.href,
						className: "mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent",
						children: "Setup notes"
					})
				] }, item.title))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "API direction",
			title: "What you can call today vs. what is not a product yet.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: [{
				title: "Current in source",
				body: "ABI public tree (nightly Rust) with ./tools/cargo.sh and ./tools/check.sh. MCP server (stdio, optional loopback HTTP). Twelve contract-covered MCP tools, including wdbx_query and gpu_status. Local site-builder HTTP API on a trusted LAN (no auth)."
			}, {
				title: "Not published as a platform SDK",
				body: "A hosted Quesar HTTP API. Client SDKs for third-party SaaS integration. Guaranteed stable versioning across all crates. Deploy adapters and authentication for the local Quasar builder."
			}] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Integrity skill",
			title: "The same rules this site is written under.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "max-w-2xl text-sm leading-relaxed text-fg-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/skill-creator",
						className: "text-accent",
						children: "skill-creator"
					}),
					" ",
					"is the public agent skill for creating skills and shipping the company site without breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts. New numbers that are not in that skill's master reference do not ship. Toolchain claims follow each repository README — ABI is nightly Rust, not Zig."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrityList, {})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			secondary: [{
				to: "/investors",
				label: "Investors"
			}, {
				to: "/skill-creator",
				label: "skill-creator"
			}],
			next: [
				{
					to: "/console",
					label: "Field notes",
					body: "Sign in and save what you observed on a node."
				},
				{
					to: "/services",
					label: "Services",
					body: "Audit, design, build, harden."
				},
				{
					to: "/contact",
					label: "Contact",
					body: "The public path is source."
				}
			]
		})
	] });
}
//#endregion
export { DevelopersPage as component };
