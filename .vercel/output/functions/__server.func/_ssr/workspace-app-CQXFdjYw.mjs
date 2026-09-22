import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { F as useCurrentUserState } from "./router-CTU_BGql.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { t as askPersona } from "./ai-CHYRVXyR.mjs";
import { n as writeStore, t as readStore } from "./local-store-C-6bcd38.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-app-CQXFdjYw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEY = "mlai-abbey-workspace";
function WorkspaceApp() {
	const { user } = useCurrentUserState();
	const [docs, setDocs] = (0, import_react.useState)([]);
	const [active, setActive] = (0, import_react.useState)(null);
	const [title, setTitle] = (0, import_react.useState)("Welcome");
	const [body, setBody] = (0, import_react.useState)("Abbey workspace orientation.\n\nThis page is the in-browser loop: documents stay in this browser. The shipping app uses SQLite, a Python worker, and an optional local model.\n\nWrite a brief, then ask Abbey for a pass.");
	const [question, setQuestion] = (0, import_react.useState)("Summarize this document and name one risk.");
	const [answer, setAnswer] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("idle");
	(0, import_react.useEffect)(() => {
		const stored = readStore(KEY, []);
		if (stored.length) {
			setDocs(stored);
			const first = stored[0];
			setActive(first.id);
			setTitle(first.title);
			setBody(first.body);
			return;
		}
		const seed = {
			id: crypto.randomUUID(),
			title: "Welcome",
			body,
			updated: Date.now()
		};
		setDocs([seed]);
		setActive(seed.id);
	}, []);
	(0, import_react.useEffect)(() => {
		writeStore(KEY, docs);
	}, [docs]);
	const current = (0, import_react.useMemo)(() => docs.find((d) => d.id === active) ?? null, [docs, active]);
	function persist(nextTitle, nextBody) {
		if (!active) return;
		setDocs((rows) => rows.map((row) => row.id === active ? {
			...row,
			title: nextTitle,
			body: nextBody,
			updated: Date.now()
		} : row));
	}
	async function ask() {
		setStatus("asking");
		setAnswer("");
		try {
			const result = await askPersona({ data: {
				persona: "abbey",
				prompt: `Document titled ${title}:\n${body.slice(0, 800)}\n\nOperator question: ${question}`
			} });
			if (!result.ok) {
				setAnswer(result.error);
				setStatus("error");
				return;
			}
			setAnswer(result.text);
			setStatus("idle");
		} catch {
			setAnswer("Sign in to use the live model. Local notes still save.");
			setStatus("error");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)] lg:grid lg:min-h-[32rem] lg:grid-cols-[14rem_minmax(0,1fr)_18rem]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "border-b border-border lg:border-r lg:border-b-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] tracking-[0.16em] text-accent uppercase",
						children: "Docs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						onClick: () => {
							const doc = {
								id: crypto.randomUUID(),
								title: "Untitled",
								body: "",
								updated: Date.now()
							};
							setDocs((rows) => [doc, ...rows]);
							setActive(doc.id);
							setTitle(doc.title);
							setBody("");
						},
						children: "New"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: docs.map((doc) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `block w-full px-3 py-3 text-left text-sm ${doc.id === active ? "bg-bg-subtle" : "hover:bg-bg-subtle"}`,
					onClick: () => {
						setActive(doc.id);
						setTitle(doc.title);
						setBody(doc.body);
					},
					children: doc.title || "Untitled"
				}) }, doc.id)) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r",
				children: current ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: title,
					onChange: (event) => {
						setTitle(event.target.value);
						persist(event.target.value, body);
					},
					className: "w-full bg-transparent font-display text-2xl outline-none"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: body,
					onChange: (event) => {
						setBody(event.target.value);
						persist(title, event.target.value);
					},
					className: "mt-4 min-h-72 w-full resize-y bg-transparent text-sm leading-relaxed text-fg-muted outline-none"
				})] }) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] tracking-[0.16em] text-accent uppercase",
						children: "Assistant"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-fg-muted",
						children: user ? "Signed in. Live model is user-initiated and capped." : "Local notes work offline. Sign in to ask Abbey."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: question,
						onChange: (event) => setQuestion(event.target.value.slice(0, 400)),
						className: "mt-3 min-h-24 w-full rounded-md bg-bg px-3 py-2 text-sm shadow-[var(--shadow-border)] outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						className: "mt-3",
						onClick: () => void ask(),
						disabled: status === "asking",
						children: status === "asking" ? "Asking…" : "Ask Abbey"
					}),
					answer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm leading-relaxed text-fg-muted",
						children: answer
					}) : null
				]
			})
		]
	});
}
//#endregion
export { WorkspaceApp as t };
