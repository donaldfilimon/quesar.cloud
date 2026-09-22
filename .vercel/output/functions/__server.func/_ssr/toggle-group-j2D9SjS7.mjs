import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
import { n as ToggleGroupItem$1, t as ToggleGroup$1 } from "../_libs/radix-ui__react-toggle-group.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/toggle-group-j2D9SjS7.js
var import_jsx_runtime = require_jsx_runtime();
function ToggleGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroup$1, {
		className: cn("flex flex-wrap gap-1", className),
		...props
	});
}
function ToggleGroupItem({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroupItem$1, {
		className: cn("inline-flex h-11 shrink-0 items-center rounded-md px-3 font-mono text-[11px] tracking-wide text-fg-muted uppercase", "hover:text-fg data-[state=on]:bg-bg-subtle data-[state=on]:text-fg", className),
		...props
	});
}
//#endregion
export { ToggleGroupItem as n, ToggleGroup as t };
