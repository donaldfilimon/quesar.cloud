import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { G as architectureNodes, I as cn, nt as layerCopy, v as Hint } from "./router-CTU_BGql.mjs";
import { a as Instrument } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { t as Separator } from "./separator-C6eDeJ8k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/architecture-diagram-6BkP2AZR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DESKTOP_ORDER = [
	["user"],
	["quesar"],
	["abi", "tools"],
	["router", "context"],
	["wdbx"],
	[
		"memory",
		"embed",
		"provenance"
	],
	["compute"],
	["output"]
];
function accentFor(id) {
	if (id === "abi" || id === "tools" || id === "router" || id === "context") return "abi";
	if (id === "wdbx" || id === "memory" || id === "embed" || id === "provenance") return "wdbx";
	if (id === "user" || id === "output") return "abbey";
	return "accent";
}
var borderByAccent = {
	abi: "border-l-abi",
	wdbx: "border-l-wdbx",
	abbey: "border-l-abbey",
	accent: "border-l-accent"
};
var ringByAccent = {
	abi: "ring-abi/50",
	wdbx: "ring-wdbx/50",
	abbey: "ring-abbey/50",
	accent: "ring-accent/50"
};
function nodeById(id) {
	const found = architectureNodes.find((n) => n.id === id);
	if (!found) throw new Error(`Unknown architecture node: ${id}`);
	return found;
}
function ArchitectureDiagram({ compact = false, selectedId, onSelect }) {
	const [internal, setInternal] = (0, import_react.useState)(selectedId ?? "quesar");
	const labelId = (0, import_react.useId)();
	const selected = selectedId ?? internal;
	const node = (0, import_react.useMemo)(() => nodeById(selected), [selected]);
	(0, import_react.useEffect)(() => {
		if (selectedId) setInternal(selectedId);
	}, [selectedId]);
	function select(id) {
		setInternal(id);
		onSelect?.(id);
	}
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
			const target = event.target;
			if (!target?.dataset.nodeId) return;
			const ids = architectureNodes.map((n) => n.id);
			const index = ids.indexOf(target.dataset.nodeId);
			if (index < 0) return;
			event.preventDefault();
			const next = event.key === "ArrowRight" ? ids[(index + 1) % ids.length] : ids[(index - 1 + ids.length) % ids.length];
			select(next);
			document.getElementById(`arch-node-${next}`)?.focus();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onSelect]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Instrument, {
			serial: "quesar · architecture",
			status: "select a node",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				role: "listbox",
				"aria-labelledby": labelId,
				"aria-activedescendant": `arch-node-${selected}`,
				className: "p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: labelId,
						className: "sr-only",
						children: "Architecture. Use arrow keys to move between components. Enter selects. The inspector lists what is current in source versus what is not claimed."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-4 flex flex-wrap gap-x-4 gap-y-1 px-1",
						children: Object.keys(layerCopy).map((layer) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[0.62rem] tracking-[0.12em] text-fg-subtle uppercase",
							children: layerCopy[layer]
						}, layer))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden flex-col items-stretch gap-0 md:flex",
						children: DESKTOP_ORDER.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("grid gap-2", row.length === 1 && "grid-cols-1 place-items-center", row.length === 2 && "grid-cols-2", row.length === 3 && "grid-cols-3"),
							children: row.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeButton, {
								node: nodeById(id),
								selected: selected === id,
								onSelect: select
							}, id))
						}), rowIndex < DESKTOP_ORDER.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlowRail, {}) : null] }, row.join("-")))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "flex flex-col gap-2 md:hidden",
						children: architectureNodes.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeButton, {
							node: item,
							selected: selected === item.id,
							onSelect: select,
							stacked: true
						}), index < architectureNodes.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto h-3 w-px bg-border",
							"aria-hidden": "true"
						}) : null] }, item.id))
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "rounded-[28px] bg-bg-elevated p-6 shadow-[var(--shadow-border)] sm:p-7",
			"aria-live": "polite",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.14em] text-fg-subtle uppercase",
					children: layerCopy[node.layer]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-2xl tracking-tight",
						children: node.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: node.status })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-relaxed text-fg-muted",
					children: compact ? node.summary : node.detail
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CapabilityList, {
					title: "Current in source",
					items: node.implemented,
					positive: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "my-5" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CapabilityList, {
					title: "Not claimed",
					items: node.notClaimed,
					className: "mt-0"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase",
					children: "Arrow keys move between nodes"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/console",
								search: { node: node.id },
								children: "Save a field note"
							})
						}),
						compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/architecture",
								search: { node: node.id },
								children: "Open full architecture"
							})
						}) : null,
						node.href ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: node.href,
								children: [
									"Read the ",
									node.name,
									" page"
								]
							})
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hint, {
							label: "Copy a shareable URL for this node",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "inline-flex h-11 items-center px-3 text-sm font-medium text-fg-muted hover:text-fg",
								onClick: () => {
									const url = `${window.location.origin}/architecture?node=${node.id}`;
									navigator.clipboard.writeText(url).then(() => toast.success("Node link copied."), () => toast.error("Could not copy the node link."));
								},
								children: "Copy node link"
							})
						})
					]
				})
			]
		})]
	});
}
function FlowRail() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-7 items-center justify-center",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
			width: "12",
			height: "28",
			viewBox: "0 0 12 28",
			className: "text-accent",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				className: "flow-line",
				x1: "6",
				y1: "0",
				x2: "6",
				y2: "28",
				stroke: "currentColor",
				strokeWidth: "1.25",
				opacity: "0.7"
			})
		})
	});
}
function NodeButton({ node, selected, onSelect, stacked }) {
	const accent = accentFor(node.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		id: `arch-node-${node.id}${stacked ? "-m" : ""}`,
		role: "option",
		"aria-selected": selected,
		"data-node-id": node.id,
		onClick: () => onSelect(node.id),
		onFocus: () => onSelect(node.id),
		className: cn("w-full rounded-[12px] border-l-4 px-3 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150", stacked ? "bg-bg" : "max-w-md bg-bg", borderByAccent[accent], selected ? cn("bg-bg-subtle shadow-[var(--shadow-border-hover)] ring-1", ringByAccent[accent]) : "hover:shadow-[var(--shadow-border-hover)]"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: node.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: node.status })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-1 block text-xs leading-relaxed text-fg-muted",
			children: node.summary
		})]
	});
}
function CapabilityList({ title, items, positive, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("mt-5", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[0.65rem] tracking-[0.14em] text-fg-subtle uppercase",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2 space-y-1.5",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-2 text-sm text-fg-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("mt-1.5 size-1.5 shrink-0 rounded-full", positive ? "bg-status-current" : "bg-border-strong"),
					"aria-hidden": "true"
				}), item]
			}, item))
		})]
	});
}
//#endregion
export { ArchitectureDiagram as t };
