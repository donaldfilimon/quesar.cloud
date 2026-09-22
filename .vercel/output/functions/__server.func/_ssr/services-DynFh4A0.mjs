import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { J as engagement, lt as refusals, mt as services } from "./router-CTU_BGql.mjs";
import { f as StepList, n as Callout, p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/services-DynFh4A0.js
var import_jsx_runtime = require_jsx_runtime();
function ServicesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Services",
			title: "Audit, design, build, and harden.",
			lede: "Work that needs traceability, private deployment options, and operational control. If the engagement requires your corpus to leave your hardware, the engagement is designed wrong."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Core",
			title: "Nine engagements. Each ends with evidence.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
				children: services.map((service) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "flex h-full flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-xl",
							children: service.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 flex-1 text-sm leading-relaxed text-fg-muted",
							children: service.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-1.5",
							children: service.outcomes.map((outcome) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "font-mono text-[11px] text-fg-subtle",
								children: ["→ ", outcome]
							}, outcome))
						})
					]
				}, service.title))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "How an engagement runs",
			title: "From audit to governed production.",
			lede: "Four phases, in order. Each one ends with evidence — a register, a harness, a baseline — that gates the next.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepList, { steps: engagement })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Fit",
			title: "What we say no to.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: refusals.map((refusal) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Callout, {
					label: refusal.label,
					children: refusal.body
				}, refusal.label))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/contact",
						children: "Start from source"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/architecture",
						children: "Read the architecture"
					})
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/contact",
				label: "Contact"
			},
			next: [{
				to: "/developers",
				label: "Developers",
				body: "What you can run without an engagement."
			}, {
				to: "/company",
				label: "Company",
				body: "Who ships this, and under which rules."
			}]
		})
	] });
}
//#endregion
export { ServicesPage as component };
