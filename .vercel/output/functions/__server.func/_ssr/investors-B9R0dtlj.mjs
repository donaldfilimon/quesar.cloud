import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { _ as ProvTag, tt as investor } from "./router-CTU_BGql.mjs";
import { d as SpecList, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose, g as StatGrid, u as MetricCard } from "./catalog-mPups2gl.mjs";
import { t as JourneyRail } from "./journey-rail-2M6pcVAU.mjs";
import { a as Bar, i as CartesianGrid, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/investors-B9R0dtlj.js
var import_jsx_runtime = require_jsx_runtime();
var data$1 = investor.arr.map((row) => ({
	year: row.year,
	value: Number(row.v)
}));
function ArrChart() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "surface h-64 p-4 sm:h-72",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
				data: data$1,
				margin: {
					top: 8,
					right: 8,
					left: 0,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--border)",
						vertical: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "year",
						tick: {
							fill: "var(--fg-subtle)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						tick: {
							fill: "var(--fg-subtle)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false,
						tickFormatter: (v) => `$${v}M`,
						width: 44
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						cursor: { fill: "color-mix(in oklab, var(--accent) 10%, transparent)" },
						contentStyle: {
							background: "var(--bg-elevated)",
							border: "1px solid var(--border)",
							borderRadius: 8,
							color: "var(--fg)",
							fontSize: 12
						},
						formatter: (value) => [`$${value}M`, "ARR target"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						dataKey: "value",
						fill: "var(--accent)",
						radius: [
							6,
							6,
							0,
							0
						],
						maxBarSize: 48
					})
				]
			})
		})
	});
}
var data = investor.market.map((row) => ({
	k: row.k,
	value: Number(row.v.replace(/[^\d.]/g, "")),
	label: row.v
}));
function TamChart() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "surface h-56 p-4 sm:h-64",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
				data,
				layout: "vertical",
				margin: {
					top: 8,
					right: 16,
					left: 8,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--border)",
						horizontal: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						type: "number",
						tick: {
							fill: "var(--fg-subtle)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false,
						tickFormatter: (v) => `$${v}B`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						type: "category",
						dataKey: "k",
						tick: {
							fill: "var(--fg-subtle)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false,
						width: 44
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						cursor: { fill: "color-mix(in oklab, var(--accent) 10%, transparent)" },
						contentStyle: {
							background: "var(--bg-elevated)",
							border: "1px solid var(--border)",
							borderRadius: 8,
							color: "var(--fg)",
							fontSize: 12
						},
						formatter: (value, _name, item) => {
							return [(item?.payload)?.label ?? `$${value}B`, "Category sizing · target"];
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						dataKey: "value",
						fill: "var(--accent)",
						radius: [
							0,
							6,
							6,
							0
						],
						maxBarSize: 28
					})
				]
			})
		})
	});
}
function InvestorsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Investors",
			title: "An engineer who tells you the truth, including the parts that are still a target.",
			lede: "Figures on this page come from the public skill-creator master reference. Every number is tagged. ARR, unit economics, and the 295× GPU figure are targets. They are not results.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "measured" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "reported" })
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JourneyRail, { current: "investors" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Entity",
			title: investor.entity,
			lede: "TAM, SAM, and SOM are category sizing. None of them is a booking.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-4 flex flex-wrap gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TamChart, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid gap-4 md:grid-cols-3",
					children: investor.market.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
						k: row.k,
						v: row.v,
						note: row.note,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: row.tag })
					}, row.k))
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Raise",
			title: `${investor.raise.round} ${investor.raise.amount}`,
			lede: "Use of funds is a plan, not a spend record.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-3",
				children: investor.funds.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
					k: row.k,
					v: row.v,
					sub: row.p
				}, row.k))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Unit economics",
			title: "All four are targets.",
			lede: "Nothing here is a measured operating result.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecList, { rows: investor.unit })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "ARR projection",
			title: "Million-dollar figures, tagged as targets.",
			lede: "A projection is not a booking. Do not cite these as revenue.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "target" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrChart, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-fg-subtle",
					children: "Million-dollar ARR figures on this chart are targets, not results."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatGrid, {
						cells: investor.arr.map((row) => ({
							k: row.year,
							v: `$${row.v}M`,
							tag: "target"
						})),
						columns: "grid-cols-2 sm:grid-cols-5"
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Founder",
			title: "What is measured.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-3",
				children: investor.founder.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "surface flex flex-wrap items-center justify-between gap-3 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-fg",
						children: row.k
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: row.tag })]
				}, row.k))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/architecture",
				label: "Architecture"
			},
			secondary: [{
				to: "/developers",
				label: "Developers"
			}, {
				to: "/skill-creator",
				label: "Master reference"
			}],
			next: [
				{
					to: "/console",
					label: "Field notes",
					body: "Sign in and keep a node-level observation."
				},
				{
					to: "/company",
					label: "Company",
					body: "Entity, team, and public path."
				},
				{
					to: "/contact",
					label: "Contact",
					body: "Source is the public path."
				}
			]
		})
	] });
}
//#endregion
export { InvestorsPage as component };
