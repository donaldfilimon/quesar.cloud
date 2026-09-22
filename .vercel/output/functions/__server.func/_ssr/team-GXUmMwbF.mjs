import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { M as team } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-GXUmMwbF.js
var import_jsx_runtime = require_jsx_runtime();
function TeamPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Team",
			title: "A small company. Public source.",
			lede: "People who ship the trees this site orients."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: team.map((person) => ({
			title: person.name,
			body: person.tagline ?? person.bio,
			kicker: person.role,
			href: person.slug ? `/team/${person.slug}` : void 0
		})) }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/company",
				label: "Company"
			},
			next: [{
				to: "/about",
				label: "About",
				body: "Values and registration-level facts."
			}, {
				to: "/developers",
				label: "Developers",
				body: "The public tree this team ships."
			}]
		})
	] });
}
//#endregion
export { TeamPage as component };
