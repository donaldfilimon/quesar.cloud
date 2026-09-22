import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { A as productJourneys, k as products } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, o as CopyGrid } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/products-UIhjbfaa.js
var import_jsx_runtime = require_jsx_runtime();
function ProductsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Products",
			title: "Four entries. Each with a limit.",
			lede: "Public entry points belong to this website. Source setup remains authoritative. Local completion does not establish foundation-model quality."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: products.map((product) => {
			const journey = productJourneys.find((item) => item.slug === product.slug);
			return {
				title: product.name,
				body: product.intro,
				kicker: product.kicker,
				href: `/products/${product.slug}`,
				accent: product.accent === "aviva" ? "abi" : product.accent,
				note: journey?.limitation
			};
		}) }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			next: [{
				to: "/quesar",
				label: "Quesar",
				body: "The platform that makes the relationships obvious."
			}, {
				to: "/apps",
				label: "Apps",
				body: "Working orientations of the shipping surfaces."
			}]
		})
	] });
}
//#endregion
export { ProductsPage as component };
