import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { C as pathForRepo, T as repoPaths, r as Route$2, w as repoDocs } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as CellMachine } from "./cell-machine-Dhr3saX-.mjs";
import { t as loadGithub } from "./github-DVvoAF69.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/source._name-BYN2AQCh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SourceRepoPage() {
	const { name } = Route$2.useParams();
	const decoded = decodeURIComponent(name);
	const canonical = pathForRepo(decoded);
	const doc = repoDocs[decoded] ?? repoDocs[decoded.toLowerCase()];
	const [live, setLive] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		loadGithub().then((payload) => {
			setLive(payload.repos.find((row) => row.name === decoded) ?? null);
		});
	}, [decoded]);
	if (canonical !== `/source/${encodeURIComponent(decoded)}` && repoPaths[decoded]) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-fg-muted",
		children: "This repository has a product page."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: canonical,
		className: "mt-4 inline-flex text-accent",
		children: ["Open ", decoded]
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Source",
			title: doc?.title ?? decoded,
			lede: live?.description || doc?.lede || "Public repository. Described here so the catalog is complete without sending you away.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-3",
				children: [doc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: doc.status }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "research" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-sm text-fg-subtle",
					children: live?.language ?? doc?.language ?? "public"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			doc?.sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-xl",
					children: section.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-relaxed text-fg-muted",
					children: section.body
				})]
			}, section.title)),
			decoded === "cell-machine" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CellMachine, {})
			}) : null,
			live ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-6 font-mono text-[11px] text-fg-subtle",
				children: [
					live.stars,
					" stars · updated ",
					live.updated.slice(0, 10)
				]
			}) : null
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/source",
				label: "Source catalog"
			},
			next: [{
				to: "/developers",
				label: "Developers",
				body: "Live READMEs when GitHub answers."
			}]
		})
	] });
}
//#endregion
export { SourceRepoPage as component };
