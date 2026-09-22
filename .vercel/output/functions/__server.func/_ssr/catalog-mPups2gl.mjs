import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { I as cn, S as isExternal, _ as ProvTag, at as personas, et as integrityRules, x as internalHref } from "./router-CTU_BGql.mjs";
import { o as NextUp, p as Surface } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalog-mPups2gl.js
var import_jsx_runtime = require_jsx_runtime();
function AppLink({ to, className, children }) {
	const href = internalHref(to);
	if (isExternal(href)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		href,
		className,
		rel: "noreferrer",
		children
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: href,
		className,
		children
	});
}
function CopyGrid({ items, columns = "md:grid-cols-2" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid gap-4", columns),
		children: items.map((item) => {
			const inner = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
				hover: Boolean(item.href),
				accent: item.accent,
				className: "h-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [item.kicker ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
							children: item.kicker
						}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: cn("font-display text-xl", item.kicker && "mt-1"),
							children: item.title
						})] }), item.status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: item.status }) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-fg-muted",
						children: item.body
					}),
					item.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs text-fg-subtle",
						children: item.note
					}) : null
				]
			});
			if (!item.href) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: inner }, item.title);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppLink, {
				to: item.href,
				className: "no-underline",
				children: inner
			}, item.title);
		})
	});
}
function NamedGrid({ items, accent, nameClass, columns = "sm:grid-cols-2" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: cn("grid gap-3", columns),
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
			accent,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("font-mono text-sm", nameClass),
				children: item.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: item.body
			})]
		}) }, item.name))
	});
}
function CommandList({ rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "divide-y divide-border overflow-hidden rounded-xl shadow-[var(--shadow-border)]",
		children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "bg-bg-elevated px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.8rem] text-fg",
				children: row.cmd
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-fg-muted",
				children: row.note
			})]
		}, row.cmd))
	});
}
function DataTable({ columns, rows, rowKey, minWidth = "36rem" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto rounded-xl shadow-[var(--shadow-border)]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full text-left text-sm",
			style: { minWidth },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "bg-bg-elevated text-fg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: columns.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "px-4 py-3 font-medium",
					children: col.header
				}, col.header)) })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
				className: "divide-y divide-border bg-bg",
				children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: columns.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: cn("px-4 py-3", col.className),
					children: col.cell(row)
				}, col.header)) }, rowKey(row)))
			})]
		})
	});
}
var personaDot = {
	abbey: "bg-persona-abbey",
	aviva: "bg-persona-aviva",
	abi: "bg-persona-abi"
};
function PersonaGrid({ items = personas }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-4 md:grid-cols-3",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
			accent: item.color === "abi" ? "wdbx" : item.color,
			className: "p-7",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "flex items-center gap-2.5 font-display text-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("size-2.5 rounded-full", personaDot[item.id]),
						"aria-hidden": "true"
					}), item.name]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 font-mono text-[11px] tracking-wide text-fg-subtle uppercase",
					children: item.role
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-relaxed text-fg-muted",
					children: item.body
				})
			]
		}, item.id))
	});
}
function StatGrid({ cells, columns = "sm:grid-cols-2 lg:grid-cols-4" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid gap-4", columns),
		children: cells.map((cell) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface p-4 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-3xl tabular",
					children: cell.v
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 font-mono text-[10px] tracking-wide text-fg-subtle uppercase",
					children: cell.k
				}),
				cell.tag ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: cell.tag })
				}) : null
			]
		}, cell.k))
	});
}
function ClaimList({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grid gap-2 text-sm text-fg-muted sm:grid-cols-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-status-planned",
				"aria-hidden": "true",
				children: "○"
			}), item]
		}, item))
	});
}
function IntegrityList({ rules = integrityRules }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grid gap-3 md:grid-cols-2",
		children: rules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
				children: rule.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: rule.body
			})]
		}, rule.title))
	});
}
function ProjectRows({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: item.href,
		className: "project-row",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[11px] text-fg-subtle",
				children: String(index + 1).padStart(2, "0")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "project-row-name font-display text-3xl tracking-tight",
				children: item.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "project-row-copy text-sm leading-relaxed text-fg-muted",
				children: item.oneLiner
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "project-row-status",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: item.status })
			})
		]
	}, item.href)) });
}
function TruthList({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "truth-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-sm text-accent",
			children: item.n ?? String(index + 1).padStart(2, "0")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "font-display text-2xl tracking-tight",
			children: item.title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base",
			children: item.body
		})] })]
	}, item.title)) });
}
function MetricCard({ k, v, note, sub, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] tracking-wide text-fg-subtle uppercase",
			children: k
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 font-display text-3xl tabular",
			children: v
		}),
		sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-sm text-fg-muted",
			children: sub
		}) : null,
		note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-fg-muted",
			children: note
		}) : null,
		children ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3",
			children
		}) : null
	] });
}
function Actions({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-3",
		children
	});
}
function PageClose({ primary, secondary, next }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
		children: [primary || secondary?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Actions, { children: [primary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: primary.to,
				children: primary.label
			})
		}) : null, secondary?.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "secondary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: item.to,
				children: item.label
			})
		}, item.to))] }) : null, next ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: primary || secondary?.length ? "mt-10" : void 0,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NextUp, { items: next })
		}) : null]
	});
}
function BulletSurface({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grid gap-3 text-sm text-fg-muted sm:grid-cols-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			className: "surface px-4 py-3",
			children: item
		}, item))
	});
}
function HeroStatus({ status, note }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 flex flex-wrap items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status }), note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm text-fg-muted",
			children: note
		}) : null]
	});
}
function ChipRow({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "rounded-full bg-bg-subtle px-3 py-1 font-mono text-[11px] text-fg-muted",
			children: item
		}, item))
	});
}
function Pager({ index, prev, next }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-12 flex flex-wrap gap-4 text-sm",
		children: [
			index ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: index.to,
				className: "text-accent",
				children: index.label
			}) : null,
			prev ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: prev.to,
				className: "text-fg-muted hover:text-fg",
				children: prev.label
			}) : null,
			next ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: next.to,
				className: "text-fg-muted hover:text-fg",
				children: next.label
			}) : null
		]
	});
}
//#endregion
export { TruthList as _, CommandList as a, HeroStatus as c, NamedGrid as d, PageClose as f, StatGrid as g, ProjectRows as h, ClaimList as i, IntegrityList as l, PersonaGrid as m, BulletSurface as n, CopyGrid as o, Pager as p, ChipRow as r, DataTable as s, AppLink as t, MetricCard as u };
