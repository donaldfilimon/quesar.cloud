import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
import { n as RadioGroupItem, t as RadioGroup } from "./radio-group-BGt_SEuk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chip-cutaway-Cx-Jpi1M.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var layers = [
	{
		id: "abbey",
		name: "Abbey",
		kicker: "Application",
		href: "/abbey",
		body: "Human-facing companion. Personas, claims ledger, local workspace.",
		edge: "[--edge:var(--abbey)]",
		glow: "shadow-[var(--shadow-border-hover)]"
	},
	{
		id: "abi",
		name: "ABI",
		kicker: "Compute",
		href: "/abi",
		body: "Reasoning, routing, orchestration. Inspectable context.",
		edge: "[--edge:var(--abi)]",
		glow: "shadow-[var(--shadow-border-hover)]"
	},
	{
		id: "wdbx",
		name: "WDBX",
		kicker: "Storage",
		href: "/wdbx",
		body: "Episodic substrate. Provenance, not a lookup table.",
		edge: "[--edge:var(--wdbx)]",
		glow: "shadow-[var(--shadow-border-hover)]"
	}
];
function ChipCutaway() {
	const [active, setActive] = (0, import_react.useState)("abi");
	const selected = layers.find((layer) => layer.id === active) ?? layers[1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioGroup, {
			value: active,
			onValueChange: (value) => setActive(value),
			className: "chip-stack relative mx-auto grid w-full max-w-lg gap-0",
			"aria-label": "Stack layers",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute top-3 bottom-3 left-3 w-px bg-accent/40",
				"aria-hidden": "true"
			}), layers.map((layer, index) => {
				const isActive = active === layer.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioGroupItem, {
					value: layer.id,
					onMouseEnter: () => setActive(layer.id),
					className: cn("chip-slab accent-edge relative block h-auto w-full rounded-[18px] px-6 py-5 text-left", layer.edge, isActive ? layer.glow : "shadow-[var(--shadow-border)]", isActive ? "bg-bg-elevated" : "bg-bg-elevated/80"),
					style: {
						marginTop: index === 0 ? 0 : -8,
						zIndex: layers.length - index
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute top-1/2 left-[-0.55rem] size-2 -translate-y-1/2 rounded-full bg-accent",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-[0.65rem] tracking-[0.18em] text-fg-subtle uppercase",
							children: [
								String(index + 1).padStart(2, "0"),
								" · ",
								layer.kicker
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block font-display text-2xl tracking-tight text-fg",
							children: layer.name
						})
					]
				}, layer.id);
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.2em] text-accent uppercase",
				children: selected.kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-2 font-display text-3xl tracking-tight",
				children: selected.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-sm text-sm leading-relaxed text-fg-muted",
				children: selected.body
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: selected.href,
				className: "mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent no-underline hover:underline",
				children: ["Open ", selected.name]
			})
		] })]
	});
}
//#endregion
export { ChipCutaway as t };
