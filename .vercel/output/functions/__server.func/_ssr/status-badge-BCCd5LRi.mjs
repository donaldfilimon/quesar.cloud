import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn, vt as statusCopy } from "./router-CTU_BGql.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/status-badge-BCCd5LRi.js
var import_jsx_runtime = require_jsx_runtime();
var tone = {
	current: "text-status-current",
	partial: "text-status-partial",
	experimental: "text-status-partial",
	development: "text-status-partial",
	planned: "text-status-planned",
	research: "text-status-planned"
};
function StatusBadge({ status, className }) {
	const copy = statusCopy[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-1.5 font-mono text-[0.68rem] font-medium tracking-wide uppercase", tone[status], className),
		title: copy.meaning,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			children: copy.mark
		}), copy.label]
	});
}
//#endregion
export { StatusBadge as t };
