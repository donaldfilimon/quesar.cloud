import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/companion-Dk_EUZ-L.js
var import_jsx_runtime = require_jsx_runtime();
function CompanionPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Companion",
			title: "A Mac window onto Abbey.",
			lede: "Native SwiftUI companion for Abbey Bot (Swift 6.4 / SwiftData). This page is the orientation — the binary runs on your Mac.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "partial" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, {
			items: [
				{
					title: "SwiftData",
					body: "Local records on device. Not a cloud workspace disguised as a native shell."
				},
				{
					title: "SwiftUI",
					body: "Menus, threads, and claims. The companion does not invent a hosted API."
				},
				{
					title: "Boundary",
					body: "Not Quesar-as-a-service. Related to Abbey Bot, not a third product line."
				}
			],
			columns: "md:grid-cols-3"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 overflow-hidden rounded-[24px] bg-bg-elevated p-6 shadow-[var(--shadow-border)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.16em] text-accent uppercase",
				children: "Window"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-lg bg-bg p-3 font-mono text-[11px] text-fg-subtle",
					children: "Threads · Claims · Memory"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-lg bg-bg p-4 text-sm text-fg-muted",
					children: "Companion chrome. Sign-in on this website opens field notes, not this native session."
				})]
			})]
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/abbey-bot",
				label: "Abbey bot"
			},
			next: [{
				to: "/mobile",
				label: "Mobile",
				body: "The handheld vault orientation."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Every surface, in this site."
			}]
		})
	] });
}
//#endregion
export { CompanionPage as component };
