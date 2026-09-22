import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/separator-C6eDeJ8k.js
var import_jsx_runtime = require_jsx_runtime();
function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		decorative,
		orientation,
		className: cn("shrink-0 bg-border", orientation === "horizontal" ? "my-4 h-px w-full" : "mx-2 h-full w-px", className),
		...props
	});
}
//#endregion
export { Separator as t };
