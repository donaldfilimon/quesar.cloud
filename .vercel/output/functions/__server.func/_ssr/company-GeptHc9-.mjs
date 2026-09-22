import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _ as ProvTag, _t as site, tt as investor } from "./router-CTU_BGql.mjs";
import { c as PullQuote, p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, l as IntegrityList } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/company-GeptHc9-.js
var import_jsx_runtime = require_jsx_runtime();
function CompanyPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Company",
			title: "Three voices. One substrate. Yours alone.",
			lede: site.origin,
			atmosphere: "lab"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Entity",
			title: "Who ships this.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-xl",
					children: "MLAI Corporation"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm leading-relaxed text-fg-muted",
					children: [
						"Legal name: ",
						site.legal,
						". ",
						investor.entity,
						". Public orientation lives here. Integration source lives on GitHub. This website does not host assistant sessions or generation."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl",
						children: "Donald Filimon"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-fg-muted",
						children: "Founder and systems architect. Public work spans Rust, Swift, and TypeScript — ABI, WDBX, Abbey, Gama, and the company site. Motto used in internal docs: care first, clarity always, competence throughout."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-2 text-sm text-fg-muted",
						children: investor.founder.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex flex-wrap items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.k }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: row.tag })]
						}, row.k))
					})
				] })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Origin",
			title: "Why three, not one.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PullQuote, { children: site.origin })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Integrity",
			title: "Rules that cost more to break than any asset.",
			lede: "Copied from the public skill-creator skill. They apply to this site as written.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrityList, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Public work",
			title: "Source is the contact path.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-sm leading-relaxed text-fg-muted",
				children: "Issues, setup questions, and patches belong on the pages that implement each surface. There is an inquiry form on this site. It does not send mail; signed-in notes land in the field console."
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/source",
				label: "Source catalog"
			},
			secondary: [{
				to: "/contact",
				label: "Contact"
			}, {
				to: "/investors",
				label: "Investors"
			}],
			next: [{
				to: "/services",
				label: "Services",
				body: "How an engagement actually runs."
			}, {
				to: "/developers",
				label: "Developers",
				body: "Public trees and gates."
			}]
		})
	] });
}
//#endregion
export { CompanyPage as component };
