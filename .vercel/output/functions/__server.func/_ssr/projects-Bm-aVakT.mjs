import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { E as projects } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/projects-Bm-aVakT.js
var import_jsx_runtime = require_jsx_runtime();
function ProjectsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Projects",
			title: "A directory with the hedges attached.",
			lede: "Each card names scope and a limit. Source pages stay on this site."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: projects.map((project) => ({
			title: project.name,
			body: `${project.tagline} ${project.description}`,
			kicker: project.kind,
			href: `/projects/${project.slug}`
		})) }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/source",
				label: "Source"
			},
			next: [{
				to: "/research",
				label: "Research",
				body: "Ideas with their evidence attached."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Live READMEs when GitHub answers."
			}]
		})
	] });
}
//#endregion
export { ProjectsPage as component };
