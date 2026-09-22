import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as useCurrentUserState } from "./router-CTU_BGql.mjs";
import { o as NextUp, p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { t as Label$1 } from "./label-BdJrkPew.mjs";
import { t as Textarea } from "./textarea-1mlne-9h.mjs";
import { t as addNote } from "./workspace-DKdTGnIa.mjs";
import { n as writeStore, t as readStore } from "./local-store-C-6bcd38.mjs";
import { t as Input } from "./input-CLuOZ_Uu.mjs";
import { n as RadioGroupItem, t as RadioGroup } from "./radio-group-BGt_SEuk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/contact-u33jDTIH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEY = "mlai-inquiries";
var TOPICS = [
	"Quesar",
	"Abbey",
	"ABI / WDBX",
	"Services",
	"Investors",
	"Other"
];
function ContactPage() {
	const { user } = useCurrentUserState();
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("Quesar");
	const [message, setMessage] = (0, import_react.useState)("");
	const [saved, setSaved] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)("idle");
	(0, import_react.useEffect)(() => {
		setSaved(readStore(KEY, []));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		if (!name && user.displayName) setName(user.displayName);
		if (!email && user.primaryEmail) setEmail(user.primaryEmail);
	}, [
		user,
		name,
		email
	]);
	async function onSubmit(event) {
		event.preventDefault();
		const trimmed = message.trim();
		if (!trimmed) return;
		setStatus("saving");
		const inquiry = {
			id: crypto.randomUUID(),
			name: name.trim().slice(0, 80),
			email: email.trim().slice(0, 120),
			topic,
			message: trimmed.slice(0, 2e3),
			created: Date.now()
		};
		const next = [inquiry, ...saved].slice(0, 20);
		writeStore(KEY, next);
		setSaved(next);
		setMessage("");
		if (user) try {
			await addNote({ data: {
				nodeId: "contact",
				body: `[${topic}] ${inquiry.name} <${inquiry.email}>\n${inquiry.message}`
			} });
		} catch {
			setStatus("done");
			toast.success("Saved on this device.");
			return;
		}
		setStatus("done");
		toast.success(user ? "Saved to your field console." : "Saved on this device.");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
		eyebrow: "Contact",
		title: "Write here. Stay here.",
		lede: "This site does not operate a hosted inbox. Your inquiry stays on this device, and if you are signed in it is also saved to your field console. For architecture questions, the pages themselves are the public path."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit,
			className: "surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
						htmlFor: "contact-name",
						children: "Name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "contact-name",
						value: name,
						onChange: (event) => setName(event.target.value),
						autoComplete: "name",
						className: "mt-1 bg-bg"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
						htmlFor: "contact-email",
						children: "Email"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "contact-email",
						type: "email",
						value: email,
						onChange: (event) => setEmail(event.target.value),
						autoComplete: "email",
						className: "mt-1 bg-bg"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "text-sm",
						children: "Topic"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup, {
						className: "mt-2 flex flex-wrap gap-2",
						value: topic,
						onValueChange: (value) => setTopic(value),
						"aria-label": "Topic",
						children: TOPICS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
							value: item,
							children: item
						}, item))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
						htmlFor: "contact-message",
						children: "Message"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						id: "contact-message",
						required: true,
						value: message,
						onChange: (event) => setMessage(event.target.value.slice(0, 2e3)),
						rows: 7,
						className: "mt-1 bg-bg"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-wrap items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: status === "saving",
						children: status === "saving" ? "Saving…" : "Save inquiry"
					}), status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-fg-muted",
						children: "Saved on this device. Sign in to also keep it in the field console."
					}) : null]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl",
			children: "Direct paths"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-4 space-y-3 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/services",
					className: "text-accent",
					children: "Services"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-fg-muted",
					children: "Audit, design, build, harden — engagement first."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/source",
					className: "text-accent",
					children: "Source catalog"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-fg-muted",
					children: "Every public tree, described on this site."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/apps",
					className: "text-accent",
					children: "Apps"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-fg-muted",
					children: "Workspace, vault, studio, bot — in the browser."
				})] })
			]
		})] }), saved.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 space-y-3",
			children: saved.slice(0, 5).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-[11px] text-fg-subtle",
					children: [
						item.topic,
						" · ",
						new Date(item.created).toISOString().slice(0, 10)
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 line-clamp-3 text-sm text-fg-muted",
					children: item.message
				})]
			}, item.id))
		}) : null] })]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NextUp, { items: [{
			to: "/developers",
			label: "Developers",
			body: "Full repository index and gates."
		}, {
			to: "/services",
			label: "Services",
			body: "If you need an engagement, start there."
		}] })
	})] })] });
}
//#endregion
export { ContactPage as component };
