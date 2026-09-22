import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { $ as integrationApps, I as cn, Q as homeStart, X as homePrivacy, Y as faqs, Z as homeProposition, _ as ProvTag, _t as site, et as integrityRules, g as ProvLegend, m as SignedOut, ot as products, p as SignedIn, vt as statusCopy, xt as wdbxSpecs } from "./router-CTU_BGql.mjs";
import { a as Instrument, i as FaqList, l as Readout, m as Ticks, p as Surface, t as AtmosphereMedia, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { _ as TruthList, h as ProjectRows, l as IntegrityList, m as PersonaGrid, o as CopyGrid, s as DataTable } from "./catalog-mPups2gl.mjs";
import { t as ArchitectureDiagram } from "./architecture-diagram-6BkP2AZR.mjs";
import { t as RepoList } from "./repo-list-CMBRkS91.mjs";
import { n as SourcePanel } from "./source-panel-Cc4s05EQ.mjs";
import { t as ChipCutaway } from "./chip-cutaway-Cx-Jpi1M.mjs";
import { t as Trailer } from "./trailer-ByVOpF8h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-QbUJ9hcv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function seeded(seed) {
	let s = seed;
	return () => {
		s = s * 16807 % 2147483647;
		return (s - 1) / 2147483646;
	};
}
function hexAlpha(hex, alpha) {
	const n = hex.replace("#", "").trim();
	if (n.length < 6) return `rgba(110, 202, 216, ${alpha})`;
	return `rgba(${Number.parseInt(n.slice(0, 2), 16)}, ${Number.parseInt(n.slice(2, 4), 16)}, ${Number.parseInt(n.slice(4, 6), 16)}, ${alpha})`;
}
function HeroField() {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const surface = canvas;
		const g = ctx;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const rand = seeded(42);
		const nodes = Array.from({ length: 26 }, () => ({
			x: rand(),
			y: rand(),
			r: 1.1 + rand() * 1.6,
			vx: (rand() - .5) * 18e-5,
			vy: (rand() - .5) * 18e-5
		}));
		const edges = [];
		for (let i = 0; i < nodes.length; i += 1) for (let j = i + 1; j < nodes.length; j += 1) {
			const dx = nodes[i].x - nodes[j].x;
			const dy = nodes[i].y - nodes[j].y;
			if (dx * dx + dy * dy < .085) edges.push({
				a: i,
				b: j,
				t: rand(),
				speed: .0012 + rand() * .0018
			});
		}
		const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6ecad8";
		const accent = raw.startsWith("#") ? raw : "#6ecad8";
		const line = hexAlpha(accent, .28);
		const particle = hexAlpha(accent, .92);
		let frame = 0;
		let running = true;
		const io = new IntersectionObserver(([entry]) => {
			running = entry.isIntersecting;
		}, { threshold: .05 });
		io.observe(surface);
		function resize() {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const { width, height } = surface.getBoundingClientRect();
			surface.width = Math.max(1, Math.floor(width * dpr));
			surface.height = Math.max(1, Math.floor(height * dpr));
			g.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		function paint(animate) {
			const { width, height } = surface.getBoundingClientRect();
			g.clearRect(0, 0, width, height);
			g.lineWidth = 1;
			if (animate) for (const node of nodes) {
				node.x += node.vx;
				node.y += node.vy;
				if (node.x < .04 || node.x > .96) node.vx *= -1;
				if (node.y < .06 || node.y > .94) node.vy *= -1;
			}
			for (const link of edges) {
				const a = nodes[link.a];
				const b = nodes[link.b];
				const x1 = a.x * width;
				const y1 = a.y * height;
				const x2 = b.x * width;
				const y2 = b.y * height;
				g.strokeStyle = line;
				g.globalAlpha = .7;
				g.beginPath();
				g.moveTo(x1, y1);
				g.lineTo(x2, y2);
				g.stroke();
				if (animate) {
					link.t = (link.t + link.speed) % 1;
					const px = x1 + (x2 - x1) * link.t;
					const py = y1 + (y2 - y1) * link.t;
					g.globalAlpha = .95;
					g.fillStyle = particle;
					g.beginPath();
					g.arc(px, py, 1.15, 0, Math.PI * 2);
					g.fill();
				}
			}
			g.globalAlpha = 1;
			for (const node of nodes) {
				g.fillStyle = accent;
				g.beginPath();
				g.arc(node.x * width, node.y * height, node.r, 0, Math.PI * 2);
				g.fill();
			}
		}
		function loop() {
			if (running) paint(true);
			frame = window.requestAnimationFrame(loop);
		}
		resize();
		paint(false);
		window.addEventListener("resize", resize);
		if (!reduce) frame = window.requestAnimationFrame(loop);
		return () => {
			running = false;
			io.disconnect();
			window.removeEventListener("resize", resize);
			window.cancelAnimationFrame(frame);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "hero-field",
		"aria-hidden": "true"
	});
}
var rows = [
	{
		src: "runbook/retention-policy.md",
		weight: "0.94",
		width: "94%",
		excerpt: "EU records stay in-region; no cross-border egress.",
		id: "blk_8f21c4",
		parent: "a17d…",
		persona: "Aviva",
		node: "bg-persona-aviva",
		bar: "bg-persona-aviva",
		label: "text-persona-aviva"
	},
	{
		src: "contracts/dpa-2026.pdf",
		weight: "0.71",
		width: "71%",
		excerpt: "Processor may not sub-process without written notice.",
		id: "blk_8f21b0",
		parent: "6c02…",
		persona: "Abi",
		node: "bg-persona-abi",
		bar: "bg-persona-abi",
		label: "text-persona-abi"
	},
	{
		src: "thread/eng-platform#412",
		weight: "0.38",
		width: "38%",
		excerpt: "Earlier draft — superseded, retained for audit.",
		id: "blk_8f2196",
		parent: "3e9f…",
		persona: "Abbey",
		node: "bg-persona-abbey",
		bar: "bg-persona-abbey",
		label: "text-persona-abbey"
	}
];
/** Signature Lab element: a weighted, hash-chained backtrace. Illustrative. */
function Backtrace({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Instrument, {
		serial: "wdbx · backtrace",
		status: "chain verified",
		caption: "Illustrative trace. Meter width is the weight — never a live scoreboard.",
		className,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 pt-5 pb-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase",
				children: "Answer"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-display text-xl leading-snug italic sm:text-[1.35rem]",
				children: "“Keep the German customer records in-region.”"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative px-5 pb-5 pt-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-5 bottom-12 left-[1.55rem] w-px bg-gradient-to-b from-accent/80 to-border",
				"aria-hidden": "true"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "relative space-y-2.5",
				children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("relative z-1 mt-3.5 size-2.5 shrink-0 rounded-full ring-4 ring-bg-elevated", row.node),
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1 rounded-[10px] bg-bg p-3.5 shadow-[var(--shadow-border)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate font-mono text-[11px] text-fg-muted",
									children: row.src
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("font-mono text-[11px] tabular-nums", row.label),
									children: row.weight
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1.5 text-[13px] leading-snug text-fg",
								children: row.excerpt
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2.5 h-0.5 overflow-hidden rounded-full bg-fg/10",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: cn("block h-full rounded-full opacity-70", row.bar),
									style: { width: row.width }
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex gap-3 font-mono text-[10px] text-fg-subtle",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.id }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["← parent ", row.parent] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("ml-auto", row.label),
										children: row.persona
									})
								]
							})
						]
					})]
				}, row.id))
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", {
			type: "application/ld+json",
			dangerouslySetInnerHTML: { __html: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "Organization",
				name: "MLAI Corporation",
				legalName: site.legal,
				url: "https://quesar.cloud/",
				description: site.mission,
				sameAs: [
					"https://github.com/donaldfilimon/MLAI-CORPORATION-WWW",
					"https://github.com/donaldfilimon/abi",
					"https://github.com/donaldfilimon/wdbx",
					"https://github.com/donaldfilimon/abbey",
					"https://github.com/donaldfilimon/skill-creator",
					"https://github.com/donaldfilimon/gama"
				]
			}) }
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hero, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeJump, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			id: "origin",
			className: "statement-band scroll-mt-32",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "Origin"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
					className: "mt-8 max-w-4xl font-display text-[1.85rem] leading-[1.18] tracking-tight italic sm:text-4xl lg:text-[2.75rem]",
					children: site.origin
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			id: "stack",
			className: "scroll-mt-32",
			eyebrow: "Stack",
			title: "Abbey on ABI on WDBX.",
			lede: "The M in the mark is a weighted directed graph. The stack is the same shape: application, compute, storage — inspectable at every node.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipCutaway, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeArchitecture, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			id: "trailer",
			className: "scroll-mt-32 border-y border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "Trailer"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 grid items-end gap-12 lg:grid-cols-[1.1fr_0.9fr]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "section-title max-w-2xl",
							children: "Infrastructure first. Then the assistant."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 max-w-xl text-fg-muted",
							children: "Architecture labels, not a live runtime. Start with Quesar for the product picture, or keep a field note on a node after you sign in."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-9 flex flex-wrap gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									size: "lg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/quesar",
										children: "Explore Quesar"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "secondary",
									size: "lg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/login",
										search: { next: "/console" },
										children: "Sign in for field notes"
									})
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "secondary",
									size: "lg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/console",
										children: "Open field notes"
									})
								}) })
							]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trailer, {})]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Orientation",
			title: "Start simple. Then inspect the machinery.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruthList, { items: homeProposition }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrityList, { rules: integrityRules.slice(0, 3) })
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Personas",
			title: "Abbey, Aviva, Abi.",
			lede: "Three profiles share one core. Product accents and persona colors are different axes: the ABI product is violet; the Abi persona is cyan. A reader learns each color once.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonaGrid, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Memory, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			id: "products",
			eyebrow: "System",
			title: "Three layers. One chip.",
			lede: "Abbey is the human-facing experience. ABI is orchestration. WDBX is the memory substrate. Quesar is the platform that makes the relationships obvious.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectRows, { items: products })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Active Rust substrate",
			title: "Retrieval facts, sourced from the implementation.",
			lede: "The active crate — not a frozen documentation mirror — is authoritative. These are configuration facts, not benchmark claims.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-[1.1fr_0.9fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					accent: "wdbx",
					className: "p-8",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-3xl tracking-tight",
							children: "Inspectable nearest-neighbor retrieval."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-xl text-sm leading-relaxed text-fg-muted",
							children: "The substrate implements a layered HNSW graph, validates structure, rebuilds against real vectors in tests, and pairs retrieval with MVCC. It does not claim production multi-host sharding."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag: "measured" })
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
					className: "surface divide-y divide-border overflow-hidden",
					children: wdbxSpecs.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-4 px-5 py-3.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "font-mono text-[11px] tracking-wide text-fg-subtle uppercase",
							children: row.k
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-mono text-sm text-fg",
							children: row.v
						})]
					}, row.k))
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 text-sm text-fg-subtle",
				children: "Graph defaults above are implementation configuration. They are not recall, QPS, or latency claims."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "GitHub",
			title: "The public tree is the source of truth.",
			lede: "Live metadata from donaldfilimon when GitHub answers. Independent gates: a green web check is not mobile evidence.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcePanel, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
						rows: integrationApps,
						rowKey: (row) => row.path,
						columns: [
							{
								header: "Path",
								className: "font-mono text-[12px]",
								cell: (row) => row.path
							},
							{
								header: "Purpose",
								className: "text-fg-muted",
								cell: (row) => row.purpose
							},
							{
								header: "Gate",
								className: "font-mono text-[11px] text-fg-subtle",
								cell: (row) => row.gate
							},
							{
								header: "Status",
								cell: (row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: row.status })
							}
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RepoList, { compact: true }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/developers",
							children: "Open the source index"
						})
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "Start",
			title: "What would you like to do?",
			lede: "Orientation here. Setup in docs and apps. Each surface has its own gate — a green web check is not mobile evidence.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: homeStart })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative overflow-hidden border-y border-border",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtmosphereMedia, { still: "/media/atmosphere-lab.jpg" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-vignette pointer-events-none absolute inset-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "mb-12 max-w-3xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "eyebrow",
									children: "Privacy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "section-title mt-4",
									children: "Privacy is architecture, not a slogan."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg",
									children: "Data ownership, local processing, controlled memory, and provenance are mechanisms. They have scope. The scope is documented."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyGrid, { items: homePrivacy }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-8 max-w-2xl text-sm text-fg-subtle",
							children: site.apple
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			eyebrow: "FAQ",
			title: "Short answers. No borrowed benchmarks.",
			lede: "Native disclosure. If a number is not in the public skill-creator master reference, it does not ship.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaqList, { items: faqs })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			eyebrow: "Status",
			title: "Labels are not interchangeable.",
			lede: "Current, Partial, Experimental, In development, Planned, and Research mean different things. Planned functionality is never presented as shipping. Figures carry a separate provenance tag.",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
				children: Object.keys(statusCopy).map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "surface p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: key }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: statusCopy[key].meaning
					})]
				}, key))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvLegend, { className: "mt-8" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "border-t border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-6xl px-4 py-24 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "eyebrow",
						children: "Next"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "section-title mt-4 max-w-2xl",
						children: "Inspect the stack, or keep a note."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-9 flex flex-wrap gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								size: "lg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/architecture",
									children: "Architecture"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								size: "lg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/investors",
									children: "Investors"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "ghost",
								size: "lg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/developers",
									children: "Developers"
								})
							})
						]
					})
				]
			})
		})
	] });
}
var HOME_JUMP = [
	{
		href: "#origin",
		label: "Origin"
	},
	{
		href: "#stack",
		label: "Stack"
	},
	{
		href: "#architecture",
		label: "Architecture"
	},
	{
		href: "#trailer",
		label: "Trailer"
	}
];
function HomeJump() {
	const [active, setActive] = (0, import_react.useState)("#origin");
	(0, import_react.useEffect)(() => {
		const observer = new IntersectionObserver((entries) => {
			const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (!visible?.target.id) return;
			setActive(`#${visible.target.id}`);
		}, {
			rootMargin: "-28% 0px -58% 0px",
			threshold: [
				.1,
				.35,
				.6
			]
		});
		for (const item of HOME_JUMP) {
			const el = document.getElementById(item.href.slice(1));
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		"aria-label": "On this page",
		className: "sticky top-16 z-30 border-b border-border bg-bg/78 backdrop-blur-md",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6",
			children: HOME_JUMP.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: item.href,
				"aria-current": active === item.href ? "location" : void 0,
				className: cn("inline-flex h-11 items-center px-3 text-sm no-underline", active === item.href ? "text-fg" : "text-fg-muted hover:text-fg"),
				children: item.label
			}) }, item.href))
		})
	});
}
function HomeArchitecture() {
	const [node, setNode] = (0, import_react.useState)("quesar");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
		id: "architecture",
		className: "scroll-mt-32",
		eyebrow: "Architecture",
		title: "The interface is a window into the system.",
		lede: "Click a node. The inspector lists what is current in source versus what is not claimed. Select a component, then save a field note after you sign in.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureDiagram, {
			compact: true,
			selectedId: node,
			onSelect: setNode
		})
	});
}
function Hero() {
	const stage = (0, import_react.useRef)(null);
	function onMove(event) {
		const el = stage.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
		el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		ref: stage,
		onMouseMove: onMove,
		className: "hero-grid relative overflow-hidden border-b border-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtmosphereMedia, {
				still: "/media/atmosphere-wafer.jpg",
				video: "/media/atmosphere-wafer.mp4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroField, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-wash pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-vignette pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-spot pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:py-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticks, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "stagger-in relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "Quesar by MLAI"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "display-title mt-6",
								children: [
									"Private intelligence,",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "built around you." })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-7 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg",
								children: "Quesar is MLAI's infrastructure for persistent, adaptive AI — orchestration you can inspect, memory that keeps a chain, compute that stays on machines you own."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-9 flex flex-wrap gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										asChild: true,
										size: "lg",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/quesar",
											children: "Explore Quesar"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										asChild: true,
										variant: "secondary",
										size: "lg",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/architecture",
											children: "Explore the architecture"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										asChild: true,
										variant: "ghost",
										size: "lg",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/developers",
											children: "Read the source"
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-12 grid grid-cols-3 gap-3 border-t border-border pt-6 sm:gap-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readout, {
										k: "Posture",
										v: "Local-first"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readout, {
										k: "Memory",
										v: "Provenance-aware"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readout, {
										k: "Source",
										v: "Inspectable"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Backtrace, {})
					})
				]
			})
		]
	});
}
function Memory() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
		eyebrow: "Memory",
		title: "Sessions forget. Substrates don't.",
		lede: "The problem Quesar is built around is not model quality. It is that conventional assistants discard the record the moment the tab closes.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative overflow-hidden rounded-[28px] bg-bg-elevated shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtmosphereMedia, {
					still: "/media/atmosphere-board.jpg",
					video: "/media/atmosphere-board.mp4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-vignette pointer-events-none absolute inset-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative p-5 sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.65rem] tracking-[0.14em] text-accent uppercase",
							children: "The problem Quesar is built around"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "rounded-[14px] bg-bg/88 p-5 shadow-[var(--shadow-border)] backdrop-blur-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-medium text-fg-subtle",
									children: "Conventional session"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-3 font-mono text-[0.72rem] leading-7 text-fg-muted",
									children: [
										"user: remember the deploy target",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"model: noted",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-status-partial",
											children: "— session ends —"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"user: what was the target",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"model: I don't have that"
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "rounded-[14px] bg-bg/88 p-5 shadow-[var(--shadow-border)] backdrop-blur-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-medium text-fg-subtle",
									children: "WDBX-backed context"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-3 font-mono text-[0.72rem] leading-7 text-fg-muted",
									children: [
										"episode: deploy target recorded",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"provenance: signed, content-addressed",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"retrieval: causal + semantic",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"user: what was the target",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-status-current",
											children: "context is still there"
										})
									]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-xs text-fg-subtle",
							children: "Memory here is a system capability — persistence, retrieval, provenance — not a claim of sentience."
						})
					]
				})
			]
		})
	});
}
//#endregion
export { Home as component };
