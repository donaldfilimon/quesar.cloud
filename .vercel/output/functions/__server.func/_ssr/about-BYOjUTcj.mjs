import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _t as site } from "./router-CTU_BGql.mjs";
import { d as SpecList, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, n as BulletSurface, o as CopyGrid } from "./catalog-mPups2gl.mjs";
import { t as about } from "./about-miNX_GPR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/about-BYOjUTcj.js
var import_jsx_runtime = require_jsx_runtime();
function AboutPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "About",
			title: "Safety before scale.",
			lede: site.origin,
			atmosphere: "lab"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Values",
			title: "What the company is for.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: about.values.map((value) => ({
				title: value.title,
				body: value.description
			})) })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Principles",
			title: "Four lines we do not cross.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletSurface, { items: about.operatingPrinciples })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Entity",
			title: "Registration-level facts.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecList, { rows: about.companyFacts })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/company",
				label: "Company"
			},
			secondary: [{
				to: "/team",
				label: "Team"
			}],
			next: [{
				to: "/investors",
				label: "Investors",
				body: "TAM and ARR tagged as targets, not results."
			}, {
				to: "/services",
				label: "Services",
				body: "Integration work with named limits."
			}]
		})
	] });
}
//#endregion
export { AboutPage as component };
