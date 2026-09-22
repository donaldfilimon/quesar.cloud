import { C as require_jsx_runtime, _ as Slot } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/button-CAMiJNnG.js
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap no-underline transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 active:not-disabled:translate-y-px", {
	variants: {
		variant: {
			primary: "bg-primary text-primary-foreground hover:bg-primary/80",
			secondary: "border-border bg-card/80 text-foreground hover:bg-muted",
			ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
			link: "bg-transparent px-0 text-primary underline-offset-4 hover:underline"
		},
		size: {
			md: "h-11 rounded-md px-4 text-sm",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-12 rounded-lg px-5 text-[0.9375rem]"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
//#endregion
export { buttonVariants as n, Button as t };
