import { V as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { E as projects, a as Route$10 } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, n as BulletSurface, t as AppLink } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/projects._slug-BKnOrpZm.js
var import_jsx_runtime = require_jsx_runtime();
function ProjectPage() {
	const { slug } = Route$10.useParams();
	const project = projects.find((item) => item.slug === slug);
	if (!project) throw notFound();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: project.kind,
			title: project.name,
			lede: project.tagline
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-3xl text-base leading-relaxed text-fg-muted",
				children: project.description
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletSurface, { items: project.scope })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
					children: "Limit"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-relaxed text-fg-muted",
					children: project.limit
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
					to: project.source.url,
					className: "text-accent",
					children: project.source.title
				})
			})
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: project.docsHref,
				label: "Docs"
			},
			secondary: [{
				to: "/projects",
				label: "Directory"
			}],
			next: [{
				to: "/architecture",
				label: "Architecture",
				body: "Where this project sits on the stack."
			}]
		})
	] });
}
//#endregion
export { ProjectPage as component };
