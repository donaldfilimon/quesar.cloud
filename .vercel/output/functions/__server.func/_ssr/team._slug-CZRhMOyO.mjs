import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { M as team, n as Route$1 } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
import { t as ArticleBody } from "./article-Cq5ndJM_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team._slug-CZRhMOyO.js
var import_jsx_runtime = require_jsx_runtime();
function TeamProfile() {
	const { slug } = Route$1.useParams();
	const person = team.find((item) => item.slug === slug);
	if (!person) throw notFound();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: person.role,
			title: person.name,
			lede: person.tagline ?? person.bio,
			atmosphere: "lab"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			person.focusAreas?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: person.focusAreas.map((area) => ({
					title: area.title,
					body: area.description
				})) })
			}) : null,
			person.projects?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: person.projects.map((project) => ({
				title: project.name,
				body: project.description,
				note: project.lang,
				href: project.url ?? "/source"
			})) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10",
				children: person.body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArticleBody, { sections: person.body }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg-muted",
					children: person.bio
				})
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/team",
				label: "Team"
			},
			next: [{
				to: "/company",
				label: "Company",
				body: "Registration-level facts."
			}, {
				to: "/source",
				label: "Source",
				body: "The public tree."
			}]
		})
	] });
}
//#endregion
export { TeamProfile as component };
