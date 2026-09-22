import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { K as architectureSteps, d as Route$52 } from "./router-CTU_BGql.mjs";
import { f as StepList, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
import { t as JourneyRail } from "./journey-rail-2M6pcVAU.mjs";
import { t as ArchitectureDiagram } from "./architecture-diagram-6BkP2AZR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/architecture-Bj1HdrRi.js
var import_jsx_runtime = require_jsx_runtime();
function ArchitecturePage() {
	const { node } = Route$52.useSearch();
	const navigate = useNavigate({ from: "/architecture" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Architecture",
			title: "From request to record, with every layer named.",
			lede: "Select a component to see what is current in source versus what is not claimed. Motion on the connectors is a reminder that work flows; it is not a performance graph.",
			atmosphere: "board"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JourneyRail, { current: "architecture" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			lede: "Click a node. The inspector lists implemented scope and the claims this site refuses. Save a field note on the same node after you sign in.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureDiagram, {
				selectedId: node ?? "quesar",
				onSelect: (id) => {
					navigate({
						search: { node: id },
						replace: true
					});
				}
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Reading the diagram",
			title: "Input, processing, memory, retrieval, execution, tools, output.",
			lede: "The layers are a map, not a marketing stack. If a name sounds larger than the implementation, the status label is the correction.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepList, { steps: architectureSteps })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/developers",
				label: "Developers"
			},
			secondary: [{
				to: "/investors",
				label: "Investors"
			}],
			next: [
				{
					to: "/console",
					label: "Field notes",
					body: "Sign in and save what is current versus not claimed."
				},
				{
					to: "/developers",
					label: "Developers",
					body: "Live GitHub READMEs when GitHub answers."
				},
				{
					to: "/investors",
					label: "Investors",
					body: "TAM and ARR tagged as targets, not results."
				}
			]
		})
	] });
}
//#endregion
export { ArchitecturePage as component };
