import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
import { a as Viewport, i as ScrollAreaThumb, n as Root, r as ScrollAreaScrollbar, t as Corner } from "../_libs/radix-ui__react-scroll-area.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/journey-rail-2M6pcVAU.js
var import_jsx_runtime = require_jsx_runtime();
function ScrollArea({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
		className: cn("relative overflow-hidden", className),
		...props,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
				className: "w-full rounded-[inherit]",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollBar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Corner, {})
		]
	});
}
function ScrollBar({ className, orientation = "vertical", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbar, {
		orientation,
		className: cn("flex touch-none p-0.5 select-none", orientation === "vertical" && "h-full w-2 border-l border-l-transparent", orientation === "horizontal" && "h-2 flex-col border-t border-t-transparent", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border-strong" })
	});
}
var journeys = [
	{
		id: "home",
		to: "/",
		label: "Home"
	},
	{
		id: "architecture",
		to: "/architecture",
		label: "Architecture"
	},
	{
		id: "console",
		to: "/console",
		label: "Field notes"
	},
	{
		id: "investors",
		to: "/investors",
		label: "Investors"
	},
	{
		id: "developers",
		to: "/developers",
		label: "Developers"
	}
];
function JourneyRail({ current }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		"aria-label": "Orientation journeys",
		className: "border-b border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ScrollArea, {
			className: "mx-auto w-full max-w-6xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex w-max gap-1 px-4 sm:px-6",
				children: journeys.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: item.to,
					className: cn("inline-flex h-11 items-center px-3 text-sm no-underline", current === item.id ? "text-fg" : "text-fg-muted hover:text-fg"),
					"aria-current": current === item.id ? "page" : void 0,
					children: item.label
				}) }, item.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollBar, { orientation: "horizontal" })]
		})
	});
}
//#endregion
export { ScrollArea as n, JourneyRail as t };
