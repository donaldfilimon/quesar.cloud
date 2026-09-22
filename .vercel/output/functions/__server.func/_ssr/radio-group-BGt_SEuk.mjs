import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
import { n as RadioGroupItem$1, t as RadioGroup$1 } from "../_libs/radix-ui__react-radio-group.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/radio-group-BGt_SEuk.js
var import_jsx_runtime = require_jsx_runtime();
function RadioGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup$1, {
		className: cn("grid gap-2", className),
		...props
	});
}
function RadioGroupItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem$1, {
		className: cn("inline-flex h-11 items-center rounded-md px-3 text-sm text-fg-muted hover:text-fg data-[state=checked]:bg-bg-subtle data-[state=checked]:text-fg", className),
		...props,
		children
	});
}
//#endregion
export { RadioGroupItem as n, RadioGroup as t };
