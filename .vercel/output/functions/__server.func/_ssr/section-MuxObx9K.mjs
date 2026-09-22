import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime, a as Trigger2, i as Root2, n as Header, r as Item, t as Content2 } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { l as Check, s as Copy } from "../_libs/lucide-react.mjs";
import { I as cn, _ as ProvTag } from "./router-CTU_BGql.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/section-MuxObx9K.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Accordion = Root2;
function AccordionItem({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
		className: cn("group bg-bg-elevated", className),
		...props
	});
}
function AccordionTrigger({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
		className: "flex",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Trigger2, {
			className: cn("flex min-h-14 flex-1 items-center justify-between gap-4 px-5 py-4 text-left font-medium text-fg", className),
			...props,
			children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-lg leading-none text-accent transition-transform duration-150 group-data-[state=open]:rotate-45",
				"aria-hidden": "true",
				children: "+"
			})]
		})
	});
}
function AccordionContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		className: cn("overflow-hidden data-[state=closed]:h-0", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "px-5 pb-5 text-sm leading-relaxed text-fg-muted",
			children
		})
	});
}
function Eyebrow({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("eyebrow", className),
		children
	});
}
function PullQuote({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
		className: cn("pull-quote text-fg", className),
		children
	});
}
function Callout({ label, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("surface accent-edge p-5 [--edge:var(--accent)]", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm leading-relaxed text-fg-muted",
			children
		})]
	});
}
function StepList({ steps }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "grid gap-4 md:grid-cols-2",
		children: steps.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "surface flex gap-4 p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-9 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[0.7rem] text-accent shadow-[var(--shadow-border)]",
				children: String(index + 1).padStart(2, "0")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-xl",
				children: step.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-relaxed text-fg-muted",
				children: step.body
			})] })]
		}, step.title))
	});
}
function FaqList({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Accordion, {
		type: "multiple",
		className: "divide-y divide-border overflow-hidden rounded-xl shadow-[var(--shadow-border)]",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AccordionItem, {
			value: item.q,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccordionTrigger, { children: item.q }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccordionContent, { children: item.a })]
		}, item.q))
	});
}
function NextUp({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 sm:grid-cols-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: item.to,
			className: "surface surface-hover p-5 no-underline",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
					children: "Next"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-2 font-display text-xl text-fg",
					children: item.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-fg-muted",
					children: item.body
				})
			]
		}, item.to))
	});
}
function CodeBlock({ code, label }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			setCopied(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0 overflow-hidden rounded-lg bg-bg-elevated shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between border-b border-border px-4 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase",
				children: label ?? "source"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => void copy(),
				className: "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] text-fg-muted hover:bg-bg-subtle hover:text-fg",
				children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
					className: "size-3.5",
					strokeWidth: 1.75
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
					className: "size-3.5",
					strokeWidth: 1.75
				}), copied ? "Copied" : "Copy"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "max-w-full overflow-x-auto p-5 font-mono text-[0.8rem] leading-7 text-fg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: code })
		})]
	});
}
function SpecList({ rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "surface divide-y divide-border overflow-hidden",
		children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "font-mono text-[11px] tracking-wide text-fg-subtle uppercase",
				children: row.k
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
				className: "flex items-center gap-2 font-mono text-sm text-fg tabular",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.v }), row.tag ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: row.tag }) : null]
			})]
		}, row.k))
	});
}
function Ticks({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("ticks", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "tick tick-tl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "tick tick-tr" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "tick tick-bl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "tick tick-br" })
		]
	});
}
function Instrument({ serial, status, caption, className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: cn("instrument", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "instrument-chrome",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-bold text-accent",
					children: serial
				}), status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-fg-subtle",
					children: status
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "instrument-body",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticks, {}), children]
			}),
			caption ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
				className: "instrument-caption",
				children: caption
			}) : null
		]
	});
}
function Readout({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "readout",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "readout-k",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "readout-v",
			children: v
		})]
	});
}
function AtmosphereMedia({ still, video, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("atmosphere-media", className),
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: still,
			alt: ""
		}), video ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			autoPlay: true,
			muted: true,
			loop: true,
			playsInline: true,
			preload: "metadata",
			poster: still,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
				src: video,
				type: "video/mp4"
			})
		}) : null]
	});
}
var atmospheres = {
	wafer: { still: "/media/atmosphere-wafer.jpg" },
	lab: { still: "/media/atmosphere-lab.jpg" },
	plates: { still: "/media/atmosphere-plates.jpg" },
	board: { still: "/media/atmosphere-board.jpg" }
};
function Section({ id, eyebrow, title, lede, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id,
		className: cn("mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28", id && !className?.includes("scroll-mt") && "scroll-mt-20", className),
		children: [eyebrow || title || lede ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mb-12 max-w-3xl",
			children: [
				eyebrow ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eyebrow, { children: eyebrow }) : null,
				title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "section-title mt-4 text-fg",
					children: title
				}) : null,
				lede ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg",
					children: lede
				}) : null
			]
		}) : null, children]
	});
}
function PageHero({ eyebrow, title, lede, children, atmosphere = "board" }) {
	const media = atmosphere === "none" ? null : atmospheres[atmosphere];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hero-grid relative overflow-hidden border-b border-border",
		children: [
			media ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtmosphereMedia, { still: media.still }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-wash pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-vignette pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticks, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eyebrow, { children: eyebrow }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-5 max-w-4xl font-display text-4xl leading-[1.02] tracking-tight text-fg sm:text-5xl lg:text-[3.85rem]",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg",
						children: lede
					}),
					children
				]
			})
		]
	});
}
function Surface({ className, accent, hover = false, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
		className: cn("surface accent-edge p-6", hover && "surface-hover", accent && (accent === "abi" ? "[--edge:var(--abi)]" : accent === "wdbx" ? "[--edge:var(--wdbx)]" : accent === "abbey" ? "[--edge:var(--abbey)]" : accent === "aviva" ? "[--edge:var(--aviva)]" : "[--edge:var(--accent)]"), className),
		children
	});
}
//#endregion
export { Instrument as a, PullQuote as c, SpecList as d, StepList as f, FaqList as i, Readout as l, Ticks as m, Callout as n, NextUp as o, Surface as p, CodeBlock as r, PageHero as s, AtmosphereMedia as t, Section as u };
