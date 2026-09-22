import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { c as HeroStatus, f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
import { n as writeStore, t as readStore } from "./local-store-C-6bcd38.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mobile-DXBViOhN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEY = "mlai-vault-notes";
function VaultApp() {
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [active, setActive] = (0, import_react.useState)(null);
	const [title, setTitle] = (0, import_react.useState)("");
	const [body, setBody] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const stored = readStore(KEY, []);
		setNotes(stored);
		const first = stored[0];
		if (first) {
			setActive(first.id);
			setTitle(first.title);
			setBody(first.body);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		writeStore(KEY, notes);
	}, [notes]);
	const current = (0, import_react.useMemo)(() => notes.find((n) => n.id === active) ?? null, [notes, active]);
	function persist(nextTitle, nextBody) {
		if (!active) return;
		setNotes((rows) => rows.map((row) => row.id === active ? {
			...row,
			title: nextTitle,
			body: nextBody,
			updated: Date.now()
		} : row));
	}
	function createNote() {
		const note = {
			id: crypto.randomUUID(),
			title: "Untitled",
			body: "",
			updated: Date.now()
		};
		setNotes((rows) => [note, ...rows]);
		setActive(note.id);
		setTitle(note.title);
		setBody("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "border-b border-border lg:border-r lg:border-b-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[10px] tracking-[0.16em] text-accent uppercase",
					children: "Vault"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "sm",
					onClick: createNote,
					children: "New"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-64 overflow-y-auto lg:max-h-[28rem]",
				children: notes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "px-4 py-6 text-sm text-fg-muted",
					children: "Empty. Notes stay in this browser."
				}) : notes.map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setActive(note.id);
						setTitle(note.title);
						setBody(note.body);
					},
					className: `block w-full px-4 py-3 text-left ${note.id === active ? "bg-bg-subtle" : "hover:bg-bg-subtle"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm font-medium",
						children: note.title || "Untitled"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-xs text-fg-subtle",
						children: new Date(note.updated).toLocaleString()
					})]
				}) }, note.id))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-4 sm:p-6",
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
				className: "mt-4 min-h-64 w-full resize-y bg-transparent text-sm leading-relaxed text-fg-muted outline-none",
				placeholder: "Private note. Encrypted-local fallback on device builds; this web vault is localStorage only."
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg-muted",
				children: "Create a note to start the vault."
			})
		})]
	});
}
function MobilePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Mobile",
			title: "A vault you can hold.",
			lede: "Expo SDK 53 companion. Native CloudKit and the encrypted-local fallback are distinct paths. Signed-device acceptance is not the same as this web export.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "partial" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Web vault",
			title: "Notes stay in this browser.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto max-w-md overflow-hidden rounded-[2rem] bg-bg-elevated p-3 shadow-[var(--shadow-border)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-[1.5rem] bg-bg p-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VaultApp, {})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, {
					items: [
						{
							title: "Tabs",
							body: "Home, products, platform, company, vault — the Expo app mirrors this site's orientation."
						},
						{
							title: "CloudKit",
							body: "Private vault on a signed Apple build. Not this page."
						},
						{
							title: "Fallback",
							body: "Encrypted-local store when iCloud is unavailable. Web uses localStorage only."
						}
					],
					columns: "md:grid-cols-3"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/apps",
				label: "All apps"
			},
			next: [{
				to: "/workspace",
				label: "Workspace",
				body: "Documents on this machine."
			}, {
				to: "/companion",
				label: "Companion",
				body: "The Mac window onto Abbey."
			}]
		})
	] });
}
//#endregion
export { MobilePage as component };
