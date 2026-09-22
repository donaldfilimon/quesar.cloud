import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn } from "./router-CTU_BGql.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/persona-router-UPXFZW5p.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ABBEY_WORDS = [
	"feel",
	"help",
	"stuck",
	"please",
	"sorry",
	"confused",
	"learn",
	"teach",
	"why",
	"worried",
	"together"
];
var AVIVA_WORDS = [
	"fix",
	"error",
	"benchmark",
	"latency",
	"code",
	"api",
	"schema",
	"proof",
	"number",
	"diff",
	"ship"
];
function scoreMessage(text) {
	const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
	let abbey = .28;
	let aviva = .28;
	for (const token of tokens) {
		if (ABBEY_WORDS.includes(token)) abbey += .12;
		if (AVIVA_WORDS.includes(token)) aviva += .12;
	}
	if ((text.match(/[?!]/g) ?? []).length) abbey += .08;
	if (/\b(fn|const|let|select|cargo|rust)\b/i.test(text)) aviva += .14;
	const sum = abbey + aviva;
	abbey = abbey / sum;
	aviva = 1 - abbey;
	return {
		abbey,
		aviva,
		abi: .5,
		alpha: Math.min(.96, Math.max(.04, abbey))
	};
}
function PersonaRouter({ compact = false }) {
	const [text, setText] = (0, import_react.useState)("I'm stuck on the deploy target and also need the exact schema.");
	const scores = (0, import_react.useMemo)(() => scoreMessage(text), [text]);
	const voice = scores.alpha > .8 ? "Abbey — empathetic, scaffolded" : scores.alpha < .2 ? "Aviva — concise, unfiltered" : "Blend — Aviva's facts, Abbey's voice, mixed by Abi";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "surface p-5 sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
				children: "Persona router"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: "Illustrative keyword-sentiment heuristic. The inspected local router uses deterministic rules; this is not evidence of a learned classifier."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-4 block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: "Message"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: text,
					onChange: (event) => setText(event.target.value.slice(0, 600)),
					rows: compact ? 3 : 4,
					className: "min-h-24 w-full rounded-md bg-bg px-3 py-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-5 grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Abbey α",
						value: scores.alpha,
						tone: "bg-persona-abbey"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Aviva 1−α",
						value: 1 - scores.alpha,
						tone: "bg-persona-aviva"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Abi blend",
						value: .5,
						tone: "bg-persona-abi"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 font-mono text-[11px] tracking-wide text-fg-subtle uppercase",
				children: voice
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-display text-xl",
				children: ["α = ", scores.alpha.toFixed(2)]
			})
		]
	});
}
function Meter({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[10px] tracking-wide text-fg-subtle uppercase",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("h-full rounded-full", tone),
				style: { width: `${Math.round(value * 100)}%` }
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-xs tabular text-fg",
			children: value.toFixed(2)
		})
	] });
}
//#endregion
export { scoreMessage as n, PersonaRouter as t };
