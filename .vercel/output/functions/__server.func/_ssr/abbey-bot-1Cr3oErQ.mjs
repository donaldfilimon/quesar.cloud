import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { F as useCurrentUserState } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { n as scoreMessage, t as PersonaRouter } from "./persona-router-UPXFZW5p.mjs";
import { t as askPersona } from "./ai-CHYRVXyR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/abbey-bot-1Cr3oErQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AbbeyBotPage() {
	const { user } = useCurrentUserState();
	const [input, setInput] = (0, import_react.useState)("Help me name what the ledger can prove about WDBX.");
	const [turns, setTurns] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)(false);
	async function onSubmit(event) {
		event.preventDefault();
		const text = input.trim();
		if (!text) return;
		const scores = scoreMessage(text);
		const persona = scores.alpha > .55 ? "abbey" : scores.alpha < .35 ? "aviva" : "abi";
		setTurns((rows) => [...rows, {
			role: "you",
			text,
			persona
		}]);
		setInput("");
		setPending(true);
		try {
			const result = await askPersona({ data: {
				prompt: text,
				persona
			} });
			const reply = result.ok ? result.text : `${persona} would answer locally: ${result.error} Heuristic α=${scores.alpha.toFixed(2)}.`;
			setTurns((rows) => [...rows, {
				role: "bot",
				text: reply,
				persona
			}]);
		} catch {
			setTurns((rows) => [...rows, {
				role: "bot",
				persona,
				text: `Sign in for the live model. Local route: ${persona} (α=${scores.alpha.toFixed(2)}). Abbey names uncertainty; Aviva answers; Abi traces.`
			}]);
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Abbey bot",
			title: "A companion that says what it knows.",
			lede: "The Rust bot is the shipping surface. This page is the browser companion: persona routing you can see, and an optional live model behind sign-in.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "partial" })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Router",
			title: "Watch Abi score the blend.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaRouter, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Thread",
			title: "One conversation. Three voices.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-3",
					children: [turns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "text-sm text-fg-muted",
						children: ["No turns yet. ", user ? "Signed in." : "Local fallback if you are signed out."]
					}) : null, turns.map((turn, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md bg-bg px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-[10px] tracking-wide text-fg-subtle uppercase",
							children: [
								turn.role,
								" · ",
								turn.persona
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm leading-relaxed text-fg",
							children: turn.text
						})]
					}, `${turn.role}-${index}`))]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit,
					className: "mt-4 flex flex-col gap-3 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: input,
						onChange: (event) => setInput(event.target.value.slice(0, 600)),
						className: "h-11 flex-1 rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-border)] outline-none",
						placeholder: "Ask Abbey, Aviva, or Abi"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: pending,
						children: pending ? "Routing…" : "Send"
					})]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/abbey",
				label: "Abbey product"
			},
			secondary: [{
				to: "/companion",
				label: "macOS companion"
			}],
			next: [{
				to: "/demo",
				label: "Persona demo",
				body: "Watch Abi score α without a live model."
			}]
		})
	] });
}
//#endregion
export { AbbeyBotPage as component };
