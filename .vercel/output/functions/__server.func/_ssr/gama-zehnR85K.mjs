import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { c as HeroStatus, f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/gama-zehnR85K.js
var import_jsx_runtime = require_jsx_runtime();
function GamaPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Gama",
			title: "One tree. Many surfaces.",
			lede: "A modular declarative UI framework in Swift, organized around scenes and a retained render tree. Founder-owned. Not a Quesar product, not an Abbey runtime, and not evidence of a shipped spatial engine.",
			atmosphere: "plates",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStatus, { status: "research" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: [
			{
				title: "GamaCore",
				body: "Scenes, state, layout, and events. The retained tree is the contract."
			},
			{
				title: "Backends",
				body: "Documented: TUI, Apple, WebAssembly, embed. Check current source for your target."
			},
			{
				title: "MLX track",
				body: "On-device language-model work on Apple Silicon lives in related founder trees — not as a Quesar claim."
			},
			{
				title: "Boundary",
				body: "A passing web gate is not Swift evidence. A local runtime test does not validate a mobile app."
			}
		] }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/docs/gama",
				label: "Gama docs"
			},
			next: [{
				to: "/projects/gama",
				label: "Project card",
				body: "Scope and the limit, on one page."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Founder surfaces, labeled as research."
			}]
		})
	] });
}
//#endregion
export { GamaPage as component };
