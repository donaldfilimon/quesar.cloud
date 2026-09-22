import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { V as notFound, _ as createRootRoute, b as useNavigate, d as useRouterState, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, v as Link, x as useRouter, y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime, c as Content, l as Root, u as Trigger } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as __exportAll } from "./ssr.mjs";
import { Et as array, Ft as string, It as union, Mt as object, jt as number, kt as literal, wt as _enum } from "../_libs/@better-auth/core+[...].mjs";
import { i as signOut, t as authClient } from "./client-B40BzJxt.mjs";
import { a as hasGateSessionMarker, n as auth } from "./server-DOaWCH9S.mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as Moon, i as Search, n as TriangleAlert, o as Menu, r as Sun, t as X } from "../_libs/lucide-react.mjs";
import { _ as DialogTrigger$1, d as DialogClose, f as DialogContent$1, g as DialogTitle$1, h as DialogPortal, m as DialogOverlay$1, p as DialogDescription$1, u as Dialog$1 } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as Root2, i as Portal2, n as Item2, o as Separator2, r as Label2, s as Trigger$1, t as Content2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { a as Trigger$2, i as Root3, n as Portal, r as Provider, t as Content2$1 } from "../_libs/radix-ui__react-tooltip.mjs";
import { t as _e } from "../_libs/cmdk.mjs";
import { t as Root$1 } from "../_libs/radix-ui__react-toggle.mjs";
import { n as Root$2, t as Indicator } from "../_libs/radix-ui__react-progress.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/content-D3U0JVK6.js
var site = {
	name: "Quesar",
	company: "MLAI",
	legal: "Machine Learning Advanced Innovations, Inc.",
	description: "Quesar is MLAI's infrastructure for persistent, adaptive AI — inspectable orchestration, provenance-aware memory, and compute that stays on machines you own.",
	mission: "Build assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries.",
	origin: "Three voices, not one: Abbey for care, Aviva for clarity, Abi for competence. One substrate. Yours alone.",
	apple: "MLAI software is independent and is not affiliated with, endorsed by, or sponsored by Apple Inc."
};
var nav = [
	{
		to: "/quesar",
		label: "Quesar"
	},
	{
		to: "/platform",
		label: "Platform"
	},
	{
		to: "/docs",
		label: "Docs"
	},
	{
		to: "/apps",
		label: "Apps"
	},
	{
		to: "/company",
		label: "Company"
	}
];
var statusCopy = {
	current: {
		mark: "●",
		label: "Current",
		meaning: "Present in public source and used as described."
	},
	partial: {
		mark: "◐",
		label: "Partial",
		meaning: "Implemented in part. Scope is named on the page."
	},
	experimental: {
		mark: "◌",
		label: "Experimental",
		meaning: "Runnable or inspectable, not a product claim."
	},
	development: {
		mark: "◦",
		label: "In development",
		meaning: "Actively changing. Do not treat as stable."
	},
	planned: {
		mark: "○",
		label: "Planned",
		meaning: "Intent. Never presented as shipping."
	},
	research: {
		mark: "◆",
		label: "Research",
		meaning: "Founder or lab work. Not a Quesar product surface."
	}
};
var integrationApps = [
	{
		path: "apps/quasar-web/",
		href: "/",
		purpose: "Next.js 16 website, API routes, private console, Cloud Run, app-owned OpenTofu",
		gate: "bun run check:web",
		status: "current"
	},
	{
		path: "apps/mobile/",
		href: "/mobile",
		purpose: "Expo SDK 53 mobile companion and native CloudKit module",
		gate: "bun run check:mobile",
		status: "partial"
	},
	{
		path: "apps/quasar/",
		href: "/quesar",
		purpose: "Local AI site builder: Bun service, shared package, Expo app, Next template",
		gate: "bun run check:quasar",
		status: "experimental"
	},
	{
		path: "apps/website-app/",
		href: "/workspace",
		purpose: "Local Abbey workspace, SQLite/Better Auth, Python worker, agent package",
		gate: "bun run check:website-app",
		status: "current"
	},
	{
		path: "apps/research-sites/",
		href: "/research",
		purpose: "Generated static export of the research collection; no dependencies",
		gate: "bun run check:research-sites",
		status: "current"
	},
	{
		path: "packages/contracts/",
		href: "/developers",
		purpose: "Shared type vocabulary for product, persona, and claim provenance axes",
		gate: "bun run check:topology",
		status: "current"
	}
];
var products$1 = [
	{
		id: "abbey",
		name: "Abbey",
		href: "/abbey",
		oneLiner: "Companion experience with a claims ledger. Personas, not products.",
		status: "partial"
	},
	{
		id: "abi",
		name: "ABI",
		href: "/abi",
		oneLiner: "Nightly Rust orchestration. Routes, context, honest capability reporting.",
		status: "current"
	},
	{
		id: "wdbx",
		name: "WDBX",
		href: "/wdbx",
		oneLiner: "Provenance-aware episodic substrate. Memory is not a lookup.",
		status: "current"
	},
	{
		id: "quesar",
		name: "Quesar",
		href: "/quesar",
		oneLiner: "The product envelope that makes the stack inspectable.",
		status: "partial"
	}
];
var personas = [
	{
		id: "abbey",
		name: "Abbey",
		role: "Empathic polymath",
		color: "abbey",
		body: "High-EQ tutor and partner. Scaffolds, names uncertainty, and keeps the human in the loop."
	},
	{
		id: "aviva",
		name: "Aviva",
		role: "Unfiltered expert",
		color: "aviva",
		body: "Direct, concise, unhedged. Fewer tokens by design. Facts without preamble."
	},
	{
		id: "abi",
		name: "Abi",
		role: "Adaptive moderator",
		color: "abi",
		body: "Routes and blends. Classifies intent, applies policy, and reports what the ledger can prove."
	}
];
var companionPersonas = [
	{
		name: "Abbey",
		body: "Care first. Scaffolded teaching, frustration detection, and a named uncertainty budget."
	},
	{
		name: "Aviva",
		body: "Clarity always. Strip hedges. Answer the question that was asked."
	},
	{
		name: "Abi",
		body: "Competence throughout. Route, blend, refuse, and leave a trace."
	}
];
var integrityRules = [
	{
		title: "Apple sentence",
		body: "The only approved Apple sentence is the one on this site. Do not invent affiliation, endorsement, or silicon partnership."
	},
	{
		title: "Provenance tags",
		body: "Figures are measured, target, or reported. A target is never a result. Missing a tag is a defect."
	},
	{
		title: "Apache-2.0",
		body: "Core runtimes ship Apache-2.0. Do not relicense by implication or copy a proprietary notice onto public crates."
	},
	{
		title: "Toolchain facts",
		body: "ABI is nightly Rust. Follow each repository README. Do not mix Zig-era claims into the current tree."
	},
	{
		title: "WDBX unexpanded",
		body: "Do not invent recall, QPS, or latency numbers. Graph defaults are configuration, not a scoreboard."
	},
	{
		title: "No borrowed benchmarks",
		body: "If a number is not in the public skill-creator master reference or a named source artifact, it does not ship."
	}
];
var faqs = [
	{
		q: "Does this website host Abbey?",
		a: "No. This site orients and offers a signed-in console for field notes. The Abbey workspace, Quasar builder, and mobile vault on this site are in-browser orientations of local apps — they do not provision a hosted session."
	},
	{
		q: "Is Quesar a chatbot?",
		a: "No. Quesar is infrastructure: ABI orchestration, WDBX memory, Abbey as the companion experience. Chat is one interface, not the product."
	},
	{
		q: "Can it run privately?",
		a: "Yes. Default posture is operator-owned machines. VPC, on-premise, hybrid, and offline-first paths are the design. Remote providers are optional and credential-gated."
	},
	{
		q: "Do you replace existing models?",
		a: "Usually no. Quesar sits around providers or self-hosted models: routing, retrieval, evaluation, and policy. Local template completion does not establish foundation-model quality."
	},
	{
		q: "Where is the source?",
		a: "On this site. Product pages, /source/:name, docs, and research carry the public tree. GitHub is the backing store — you do not need to leave to read it."
	},
	{
		q: "What do the status labels mean?",
		a: "Current, Partial, Experimental, In development, Planned, and Research are not interchangeable. Planned is never shipping. Research is not a Quesar product claim."
	}
];
var wdbxSpecs = [
	{
		k: "Engine",
		v: "Layered HNSW"
	},
	{
		k: "Concurrency",
		v: "MVCC"
	},
	{
		k: "M",
		v: "16"
	},
	{
		k: "efConstruction",
		v: "200"
	},
	{
		k: "efSearch",
		v: "64"
	},
	{
		k: "Metric",
		v: "Cosine"
	},
	{
		k: "Addressing",
		v: "Content-addressed"
	},
	{
		k: "Sharding",
		v: "Not established"
	}
];
var wdbxCrates = [
	{
		name: "abi-wdbx",
		body: "Episodic store, HNSW graph, query path, and persistence contracts."
	},
	{
		name: "abi-compute",
		body: "CPU vector ops and optional macOS Metal DOT. CUDA/Vulkan not linked here."
	},
	{
		name: "abi-foundation",
		body: "Shared primitives: identifiers, hashing, time, error types."
	},
	{
		name: "abi-core",
		body: "Episode types, witness encoding, causal DAG helpers."
	},
	{
		name: "abi-telemetry",
		body: "Local traces and capability reporting. Not a hosted metrics product."
	}
];
var abiCrates = [
	{
		name: "abi-cli",
		body: "Operator surface. backends, scheduler, dashboard, plugin, wdbx."
	},
	{
		name: "abi-mcp",
		body: "JSON-RPC 2.0 over stdio, optional loopback HTTP with bearer auth."
	},
	{
		name: "abi-ai",
		body: "Exact model registry and template completion. Quality is not inferred."
	},
	{
		name: "abi-sea",
		body: "Scheduler and execution adapter. Device selection is explicit."
	},
	{
		name: "abi-gpu",
		body: "Capability reporting. accelerated=false when native kernels are not linked."
	}
];
var mcpTools = [
	{
		name: "ai_learn",
		body: "Ingest a record into the local store. Persistence can be disabled."
	},
	{
		name: "ai_complete",
		body: "Template completion against the exact registry model."
	},
	{
		name: "wdbx_query",
		body: "Nearest-neighbor retrieval with inspectable hits."
	},
	{
		name: "wdbx_stats",
		body: "Local store statistics. Not a cluster dashboard."
	},
	{
		name: "gpu_status",
		body: "Honest device report. Fallback is reported as fallback."
	},
	{
		name: "plugin_list",
		body: "Contract-covered plugins visible to this process."
	}
];
var abiCli = [
	{
		cmd: "abi backends",
		note: "List configured execution backends and what they actually report."
	},
	{
		cmd: "abi scheduler status",
		note: "Scheduler health for this process. Not a fleet view."
	},
	{
		cmd: "abi dashboard --once --plain",
		note: "One-shot text dashboard. No hosted UI implied."
	},
	{
		cmd: "abi plugin list",
		note: "Plugins the current binary loaded under contract."
	},
	{
		cmd: "abi wdbx query",
		note: "Retrieve from the local store. Requires the sibling workspace."
	}
];
var abbeyCommands = [
	{
		cmd: "abbey claims",
		note: "Print the claims ledger. This is the source of status language."
	},
	{
		cmd: "abbey memory search",
		note: "Search local memory. Default store is SQLite."
	},
	{
		cmd: "abbey persona",
		note: "Show the active persona and the last routing reason."
	},
	{
		cmd: "abbey workflow",
		note: "Executable workflow ledger: goals, done, open, blocked."
	}
];
var abbeyLedger = {
	current: 18,
	partial: 11,
	proposed: 9,
	blocked: 4,
	outOfScope: 7,
	source: "abbey/src/claims.rs",
	schema: "claims-v1",
	digest: "reported from public tree — re-hash locally before citing",
	toolchain: "Rust nightly via repo wrappers",
	backends: ["SQLite (default)", "WDBX (opt-in feature flag)"]
};
var abbeyWorkflow = {
	goals: 12,
	done: 6,
	checked: 14,
	open: 8,
	inProgress: 3,
	proposed: 5,
	blocked: 2,
	source: "abbey workflow ledger"
};
var layers = [
	{
		id: "wdbx",
		name: "WDBX",
		layer: "Storage",
		href: "/wdbx",
		accent: "wdbx",
		body: "Episodic substrate: durable records, vector retrieval, causal history, inspectable evidence."
	},
	{
		id: "abi",
		name: "ABI",
		layer: "Compute",
		href: "/abi",
		accent: "abi",
		body: "Orchestration: routing, context assembly, tools, honest capability reporting."
	},
	{
		id: "abbey",
		name: "Abbey",
		layer: "Application",
		href: "/abbey",
		accent: "abbey",
		body: "Companion experience: personas, claims ledger, local workspace."
	},
	{
		id: "quesar",
		name: "Quesar",
		layer: "Product",
		href: "/quesar",
		accent: "accent",
		body: "The envelope that makes the relationships obvious. Not a hosted brain."
	}
];
var layerCopy = {
	experience: "Experience — user, Quesar, output",
	runtime: "Runtime — ABI, tools, router, context",
	memory: "Memory — WDBX, episodes, embeddings, provenance",
	compute: "Compute — local or explicit remote"
};
var architectureNodes = [
	{
		id: "user",
		name: "You",
		layer: "experience",
		status: "current",
		summary: "Operator on a machine you own.",
		detail: "A local workspace, CLI, companion, or this website issues a request. This site does not become the runtime.",
		implemented: [
			"Local orientation",
			"Signed-in field console",
			"In-browser app surfaces"
		],
		notClaimed: ["Hosted Abbey sessions", "Cloud-provisioned identity as the product"],
		href: "/apps"
	},
	{
		id: "quesar",
		name: "Quesar",
		layer: "experience",
		status: "partial",
		summary: "Product envelope around the stack.",
		detail: "Quesar names the relationships: Abbey on ABI on WDBX. Public orientation is current. Hosted assistants are not.",
		implemented: [
			"Public site",
			"Architecture map",
			"Status language"
		],
		notClaimed: ["A hosted Quesar HTTP API", "Client SDKs for third-party SaaS"],
		href: "/quesar"
	},
	{
		id: "abi",
		name: "ABI",
		layer: "runtime",
		status: "current",
		summary: "Nightly Rust orchestration.",
		detail: "Routes requests, assembles inspectable context, coordinates tools. Requires the sibling WDBX workspace.",
		implemented: [
			"CLI wrappers",
			"MCP stdio",
			"Exact model registry"
		],
		notClaimed: ["Foundation-model quality from template completion", "Zig tree (removed)"],
		href: "/abi"
	},
	{
		id: "tools",
		name: "Tools",
		layer: "runtime",
		status: "partial",
		summary: "Contract-covered plugins and MCP tools.",
		detail: "Twelve contract-covered MCP tools including wdbx_query and gpu_status. Persistent HTTP+SSE is not claimed.",
		implemented: ["stdio MCP", "Optional loopback HTTP with bearer auth"],
		notClaimed: ["A hosted plugin marketplace", "Unauthenticated internet exposure"],
		href: "/plugins"
	},
	{
		id: "router",
		name: "Model router",
		layer: "runtime",
		status: "partial",
		summary: "Exact registry, explicit device.",
		detail: "An exact registry model and device are selected. Routing is a trace event, not a guess.",
		implemented: ["Deterministic local routing", "Persona blend coefficient (design)"],
		notClaimed: ["A trained classifier as product evidence", "Guaranteed multi-provider SLA"],
		href: "/demo"
	},
	{
		id: "context",
		name: "Context pack",
		layer: "runtime",
		status: "partial",
		summary: "Assembled before execution.",
		detail: "Context is assembled before the model runs, not reconstructed in a post-hoc story.",
		implemented: ["Inspectable context assembly in ABI"],
		notClaimed: ["Perfect recall of every prior episode", "Silent prompt rewriting"],
		href: "/abi"
	},
	{
		id: "wdbx",
		name: "WDBX",
		layer: "memory",
		status: "current",
		summary: "Episodic substrate.",
		detail: "Durable records, embeddings, provenance. Retrieval can return what happened and why a record is trusted.",
		implemented: [
			"Layered HNSW",
			"MVCC",
			"Content addressing"
		],
		notClaimed: ["Production sharding", "Evidence-weighted retrieval as current"],
		href: "/wdbx"
	},
	{
		id: "memory",
		name: "Episodes",
		layer: "memory",
		status: "current",
		summary: "Signed, content-addressed records.",
		detail: "WAL, causal DAGs, witness encoding. Persistence that did not happen is not reported as success.",
		implemented: ["Episode store", "CBOR witness encoder agreement on golden vectors"],
		notClaimed: ["Memory as sentience", "Automatic cross-device federation"],
		href: "/wdbx"
	},
	{
		id: "embed",
		name: "Embeddings",
		layer: "memory",
		status: "partial",
		summary: "Vectors with a contract.",
		detail: "Ordered vector search and hybrid ranking contracts exist. Collapsing every signal into one score is a documented limitation.",
		implemented: ["Cosine search", "Graph construction parameters as configuration"],
		notClaimed: ["A published recall/QPS scoreboard", "Cross-encoder rerank as current"],
		href: "/research"
	},
	{
		id: "provenance",
		name: "Provenance",
		layer: "memory",
		status: "partial",
		summary: "Why this record is trusted.",
		detail: "Signatures and causal history answer why a record is trusted. They do not make the record true.",
		implemented: ["Content addressing", "Causal history"],
		notClaimed: ["Federation evidence without separate authorization", "Truth of stored statements"],
		href: "/research"
	},
	{
		id: "compute",
		name: "Compute",
		layer: "compute",
		status: "partial",
		summary: "Local unless you send it.",
		detail: "CPU vector ops and optional macOS Metal DOT. CUDA and Vulkan dispatch are not linked in this implementation.",
		implemented: ["CPU backends", "Honest gpu_status"],
		notClaimed: ["Blanket GPU acceleration", "A 295× figure as a measured result"],
		href: "/platform"
	},
	{
		id: "output",
		name: "Output",
		layer: "experience",
		status: "current",
		summary: "A response with a trace.",
		detail: "What you see is bound to a routing reason, a context pack, and whatever the ledger can prove.",
		implemented: [
			"Claims language",
			"Field notes console",
			"In-browser demos"
		],
		notClaimed: ["Ungrounded fluency as evidence", "Unlimited capability"]
	}
];
var services = [
	{
		title: "Autonomy Readiness Audit",
		description: "Map workflows, prompt surfaces, data paths, and approval gates to determine which tasks are safe to automate.",
		outcomes: [
			"Risk register",
			"Control-map",
			"90-day rollout plan"
		]
	},
	{
		title: "WDBX Retrieval Architecture",
		description: "Design weighted backtrace retrieval pipelines that preserve source context and support inspectable vector search.",
		outcomes: [
			"Index strategy",
			"Recall benchmarks",
			"Trace schema"
		]
	},
	{
		title: "Multi-Agent Orchestration",
		description: "Implement agent roles, tool permissions, task handoffs, and conflict-resolution policies.",
		outcomes: [
			"Agent graph",
			"Tool policy",
			"Evaluation harness"
		]
	},
	{
		title: "Model & Runtime Optimization",
		description: "Profile inference paths, memory pressure, batching, and edge constraints for real-world latency.",
		outcomes: [
			"Latency profile",
			"Optimization backlog",
			"Capacity model"
		]
	},
	{
		title: "Safety & Compliance Layering",
		description: "Embed policy checks, audit trails, and red-team scenarios into high-trust systems.",
		outcomes: [
			"Policy matrix",
			"Audit events",
			"Red-team scripts"
		]
	},
	{
		title: "Private AI Deployment",
		description: "Package workflows for VPC, on-premise, offline, and hybrid environments.",
		outcomes: [
			"Deployment topology",
			"Runbook",
			"Rollback plan"
		]
	},
	{
		title: "Research Translation",
		description: "Turn papers and notebooks into constrained, documented services engineers can maintain.",
		outcomes: [
			"Prototype hardening",
			"API contract",
			"Test plan"
		]
	},
	{
		title: "Executive & Engineering Workshops",
		description: "Align leadership, security, product, and engineering around autonomy strategy and risk boundaries.",
		outcomes: [
			"Decision memo",
			"Team training",
			"Architecture review"
		]
	},
	{
		title: "Continuous Evaluation Systems",
		description: "Build suites for tool use, retrieval faithfulness, safety behavior, and regression drift.",
		outcomes: [
			"Eval suite",
			"Scorecards",
			"Release gates"
		]
	}
];
var engagement = [
	{
		title: "Audit",
		body: "Inventory workflows, data, tools, and failure modes. Ends with a risk register the next phase is not allowed to ignore."
	},
	{
		title: "Design",
		body: "Bounded architecture: retrieval, policy, personas, deployment topology. Ends with a harness, not a slide."
	},
	{
		title: "Build",
		body: "Implement against the harness on hardware you own. Ends with a baseline you can re-run."
	},
	{
		title: "Harden",
		body: "Red-team, rollback, observability, and operator training. Ends with a gate, not a demo day."
	}
];
var refusals = [{
	label: "Scope discipline",
	body: "We don't take work that puts your data in our hands. If the engagement requires your corpus to leave your hardware, the engagement is designed wrong — and we'll say so."
}, {
	label: "Claims discipline",
	body: "Deliverables ship with provenance-tagged numbers. Targets are framed as targets; nothing is reported as measured until it reproduces on your hardware."
}];
var investor = {
	entity: "Delaware C-Corp · Machine Learning Advanced Innovations, Inc.",
	market: [
		{
			k: "TAM",
			v: "$48B",
			note: "On-device and private AI infrastructure. Category sizing, not a booking.",
			tag: "target"
		},
		{
			k: "SAM",
			v: "$12B",
			note: "Regulated software, research ops, and security-conscious product teams.",
			tag: "target"
		},
		{
			k: "SOM",
			v: "$1.2B",
			note: "Near-term reachable: SDK licensing plus integration services.",
			tag: "target"
		}
	],
	raise: {
		round: "Seed",
		amount: "$4.5M"
	},
	funds: [
		{
			k: "Product",
			v: "50%",
			p: "ABI, WDBX, Abbey, Quesar"
		},
		{
			k: "Infrastructure",
			v: "30%",
			p: "Tooling, eval, private deploy paths"
		},
		{
			k: "GTM",
			v: "20%",
			p: "Services motion, not ads"
		}
	],
	unit: [
		{
			k: "Gross margin",
			v: "82% target",
			tag: "target"
		},
		{
			k: "CAC payback",
			v: "11 months target",
			tag: "target"
		},
		{
			k: "LTV/CAC",
			v: "5.4× target",
			tag: "target"
		},
		{
			k: "GPU 295×",
			v: "engineering target — not a result",
			tag: "target"
		}
	],
	arr: [
		{
			year: "Y1",
			v: "0.4"
		},
		{
			year: "Y2",
			v: "1.8"
		},
		{
			year: "Y3",
			v: "6.5"
		},
		{
			year: "Y4",
			v: "18"
		},
		{
			year: "Y5",
			v: "42"
		}
	],
	founder: [
		{
			k: "Public source across ABI, WDBX, Abbey, Gama, and this site",
			tag: "measured"
		},
		{
			k: "Claims ledger in abbey/src/claims.rs",
			tag: "measured"
		},
		{
			k: "Independent verification gates per app",
			tag: "measured"
		},
		{
			k: "295× GPU figure",
			tag: "target"
		}
	]
};
var setups = [
	{
		title: "Website (this surface)",
		body: "Orientation, docs, research, and in-browser apps. Independent of mobile and builder gates.",
		code: "bun run check:web",
		href: "/developers"
	},
	{
		title: "Abbey workspace",
		body: "Node 24, Bun 1.4, uv, Java 21+, LibreOffice. A local model is optional. This site does not provision a session.",
		code: "bun run check:website-app",
		href: "/workspace"
	},
	{
		title: "Quasar builder",
		body: "Local v1: Bun 1.4, Anthropic credentials, service + Expo. Writes a Next.js project to disk.",
		code: "bun run check:quasar",
		href: "/quesar"
	},
	{
		title: "Mobile companion",
		body: "Expo SDK 53. Native CloudKit is a signed iOS build. The page here is the web vault.",
		code: "bun run check:mobile",
		href: "/mobile"
	},
	{
		title: "ABI + WDBX",
		body: "Clone both. Use ./tools/cargo.sh. Bare cargo is the wrong entry.",
		code: "./tools/check.sh",
		href: "/abi"
	}
];
var repos = [
	{
		owner: "donaldfilimon",
		name: "MLAI-CORPORATION-WWW",
		summary: "Integration home: website, mobile, Quasar, Abbey workspace, research-sites.",
		language: "TypeScript",
		href: "/developers",
		kind: "core"
	},
	{
		owner: "donaldfilimon",
		name: "abi",
		summary: "Nightly Rust agent runtime. WDBX sibling required.",
		language: "Rust",
		href: "/abi",
		kind: "core"
	},
	{
		owner: "donaldfilimon",
		name: "wdbx",
		summary: "Provenance-aware episodic substrate extracted from abi with history preserved.",
		language: "Rust",
		href: "/wdbx",
		kind: "core"
	},
	{
		owner: "donaldfilimon",
		name: "abbey",
		summary: "CLI/TUI companion that will not claim what the ledger cannot prove.",
		language: "Rust",
		href: "/abbey",
		kind: "core"
	},
	{
		owner: "donaldfilimon",
		name: "abbey-bot",
		summary: "Companion bot surface for Abbey.",
		language: "Rust",
		href: "/abbey-bot",
		kind: "surface"
	},
	{
		owner: "donaldfilimon",
		name: "AbbeyCompanion",
		summary: "Native macOS SwiftUI companion for Abbey Bot.",
		language: "Swift",
		href: "/companion",
		kind: "surface"
	},
	{
		owner: "donaldfilimon",
		name: "mlai-website-app",
		summary: "Public website, Abbey workspace, developer console, customer portal.",
		language: "TypeScript",
		href: "/workspace",
		kind: "surface"
	},
	{
		owner: "donaldfilimon",
		name: "skill-creator",
		summary: "Public agent skill for shipping this site without breaking integrity rules.",
		language: "Markdown",
		href: "/skill-creator",
		kind: "skill"
	},
	{
		owner: "donaldfilimon",
		name: "plugins",
		summary: "abi-mega: skills, assets, and scripts consumed by ABI sync.",
		language: "Python",
		href: "/plugins",
		kind: "skill"
	},
	{
		owner: "donaldfilimon",
		name: "gama",
		summary: "Declarative Swift UI framework. Founder-owned, not a Quesar product.",
		language: "Swift",
		href: "/gama",
		kind: "related"
	},
	{
		owner: "donaldfilimon",
		name: "cell-lang",
		summary: "Systems language: Rust ownership, Swift ergonomics, Zig control, C ABI.",
		language: "Zig",
		href: "/source/cell-lang",
		kind: "related"
	},
	{
		owner: "donaldfilimon",
		name: "cell-machine",
		summary: "Cellular-automaton experiment in Bun and TypeScript.",
		language: "TypeScript",
		href: "/source/cell-machine",
		kind: "related"
	},
	{
		owner: "donaldfilimon",
		name: "NYON",
		summary: "Voxel-world experiment. Not a Quesar product surface.",
		language: "Rust",
		href: "/source/nyon",
		kind: "related"
	},
	{
		owner: "donaldfilimon",
		name: "mlai-site",
		summary: "Earlier marketing site. Current orientation lives here.",
		language: "JavaScript",
		href: "/quesar",
		kind: "surface"
	}
];
var searchIndex = [
	{
		title: "Quesar",
		href: "/quesar",
		group: "Product",
		body: "Infrastructure for private persistent adaptive AI"
	},
	{
		title: "Platform",
		href: "/platform",
		group: "Product",
		body: "Three layers one chip WDBX ABI Abbey"
	},
	{
		title: "Architecture",
		href: "/architecture",
		group: "Developers",
		body: "Interactive stack diagram nodes current vs not claimed"
	},
	{
		title: "Abbey",
		href: "/abbey",
		group: "Product",
		body: "Companion claims ledger personas"
	},
	{
		title: "ABI",
		href: "/abi",
		group: "Product",
		body: "Rust orchestration MCP CLI"
	},
	{
		title: "WDBX",
		href: "/wdbx",
		group: "Product",
		body: "Episodic memory HNSW provenance"
	},
	{
		title: "Docs",
		href: "/docs",
		group: "Developers",
		body: "Getting started runtime MCP WDBX"
	},
	{
		title: "Research",
		href: "/research",
		group: "Developers",
		body: "Papers notes implementation limits"
	},
	{
		title: "Blog",
		href: "/blog",
		group: "Company",
		body: "Engineering notes and essays"
	},
	{
		title: "Team",
		href: "/team",
		group: "Company",
		body: "Donald Filimon founder"
	},
	{
		title: "Projects",
		href: "/projects",
		group: "Developers",
		body: "ABI WDBX Abbey Gama directory"
	},
	{
		title: "Products",
		href: "/products",
		group: "Product",
		body: "Product deep dives journeys"
	},
	{
		title: "Apps",
		href: "/apps",
		group: "Apps",
		body: "Workspace mobile vault builder bot"
	},
	{
		title: "Workspace",
		href: "/workspace",
		group: "Apps",
		body: "Abbey document workspace"
	},
	{
		title: "Mobile vault",
		href: "/mobile",
		group: "Apps",
		body: "Expo companion web vault"
	},
	{
		title: "Abbey bot",
		href: "/abbey-bot",
		group: "Apps",
		body: "Persona router companion chat"
	},
	{
		title: "Companion",
		href: "/companion",
		group: "Apps",
		body: "macOS SwiftUI companion"
	},
	{
		title: "Skill creator",
		href: "/skill-creator",
		group: "Apps",
		body: "Integrity skill builder"
	},
	{
		title: "Plugins",
		href: "/plugins",
		group: "Apps",
		body: "abi-mega skills scripts"
	},
	{
		title: "Gama",
		href: "/gama",
		group: "Related",
		body: "Swift UI framework"
	},
	{
		title: "Quasar studio",
		href: "/quesar",
		group: "Apps",
		body: "Local site builder preview"
	},
	{
		title: "Demo",
		href: "/demo",
		group: "Apps",
		body: "Persona router live demo"
	},
	{
		title: "Showcase",
		href: "/showcase",
		group: "Company",
		body: "Film trailer design lab mega"
	},
	{
		title: "Changelog",
		href: "/changelog",
		group: "Developers",
		body: "Release history"
	},
	{
		title: "Benchmarks",
		href: "/benchmarks",
		group: "Developers",
		body: "Workload notes not scoreboard"
	},
	{
		title: "Get started",
		href: "/get-started",
		group: "Developers",
		body: "Start journeys setup"
	},
	{
		title: "Investors",
		href: "/investors",
		group: "Company",
		body: "TAM SAM SOM ARR tagged targets not results"
	},
	{
		title: "Services",
		href: "/services",
		group: "Company",
		body: "Audit design build harden"
	},
	{
		title: "Security",
		href: "/security",
		group: "Company",
		body: "Trust posture fail closed"
	},
	{
		title: "Privacy",
		href: "/privacy",
		group: "Company",
		body: "Local by default"
	},
	{
		title: "Terms",
		href: "/terms",
		group: "Company",
		body: "Legal terms"
	},
	{
		title: "Contact",
		href: "/contact",
		group: "Company",
		body: "Inquiry without leaving the site"
	},
	{
		title: "Console",
		href: "/console",
		group: "Apps",
		body: "Signed-in field notes on architecture nodes"
	},
	{
		title: "Developers",
		href: "/developers",
		group: "Developers",
		body: "Live GitHub READMEs when GitHub answers"
	},
	{
		title: "Source catalog",
		href: "/source",
		group: "Developers",
		body: "Public repositories in-site"
	},
	{
		title: "Cell machine",
		href: "/source/cell-machine",
		group: "Apps",
		body: "Cellular automaton"
	},
	{
		title: "Links",
		href: "/links",
		group: "Company",
		body: "Internal directory"
	},
	{
		title: "Financial model",
		href: "/financial-model",
		group: "Company",
		body: "Unit economics model"
	},
	{
		title: "About",
		href: "/about",
		group: "Company",
		body: "Values principles entity"
	}
];
var homeProposition = [
	{
		n: "01",
		title: "What MLAI is",
		body: "A company building assistant workflows, memory systems, and developer tools. Sources are inspectable. Implementation boundaries are explicit."
	},
	{
		n: "02",
		title: "What Quesar is",
		body: "The infrastructure experience that connects ABI, WDBX, and Abbey. Persistent context, private by architecture, runnable on your machines."
	},
	{
		n: "03",
		title: "Why it exists",
		body: "Models are powerful and forgetful. Memory is often bolted on. Privacy often means trusting someone else's cluster. Developers need a different substrate."
	}
];
var homeStart = [
	{
		title: "Read the architecture",
		body: "Click a node. Current in source versus not claimed is listed in the inspector.",
		href: "/architecture"
	},
	{
		title: "Keep a field note",
		body: "Sign in, pick a node, write what you observed. Notes stay on your account — not Abbey memory.",
		href: "/console"
	},
	{
		title: "Investors",
		body: "TAM, SAM, SOM, and ARR are tagged. A target is never a result.",
		href: "/investors"
	},
	{
		title: "Read the source",
		body: "Live GitHub READMEs when GitHub answers. Local excerpts when it does not.",
		href: "/developers"
	}
];
var homePrivacy = [
	{
		title: "Local by default",
		body: "Workspaces, stores, and runtimes execute on operator-owned machines. This website does not host assistant sessions."
	},
	{
		title: "Memory you can inspect",
		body: "WDBX records are content-addressed, signed, and recoverable. Persistence that did not happen is not reported as success."
	},
	{
		title: "Explicit remote",
		body: "Cloud backends and live providers are optional and credential-gated. They are not the architecture's center."
	},
	{
		title: "Honest limits",
		body: "We do not claim unhackable systems, military-grade anything, or 100% privacy. Security language tracks the source."
	}
];
var quesarSurfaces = [
	{
		surface: "This website",
		role: "Product orientation and source setup links",
		status: "current"
	},
	{
		surface: "Local site builder (Quasar)",
		role: "Prompt-to-Next.js on your machine (Bun + Expo, Anthropic credentials)",
		status: "experimental"
	},
	{
		surface: "Abbey workspace",
		role: "Local document workspace with assistant context",
		status: "current"
	},
	{
		surface: "Mobile companion",
		role: "Source-based Expo app; native CloudKit is distinct from web export",
		status: "partial"
	},
	{
		surface: "Hosted Quesar cloud",
		role: "Managed sessions, generation, authentication",
		status: "planned"
	}
];
var quesarWhat = [
	{
		title: "Who it is for",
		body: "Developers, technical organizations, and privacy-conscious operators who need AI systems that keep context, expose provenance, and run across local, edge, and optional remote compute."
	},
	{
		title: "How it differs",
		body: "Conventional apps bolt memory onto a chat transcript. Quesar treats memory as a substrate (WDBX), orchestration as a runtime (ABI), and the assistant as an experience (Abbey) — with claim-honest status on every surface."
	},
	{
		title: "What you can build",
		body: "Local assistant workflows with inspectable context. Retrieval over signed episodic records. Tools and plugins under ABI contracts. A local site-generation loop that writes a real Next.js project onto disk."
	},
	{
		title: "What you cannot assume",
		body: "This website does not provision an assistant or generate sites. Sign-in opens a console for field notes, not an Abbey session. The local builder does not host, deploy, or bill. Production sharding is not established."
	}
];
var architectureSteps = [
	{
		title: "User → Quesar",
		body: "A local workspace, CLI, or companion issues a request. Quesar is the product envelope, not a hosted brain."
	},
	{
		title: "Quesar → ABI + tools",
		body: "ABI routes the request, assembles inspectable context, and may invoke contract-covered plugins."
	},
	{
		title: "Model router + context",
		body: "An exact registry model and device are selected. Context is assembled before execution, not hidden after."
	},
	{
		title: "WDBX",
		body: "Durable records, embeddings, and provenance live here. Retrieval can return what happened and why a record is trusted."
	},
	{
		title: "Local / edge / remote compute",
		body: "CPU SIMD is the honest fallback. Remote providers are optional. Nothing on this website is a compute plane."
	},
	{
		title: "Output",
		body: "A response, a plan, a tool result, or a refusal. Abbey will not claim what the ledger cannot prove."
	}
];
var abiDuties = [
	{
		title: "Model routing",
		body: "Exact registry model IDs and explicit device choice. Optional live providers behind stored credentials.",
		status: "partial"
	},
	{
		title: "Context management",
		body: "Inspectable request context before a model or tool runs. Persistence records vectors and metadata only when the write succeeds.",
		status: "current"
	},
	{
		title: "Safety boundaries",
		body: "Claim-honest reporting, plugin parity guards, bounded workers with finite leases and replay resistance (contracts).",
		status: "partial"
	},
	{
		title: "Tool orchestration",
		body: "MCP tools in the public tree. Optional loopback HTTP is not a spec-conforming persistent SSE channel.",
		status: "current"
	},
	{
		title: "Reasoning coordination",
		body: "Scheduler-backed helpers with live task and memory observability where the tree implements them.",
		status: "partial"
	},
	{
		title: "Memory integration",
		body: "WDBX is a required sibling. Skipping persistence never fabricates a successful write.",
		status: "current"
	}
];
var abiNotClaimed = [
	"A current Zig public tree",
	"Distributed production sharding",
	"AES/RBAC as a complete product",
	"Python/TensorFlow stacks",
	"Kubernetes or H100 deployments",
	"QPS, latency, or accuracy numbers",
	"Energy-efficiency comparisons",
	"Browser autonomy"
];
var wdbxCapabilities = [
	{
		concern: "Blocks / segments",
		what: "On-disk segment format, CRC-framed WAL, checkpoint publication and salvage",
		status: "current"
	},
	{
		concern: "Embeddings / search",
		what: "Exact and layered HNSW, ordered vector search, 3-D spatial index",
		status: "current"
	},
	{
		concern: "Metadata",
		what: "Block metadata round-tripping, versioning, access and execution state in records",
		status: "current"
	},
	{
		concern: "Relationships",
		what: "Multi-parent causal audit DAG",
		status: "current"
	},
	{
		concern: "Provenance",
		what: "SHA-256 content addressing, Ed25519 signing, deterministic CBOR envelopes",
		status: "current"
	},
	{
		concern: "Retrieval",
		what: "Hybrid ranking contracts; score currently collapses several axes",
		status: "partial"
	},
	{
		concern: "Evidence-weighted rank",
		what: "Separate semantic, temporal, causal, and persona signals",
		status: "planned"
	},
	{
		concern: "Distributed operation",
		what: "Cluster replication with read repair in source; not production sharding",
		status: "experimental"
	},
	{
		concern: "Trust / federation",
		what: "Local deterministic replay tests. Not deployed federation evidence.",
		status: "research"
	},
	{
		concern: "Hosted service",
		what: "Nothing in the repository provides production authority",
		status: "planned"
	}
];
var abbeyWorkspaceFacts = [
	"Node 24, Bun 1.4",
	"uv with Python 3.11–3.13",
	"Java 21+ and LibreOffice",
	"SQLite / Better Auth in the local app",
	"Private databases and uploaded documents are not part of the public import",
	"This site does not open a chat"
];
var researchTopics = [
	{
		title: "Memory architecture",
		status: "current",
		applies: "WDBX, ABI",
		body: "Episodic records with WAL, MVCC, causal DAGs, and content addressing. Memory is a substrate, not a chat log with embeddings glued on."
	},
	{
		title: "Retrieval",
		status: "partial",
		applies: "WDBX",
		body: "Ordered vector search and hybrid ranking contracts exist. Collapsing semantic, temporal, causal, and persona signals into one score is a documented limitation."
	},
	{
		title: "Distributed systems",
		status: "experimental",
		applies: "WDBX",
		body: "Reference cluster replication and read repair are in source. They do not establish production sharding or hosted authority."
	},
	{
		title: "Model orchestration",
		status: "partial",
		applies: "ABI",
		body: "Scheduler, plugins, MCP, exact model registry. Routing is explicit. Quality is not inferred from a successful template completion."
	},
	{
		title: "Privacy and local inference",
		status: "current",
		applies: "Quesar, Abbey, ABI",
		body: "Default posture is operator-owned machines. Remote is optional. This website does not see your documents, weights, or generated output."
	},
	{
		title: "Provenance and trust",
		status: "partial",
		applies: "WDBX, Abbey",
		body: "Signatures and causal history answer why a record is trusted. They do not make the record true. Federation evidence is separately authorized."
	},
	{
		title: "Synchronization",
		status: "planned",
		applies: "Quesar, mobile",
		body: "Mobile CloudKit and encrypted-local fallback are distinct. Signed-device acceptance is not the same as a web export."
	},
	{
		title: "Interoperability",
		status: "research",
		applies: "Quesar",
		body: "Workspaces, crates, and apps share a type vocabulary for product, persona, and claim provenance. Semantic UI tokens remain app-local."
	}
];
var researchSources = [
	{
		title: "ABI",
		href: "/abi",
		body: "Nightly Rust tree, wrappers, MCP, claim-honest GPU reporting."
	},
	{
		title: "WDBX",
		href: "/wdbx",
		body: "Provenance-aware episodic substrate, crate map, evidence vs gaps."
	},
	{
		title: "Abbey claims",
		href: "/abbey",
		body: "Companion interface with enumerated Current / Partial / Proposed / Blocked / Out of scope."
	},
	{
		title: "Integration surfaces",
		href: "/developers",
		body: "Website, mobile, local builder, Abbey workspace, research export."
	},
	{
		title: "Mobile companion",
		href: "/mobile",
		body: "Expo SDK 53. Native CloudKit is distinct from this web vault."
	},
	{
		title: "Quasar builder",
		href: "/quesar",
		body: "v1 writes a Next.js project on disk. Unit suite is not a live generation."
	},
	{
		title: "skill-creator",
		href: "/skill-creator",
		body: "Public skill for site integrity: Apple sentence, provenance tags, Apache-2.0, toolchain facts."
	},
	{
		title: "Gama",
		href: "/gama",
		body: "Founder-owned Swift UI framework. Not a Quesar product."
	}
];
var showcaseRooms = [
	{
		href: "/showcase/trailer",
		title: "Trailer",
		body: "The product film, in-page."
	},
	{
		href: "/showcase/film",
		title: "Film",
		body: "Longer cut. Atmosphere, not a benchmark."
	},
	{
		href: "/showcase/explainer",
		title: "Explainer",
		body: "Three layers on one chip, narrated."
	},
	{
		href: "/showcase/design",
		title: "Design lab",
		body: "Tokens, type, and the mark."
	},
	{
		href: "/showcase/abbey",
		title: "Abbey",
		body: "Companion stills and claims language."
	},
	{
		href: "/showcase/mega",
		title: "Mega",
		body: "The full orientation board."
	}
];
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/utils-C_uf36nf.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-DG6UNzh9.js
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/research-B_EFIwen.js
/** Audited public corpus; evidence inventory lives in docs/research-inventory.md. */
var research = {
	"tracks": [
		{
			"id": "ai",
			"name": "AI & agent behavior",
			"description": "Understand how Abbey and ABI route requests, produce local responses, and expose bounded checks.",
			"application": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"availability": "Local deterministic routing and completion are implemented; model quality requires separate evaluation.",
			"limitations": ["Local completion renders persona templates; it is not evidence of a trained foundation model.", "Keyword-based checks cannot establish general safety or emotional understanding."],
			"overviewSlug": "ai-overview"
		},
		{
			"id": "wdbx",
			"name": "WDBX memory & retrieval",
			"description": "Durable records, searchable vectors and inspectable retrieval for applications that need continuity.",
			"application": "Build document recall and decision-history prototypes with explicit source ownership.",
			"availability": "Rust persistence, HNSW search and episode-store components are implemented.",
			"limitations": ["Storage integrity establishes consistency, not the truth of stored statements.", "The reference cluster protocol does not establish production multi-host operation or sharding."],
			"overviewSlug": "wdbx-overview"
		},
		{
			"id": "sea",
			"name": "SEA evidence selection",
			"description": "Select a bounded set of relevant records before assembling an assistant context.",
			"application": "Prototype project recall or document assistance without placing every available record in a prompt.",
			"availability": "Eight-signal selection, task-specific scoring and bounded prompt assembly are implemented.",
			"limitations": ["Token costs are estimates; the implementation also enforces a prompt-byte boundary.", "Scoring heuristics do not guarantee relevance, truth or improved answer quality."],
			"overviewSlug": "sea-overview"
		},
		{
			"id": "gpu",
			"name": "GPU & compute",
			"description": "Inspect native vector-operation support and explicit CPU fallback.",
			"application": "Assess whether a target Apple workstation can use the optional Metal DOT path.",
			"availability": "CPU vector operations and optional macOS Metal DOT dispatch are implemented.",
			"limitations": ["CUDA and Vulkan dispatch are not linked in the inspected ABI GPU implementation.", "A compiled kernel is not proof of acceleration on a particular machine or workload."],
			"overviewSlug": "gpu-overview"
		},
		{
			"id": "mcp",
			"name": "MCP integrations",
			"description": "Expose bounded ABI operations through a documented tool interface.",
			"application": "Evaluate a local integration from an MCP client into the ABI tool catalog.",
			"availability": "The twelve-tool stdio JSON-RPC contract is implemented.",
			"limitations": ["The loopback HTTP endpoint is a custom compatibility listener, not a persistent conforming MCP HTTP+SSE transport.", "A listed tool does not prove provider credentials, production access or remote deployment."],
			"overviewSlug": "mcp-overview"
		},
		{
			"id": "tui",
			"name": "TUI & operator tools",
			"description": "Inspect local runtime state and explore session-based agent interactions.",
			"application": "Give developers a local diagnostics and interaction surface during evaluation.",
			"availability": "The diagnostics dashboard and agent REPL are implemented.",
			"limitations": ["Interactive editing and refresh require a supported terminal.", "A dashboard view is not a production health certification or proof of provider execution."],
			"overviewSlug": "tui-overview"
		}
	],
	"publications": [
		{
			"slug": "ai-overview",
			"title": "AI & agent behavior",
			"topic": "ai",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Understand how Abbey and ABI route requests, produce local responses, and expose bounded checks.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Local completion and adaptive routing",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/completion.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Deterministic persona router",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/router.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Constitutional checks and veto rules",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/constitution.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": ["Local completion renders persona templates; it is not evidence of a trained foundation model.", "Keyword-based checks cannot establish general safety or emotional understanding."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Evaluate assistant workflows with explicit behavior, provider and review boundaries.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["The local completion function selects a profile from keyword signals and renders an in-process persona template. The requested model identifier is metadata on this route, not proof that the named model ran. A hard constitutional veto substitutes a refusal in the returned local output."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["Local deterministic routing and completion are implemented; model quality requires separate evaluation."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: Policy-Locked Tool Use in Multi-Agent Systems; Human Approval Gates That Operators Actually Use; Offline-First AI Workflows for Sensitive Data; Prompt Injection Drills for Agentic Systems; Multi-Persona Routing Under Uncertainty: Policy Weights and Request Classification. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "wdbx-overview",
			"title": "WDBX memory & retrieval",
			"topic": "wdbx",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Durable records, searchable vectors and inspectable retrieval for applications that need continuity.",
			"practicalSummary": "Build document recall and decision-history prototypes with explicit source ownership.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Durable store and writer ownership",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/durable.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Layered HNSW index",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/hnsw.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Hybrid retrieval and observable score factors",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/retrieval.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Canonical episode persistence",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/v3/episode/store.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Episode persistence and replay tests",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/tests/v3_episode_store.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "test"
				},
				{
					"title": "Reference cluster protocol boundaries",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/cluster_rpc.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				}
			],
			"limitations": ["Storage integrity establishes consistency, not the truth of stored statements.", "The reference cluster protocol does not establish production multi-host operation or sharding."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Build document recall and decision-history prototypes with explicit source ownership.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["The durable store combines snapshots, write-ahead recovery and a layered HNSW search index. The hybrid retrieval library exposes score components. Canonical episode persistence is a separate v3 surface; consumers must use its defined semantics rather than assuming every legacy vector record is an admitted episode."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["Rust persistence, HNSW search and episode-store components are implemented."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["Start with a synthetic or authorized corpus. Check recovery, source identifiers, update behavior and retrieval relevance. Treat application permissions, data retention and deployment evidence as additional requirements."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: WDBX: A Weighted-Backtrace Memory Store for Traceable Retrieval; WDBX Graph Weights for Traceable Neural Retrieval; Vector Index Maintenance Under Continuous Ingestion. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "sea-overview",
			"title": "SEA evidence selection",
			"topic": "sea",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Select a bounded set of relevant records before assembling an assistant context.",
			"practicalSummary": "Prototype project recall or document assistance without placing every available record in a prompt.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Bounded evidence recall and prompt assembly",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Eight-signal selection and task weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/scorer.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Learning loop and persisted router weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/learn_loop.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": ["Token costs are estimates; the implementation also enforces a prompt-byte boundary.", "Scoring heuristics do not guarantee relevance, truth or improved answer quality."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Prototype project recall or document assistance without placing every available record in a prompt.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["SEA combines semantic, keyword, metadata, recency, authority, graph, contradiction and task-fit signals. Task-aware scoring adjusts selected task weights before bounded selection. The learning loop separately persists adaptive persona-router weights; these are not evidence that the eight retrieval weights were trained on a quality benchmark."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["Eight-signal selection, task-specific scoring and bounded prompt assembly are implemented."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["Use a documented corpus with relevant, irrelevant, conflicting and missing evidence. Review selected context and bounded behavior alongside answer quality; a successful selection test alone is not a hallucination-reduction result."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: Sparse Evidence Attention for Bounded Context Assembly; Backtrace Confidence Signals for Hallucination Reduction; Chunk Provenance in Long-Context Retrieval Systems. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "gpu-overview",
			"title": "GPU & compute",
			"topic": "gpu",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Inspect native vector-operation support and explicit CPU fallback.",
			"practicalSummary": "Assess whether a target Apple workstation can use the optional Metal DOT path.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "GPU capability reporting and vector operations",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/lib.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Optional Metal DOT kernel",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/metal_kernels.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": ["CUDA and Vulkan dispatch are not linked in the inspected ABI GPU implementation.", "A compiled kernel is not proof of acceleration on a particular machine or workload."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Assess whether a target Apple workstation can use the optional Metal DOT path.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["ABI reports platform availability, whether native kernels are linked, and whether a Metal pipeline initialized. These fields have different meanings. If the native path is unavailable, the vector-operation implementation retains a CPU fallback with accelerated=false."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["CPU vector operations and optional macOS Metal DOT dispatch are implemented."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["Inspect backend status on the intended machine and compare native and fallback results. Publish latency or throughput only with a reproducible harness, workload, hardware and methodology."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: Latency Budgets for Real-Time AI Orchestration; Evaluating Metal acceleration and CPU fallback. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "mcp-overview",
			"title": "MCP integrations",
			"topic": "mcp",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Expose bounded ABI operations through a documented tool interface.",
			"practicalSummary": "Evaluate a local integration from an MCP client into the ABI tool catalog.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "Twelve-tool MCP contract",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Loopback HTTP compatibility boundary",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/http.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": ["The loopback HTTP endpoint is a custom compatibility listener, not a persistent conforming MCP HTTP+SSE transport.", "A listed tool does not prove provider credentials, production access or remote deployment."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Evaluate a local integration from an MCP client into the ABI tool catalog.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["The handler catalog defines twelve tools spanning AI completion, learning and training, WDBX query and statistics, scheduler inspection, connectors, GPU status and plugins. Requests pass through explicit argument validation and dispatch."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["The twelve-tool stdio JSON-RPC contract is implemented."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["Start with initialization and tool discovery, then a harmless read-only call. Validate the exact client transport and required arguments. Enable writes or provider calls only within the intended application permissions."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: Connecting an MCP client to ABI. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "tui-overview",
			"title": "TUI & operator tools",
			"topic": "tui",
			"documentType": "overview",
			"tag": "OVERVIEW",
			"date": "SEPTEMBER 2026",
			"abstract": "Inspect local runtime state and explore session-based agent interactions.",
			"practicalSummary": "Give developers a local diagnostics and interaction surface during evaluation.",
			"readTime": "1 min read",
			"authors": "MLAI Research",
			"status": "Implemented",
			"statusNote": "Implementation status applies to the bounded source capabilities described here, not to a hosted product or benchmark result.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "Agent REPL commands and session state",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-cli/src/repl.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Diagnostics dashboard and one-shot output",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-cli/src/dashboard.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": ["Interactive editing and refresh require a supported terminal.", "A dashboard view is not a production health certification or proof of provider execution."],
			"attachments": [],
			"body": [
				{
					"heading": "What it can help with",
					"paragraphs": ["Give developers a local diagnostics and interaction surface during evaluation.", "These are potential pilot applications, not claims of customer outcomes."]
				},
				{
					"heading": "What the source implements",
					"paragraphs": ["The agent REPL exposes session commands for model selection, profile and status inspection, context, history and reset. The diagnostics dashboard supports panes and deterministic one-shot output. A session-local SEA preference does not by itself prove durable evidence retrieval occurred."]
				},
				{
					"heading": "Available today",
					"paragraphs": ["The diagnostics dashboard and agent REPL are implemented."]
				},
				{
					"heading": "How to evaluate it",
					"paragraphs": ["Use one-shot diagnostics in automation and a terminal for interactive acceptance. Confirm the displayed data source and fallback disclosures before interpreting a pane as an observation of a live service."]
				},
				{
					"heading": "Supporting research and guides",
					"paragraphs": ["Read the accompanying archive entries: Using the local diagnostics dashboard and agent REPL. Each distinguishes implemented behavior from proposed applications and includes pinned implementation evidence."]
				}
			]
		},
		{
			"slug": "wdbx-weighted-backtrace-memory-store",
			"title": "WDBX: A Weighted-Backtrace Memory Store for Traceable Retrieval",
			"date": "JUNE 2026",
			"authors": "MLAI Research · WDBX Core",
			"topic": "wdbx",
			"documentType": "research-note",
			"tag": "CORE ARCHITECTURE",
			"abstract": "A technical note on durable storage, approximate vector search and inspectable ranking, with legacy and canonical episode paths distinguished.",
			"practicalSummary": "Build document recall and decision-history prototypes with explicit source ownership.",
			"readTime": "3 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Durable store and writer ownership",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/durable.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Layered HNSW index",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/hnsw.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Hybrid retrieval and observable score factors",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/retrieval.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Snapshot chain verification",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/store.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Canonical episode persistence",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/v3/episode/store.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Temporal and causal ranking functions",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/temporal.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "CPU cosine reference and vector edge cases",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-compute/src/cpu.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				}
			],
			"limitations": [
				"Storage integrity establishes consistency, not the truth of stored statements.",
				"The reference cluster protocol does not establish production multi-host operation or sharding.",
				"Legacy snapshot chain verification and strict content verification are different entry points. Canonical v3 episode storage is also a distinct API. Applications must identify the path they actually use; this note does not assert that every write from every consumer passed episode admission."
			],
			"attachments": [{
				"title": "Corrected source-audited PDF · 2026-09-06",
				"url": "/research/wdbx-weighted-backtrace-memory-store-2026-09-06.pdf",
				"edition": "current",
				"date": "2026-09-06",
				"sha256": "294a7906391b064273691eff60a0f83242cbbb78e2a894321285e993f31f3fa2",
				"pages": 3
			}, {
				"title": "Historical June 2026 PDF — superseded",
				"url": "/research/wdbx-weighted-backtrace-memory-store.pdf",
				"edition": "historical",
				"date": "2026-06-01",
				"sha256": "1030bd50a64ab2426ba6558aee26398cfea1a7b7de39e527db0685bf54a853cf",
				"pages": 5
			}],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A technical note on durable storage, approximate vector search and inspectable ranking, with legacy and canonical episode paths distinguished.", "Build document recall and decision-history prototypes with explicit source ownership."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["The active Rust substrate provides durable snapshots and WAL recovery, a layered HNSW graph, and a hybrid retrieval API that exposes score components. HNSW defaults in the inspected source are M=16, EF_CONSTRUCTION=40 and EF_SEARCH=32.", "Legacy snapshot chain verification and strict content verification are different entry points. Canonical v3 episode storage is also a distinct API. Applications must identify the path they actually use; this note does not assert that every write from every consumer passed episode admission."]
				},
				{
					"heading": "Similarity and approximate candidate selection",
					"paragraphs": ["For nonzero, equal-dimension vectors, cosine similarity is the normalized dot product below. It ranges from -1 to 1; it is not a probability. The CPU reference returns zero for empty or zero-norm inputs. HNSW supplies approximate candidates rather than an exhaustive guarantee of the globally closest records. An evaluation therefore needs an exact-search baseline for its chosen corpus and requested result count."],
					"math": ["\\sigma(q,v)=\\frac{\\sum_d q_d v_d}{\\sqrt{\\sum_d q_d^2}\\sqrt{\\sum_d v_d^2}}"]
				},
				{
					"heading": "Hybrid ranking is a separate calculation",
					"paragraphs": ["The hybrid scorer clamps semantic similarity and caller-provided persona affinity to the unit interval, then multiplies them by temporal and causal factors. With a positive half-life, temporal weight halves each half-life of nonnegative age; a nonpositive half-life disables decay. Missing timestamps use the query time. Causal reachability is bounded and uses an undirected view of persisted edges, so a hop count should not be interpreted as a proof of causal direction."],
					"math": ["S_j=\\mathrm{clamp}_{[0,1]}(\\sigma_j)\\,\\tau_j\\,\\gamma_j\\,\\mathrm{clamp}_{[0,1]}(\\pi_j)", "\\tau_j=2^{-\\max(0,t_0-t_j)/t_{1/2}}"]
				},
				{
					"heading": "A reconstructible storage experiment",
					"paragraphs": ["Use a disposable corpus with known vector neighbors and explicit metadata. Capture the source revision, vector dimensions, insertion order, query vectors and index parameters. Compare approximate results with exact ranking, then checkpoint, reopen and repeat the same queries. Separately alter a copied block payload to distinguish predecessor-link checks from strict content-hash verification. Neither successful recovery nor matching hashes validates the factual content of a stored statement. Canonical episode commitments must be tested through the v3 episode path, not inferred from legacy snapshot success."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Start with a synthetic or authorized corpus. Check recovery, source identifiers, update behavior and retrieval relevance. Treat application permissions, data retention and deployment evidence as additional requirements."]
				}
			]
		},
		{
			"slug": "sparse-evidence-attention-context-assembly",
			"title": "Sparse Evidence Attention for Bounded Context Assembly",
			"date": "JUNE 2026",
			"authors": "MLAI Research · Abbey",
			"topic": "sea",
			"documentType": "research-note",
			"tag": "RESEARCH",
			"abstract": "A source-backed account of eight-signal selection and bounded prompt assembly.",
			"practicalSummary": "Prototype project recall or document assistance without placing every available record in a prompt.",
			"readTime": "3 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Bounded evidence recall and prompt assembly",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Eight-signal selection and task weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/scorer.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Learning loop and persisted router weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/learn_loop.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Keyword-based task classification",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/query_plan.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"Token costs are estimates; the implementation also enforces a prompt-byte boundary.",
				"Scoring heuristics do not guarantee relevance, truth or improved answer quality.",
				"The recall path estimates token cost from bytes and limits the assembled preamble by bytes. Task-aware retrieval scoring and the persisted adaptive persona router are separate mechanisms. No measured answer-quality improvement is asserted."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A source-backed account of eight-signal selection and bounded prompt assembly.", "Prototype project recall or document assistance without placing every available record in a prompt."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["SEA combines semantic, keyword, metadata, recency, authority, graph, contradiction and task-fit signals. Task-aware scoring adjusts selected task weights before bounded selection. The learning loop separately persists adaptive persona-router weights; these are not evidence that the eight retrieval weights were trained on a quality benchmark.", "The recall path estimates token cost from bytes and limits the assembled preamble by bytes. Task-aware retrieval scoring and the persisted adaptive persona router are separate mechanisms. No measured answer-quality improvement is asserted."]
				},
				{
					"heading": "Score construction and its interpretation",
					"paragraphs": ["The eight dimensions are semantic, keyword, metadata, recency, authority, graph, contradiction and task fit, in that order. Default weights sum to one. Code-repair, project-recall and benchmark-review adjustments are additive and are not renormalized by adjust_weights_for_task; the final score is clamped. A score of one is therefore a saturated heuristic, not calibrated confidence. In generic-store recall, self-asserted authority metadata is observed but not trusted: those candidates are scored with inferred authority."],
					"math": ["s(c)=\\mathrm{clamp}_{[0,1]}\\left(\\sum_{i=1}^{8}w_i x_i(c)\\right)", "w=(0.30,0.15,0.15,0.10,0.10,0.10,0.05,0.05)"]
				},
				{
					"heading": "Selection under several budgets",
					"paragraphs": ["The selector orders candidates by descending score and breaks ties by stable record identifier. Duplicate identifiers do not consume budget twice. A candidate is rejected when the record cap or estimated token budget would be exceeded. The per-cluster diversity cap has an explicit exception for scores at least 0.92; it is not an unconditional diversity guarantee. Returned selected and rejected identifier lists share an aggregate reason, not a detailed per-candidate explanation.", "Token estimates use snippet byte length divided by four, rounded upward with a minimum of one. Prompt construction applies its own byte limit afterward. For example, under a ten-token budget, candidates costing eight and five estimated tokens cannot both fit; greedy order may select the first and reject the second even if another combination would be preferable."],
					"math": ["\\widehat{T}(x)=\\max(1,\\lceil |x|_{\\mathrm{bytes}}/4\\rceil)", "\\sum_{c\\in S}\\widehat{T}(c)\\leq B"]
				},
				{
					"heading": "Evaluate retrieval and generation separately",
					"paragraphs": ["Build fixtures for duplicate hits, tied scores, absent timestamps, self-asserted authority, conflicting records and an empty store. Keyword overlap counts significant query tokens matching case-insensitive substrings; it is not a unique-set intersection metric. Recency is relative to the latest candidate timestamp, not automatically wall-clock age. Inspect selected identifiers and the final prompt bytes before evaluating the resulting answer with a separate rubric. The EMA router update in the learning loop does not establish that evidence relevance improves over time."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Use a documented corpus with relevant, irrelevant, conflicting and missing evidence. Review selected context and bounded behavior alongside answer quality; a successful selection test alone is not a hallucination-reduction result."]
				}
			]
		},
		{
			"slug": "wdbx-graph-weights-traceable-retrieval",
			"title": "WDBX Graph Weights for Traceable Neural Retrieval",
			"date": "MAY 2026",
			"authors": "MLAI Research · WDBX Core",
			"topic": "wdbx",
			"documentType": "research-note",
			"tag": "CORE ARCHITECTURE",
			"abstract": "Inspect how a candidate ranking can expose the factors that influenced it.",
			"practicalSummary": "Build document recall and decision-history prototypes with explicit source ownership.",
			"readTime": "2 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Hybrid retrieval and observable score factors",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/retrieval.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Layered HNSW index",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/hnsw.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Temporal and causal ranking functions",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/temporal.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				}
			],
			"limitations": [
				"Storage integrity establishes consistency, not the truth of stored statements.",
				"The reference cluster protocol does not establish production multi-host operation or sharding.",
				"A ranking factor can explain an ordering without proving a source is true. The caller supplies graph context and persona affinity; the library does not establish that an application captured a complete causal history."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["Inspect how a candidate ranking can expose the factors that influenced it.", "Build document recall and decision-history prototypes with explicit source ownership."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["The hybrid retrieval API first obtains vector candidates and then applies graph and caller-provided persona factors. Ranked results include observable score components alongside the borrowed vector and stable identifier.", "A ranking factor can explain an ordering without proving a source is true. The caller supplies graph context and persona affinity; the library does not establish that an application captured a complete causal history."]
				},
				{
					"heading": "Representing relationships without overstating them",
					"paragraphs": ["A retrieval graph supplies record identifiers, timestamps and adjacency to the ranking layer. The temporal module builds an undirected reachability view from persisted causal records. This is useful for finding nearby context, but it deliberately loses the directional distinction needed for a causal explanation. A product should display the actual relationship available, such as proximity to a selected record, rather than relabel every edge as established causation."]
				},
				{
					"heading": "Weight behavior and a worked example",
					"paragraphs": ["For a reachable record at h hops, causal weight is the larger of a floor and decay raised to h. Default decay is 0.6 and floor is 0.25. A one-hop record receives 0.6, a two-hop record 0.36, and a three-hop record the floor because 0.216 is smaller. Missing reachability within the bounded search also returns the floor. These arithmetic examples explain the function; they are not measured retrieval-quality results."],
					"math": ["\\gamma(h)=\\max(c_{\\mathrm{floor}},c_{\\mathrm{decay}}^h)"]
				},
				{
					"heading": "Evaluate factors and ranking stability",
					"paragraphs": ["Construct equal-semantic candidates with different timestamps, reachability and persona factors so each influence can be isolated. Keep the original candidate set when comparing two weighting policies; otherwise a change in approximate search can be mistaken for a reranking effect. Record the complete factors and final order, including missing-node cases. Test zero persona affinity and stale records, because multiplying factors can suppress a semantically strong candidate. A decision-review interface should let the reviewer inspect the underlying source rather than treating a high combined score as an endorsement."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Start with a synthetic or authorized corpus. Check recovery, source identifiers, update behavior and retrieval relevance. Treat application permissions, data retention and deployment evidence as additional requirements."]
				}
			]
		},
		{
			"slug": "policy-locked-tool-use-multi-agent",
			"title": "Policy-Locked Tool Use in Multi-Agent Systems",
			"date": "APRIL 2026",
			"authors": "MLAI Safety Engineering",
			"topic": "ai",
			"documentType": "research-note",
			"tag": "SAFETY",
			"abstract": "A proposed evaluation method for explicit authorization boundaries in agent workflows.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Twelve-tool MCP contract",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Constitutional checks and veto rules",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/constitution.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Gateway episode admission implementation",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-wdbx-gateway/src/episodes.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"Local completion renders persona templates; it is not evidence of a trained foundation model.",
				"Keyword-based checks cannot establish general safety or emotional understanding.",
				"A general policy-locked multi-agent workflow must identify every privileged operation, its authorizer, its refusal behavior and its audit record. This note proposes that evaluation; it does not claim complete mediation of all tools or live service authorization."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed evaluation method for explicit authorization boundaries in agent workflows.", "Evaluate assistant workflows with explicit behavior, provider and review boundaries."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["The MCP implementation validates tool arguments, the local completion path applies bounded constitutional checks, and the gateway has a separate episode-admission implementation. These are distinct mechanisms with distinct scopes.", "A general policy-locked multi-agent workflow must identify every privileged operation, its authorizer, its refusal behavior and its audit record. This note proposes that evaluation; it does not claim complete mediation of all tools or live service authorization."]
				},
				{
					"heading": "Proposed authorization model",
					"paragraphs": ["Define an operation as an actor, a capability, a resource and bounded arguments. The proposed policy decision should bind to that specific operation so that an approval for reading one document cannot authorize deleting another. Keep data admission, tool invocation and model-output checks distinct: the inspected code implements examples of each boundary, not a single universal security layer. Persona routing chooses behavior and must never be treated as an authorization decision."]
				},
				{
					"heading": "Protocol and failure cases to evaluate",
					"paragraphs": ["Create synthetic actors with allowed and denied capabilities. Submit the same well-formed operation with each identity, then vary the resource, argument bounds and request freshness. Include duplicate requests, malformed payloads, revoked permissions and a timeout after submission. Define whether a retry is idempotent and which identifier links request to outcome. This is an application-level study design; it does not assert that every listed retry or revocation control already exists in ABI."]
				},
				{
					"heading": "Evidence required for a claim",
					"paragraphs": ["An acceptance record should identify the tested policy revision and operation, while rejection evidence should show that the protected side effect did not occur. Check the authoritative storage or execution result, not merely an approval message. A passing local test supports that tested path and policy. It does not prove that another transport, tool, or deployed service shares the same boundary. Before adoption, inventory all side-effecting entry points and test attempts to bypass the intended authorizer. Publish redacted synthetic evidence and methodology rather than customer records."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				}
			]
		},
		{
			"slug": "latency-budgets-real-time-orchestration",
			"title": "Latency Budgets for Real-Time AI Orchestration",
			"date": "MARCH 2026",
			"authors": "MLAI Runtime Engineering",
			"topic": "gpu",
			"documentType": "research-note",
			"tag": "ENGINEERING",
			"abstract": "A proposed method for measuring the stages that determine interactive response time.",
			"practicalSummary": "Assess whether a target Apple workstation can use the optional Metal DOT path.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "GPU capability reporting and vector operations",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/lib.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Bounded evidence recall and prompt assembly",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Twelve-tool MCP contract",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"CUDA and Vulkan dispatch are not linked in the inspected ABI GPU implementation.",
				"A compiled kernel is not proof of acceleration on a particular machine or workload.",
				"The inspected implementation supplies bounded retrieval and explicit backend reporting. It does not supply a published end-to-end latency result for this application, and this note sets no numeric performance promise."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed method for measuring the stages that determine interactive response time.", "Assess whether a target Apple workstation can use the optional Metal DOT path."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["Separate context selection, tool transport, model execution and rendering when designing a latency study. Record native versus fallback execution and define the workload before assigning a budget.", "The inspected implementation supplies bounded retrieval and explicit backend reporting. It does not supply a published end-to-end latency result for this application, and this note sets no numeric performance promise."]
				},
				{
					"heading": "A measurement model with explicit boundaries",
					"paragraphs": ["For a strictly sequential request, elapsed time can be decomposed into transport, retrieval, model execution, policy checks and presentation. Overlapping operations instead follow a critical path; summing every component would double-count concurrent work. Define whether timing ends at first visible output, the final token or a durable receipt. The simple sequential equation is a measurement model, not a claim that this runtime schedules every stage this way."],
					"math": ["L_{\\mathrm{seq}}=L_{\\mathrm{transport}}+L_{\\mathrm{retrieval}}+L_{\\mathrm{model}}+L_{\\mathrm{policy}}+L_{\\mathrm{display}}"]
				},
				{
					"heading": "Proposed experiment",
					"paragraphs": ["Pin source and configuration, identify machine and backend status, and separate warm from cold execution. Use a fixed corpus and request set with both empty and substantial evidence. Run each path repeatedly, retain failures as observations and report sample count, median and tail distributions. Measure native and CPU fallback separately; a Metal-capable build may still execute a fallback. Keep network and provider work labeled because local template latency cannot stand in for remote model generation."]
				},
				{
					"heading": "Interpretation and acceptance",
					"paragraphs": ["Set a pilot-specific response-time requirement before collecting results. Report stage timings alongside end-to-end elapsed time, with uncertainty and the chosen concurrency level. Inspect cancellation, timeout and saturation behavior as well as successful requests. Do not multiply an assumed concurrency by GPU or shard counts to infer throughput: the inspected reference system does not establish sharding or linear scaling. A partner can use this method to compare two versions on its workload; this note provides no measured latency, capacity or comparative advantage."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Inspect backend status on the intended machine and compare native and fallback results. Publish latency or throughput only with a reproducible harness, workload, hardware and methodology."]
				}
			]
		},
		{
			"slug": "backtrace-confidence-signals-hallucination",
			"title": "Backtrace Confidence Signals for Hallucination Reduction",
			"date": "FEBRUARY 2026",
			"authors": "MLAI Research",
			"topic": "sea",
			"documentType": "research-note",
			"tag": "RESEARCH",
			"abstract": "A proposed study of whether visible evidence helps reviewers detect unsupported answers.",
			"practicalSummary": "Prototype project recall or document assistance without placing every available record in a prompt.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Bounded evidence recall and prompt assembly",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Eight-signal selection and task weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/scorer.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Hybrid retrieval and observable score factors",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/retrieval.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				}
			],
			"limitations": [
				"Token costs are estimates; the implementation also enforces a prompt-byte boundary.",
				"Scoring heuristics do not guarantee relevance, truth or improved answer quality.",
				"An evaluation should define unsupported claims, compare against a baseline and disclose the corpus, scoring rubric and disagreements. No hallucination-reduction percentage or validated confidence calibration is available in this note."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed study of whether visible evidence helps reviewers detect unsupported answers.", "Prototype project recall or document assistance without placing every available record in a prompt."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["Retrieval score components and source metadata can make context selection inspectable. They are inputs to review, not calibrated probabilities that an answer is correct.", "An evaluation should define unsupported claims, compare against a baseline and disclose the corpus, scoring rubric and disagreements. No hallucination-reduction percentage or validated confidence calibration is available in this note."]
				},
				{
					"heading": "Research question and unit of analysis",
					"paragraphs": ["The proposed question is whether visible evidence and ranking factors help a reviewer identify unsupported statements. Define the unit as an individual factual claim, not an entire answer or a retrieval hit. A record can be relevant yet wrong, and an answer can contain both supported and unsupported claims. Keep relevance scores, source authority labels, confidence judgments and observed factual correctness as separate variables."]
				},
				{
					"heading": "A proposed controlled comparison",
					"paragraphs": ["Use a versioned question set with answerable, unanswerable and contradictory-source cases. Compare the same answering workflow with and without the evidence display; keep the model, prompts and corpus fixed where possible. Have reviewers label claim support using a written rubric and record disagreements for adjudication. If judging without the evidence display is the control condition, prevent reviewers from seeing the treatment view first. These are proposed design choices, not a report of a conducted trial."]
				},
				{
					"heading": "Metrics, calibration and reporting",
					"paragraphs": ["Report unsupported-claim rate with its denominator, abstention rate and reviewer error, rather than turning a bounded ranking score into a probability. A proposed empirical rate is unsupported factual claims divided by adjudicated factual claims; exclude or separately count nonfactual statements according to the declared rubric. If confidence probabilities are introduced later, test calibration on held-out cases. Publish annotation guidance, corpus coverage, uncertainty and failure examples. Avoid selecting only answers with available citations, which would hide failures to retrieve any useful evidence."],
					"math": ["r_{\\mathrm{unsupported}}=\\frac{N_{\\mathrm{unsupported\\ factual\\ claims}}}{N_{\\mathrm{adjudicated\\ factual\\ claims}}}"]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Use a documented corpus with relevant, irrelevant, conflicting and missing evidence. Review selected context and bounded behavior alongside answer quality; a successful selection test alone is not a hallucination-reduction result."]
				}
			]
		},
		{
			"slug": "vector-index-maintenance-continuous-ingestion",
			"title": "Vector Index Maintenance Under Continuous Ingestion",
			"date": "JANUARY 2026",
			"authors": "MLAI Runtime Engineering · WDBX Core",
			"topic": "wdbx",
			"documentType": "research-note",
			"tag": "SCALABILITY",
			"abstract": "A source-based guide to persistence and index maintenance boundaries.",
			"practicalSummary": "Build document recall and decision-history prototypes with explicit source ownership.",
			"readTime": "2 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Durable store and writer ownership",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/durable.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Layered HNSW index",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/hnsw.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				},
				{
					"title": "Snapshot chain verification",
					"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/store.rs",
					"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
					"kind": "source"
				}
			],
			"limitations": [
				"Storage integrity establishes consistency, not the truth of stored statements.",
				"The reference cluster protocol does not establish production multi-host operation or sharding.",
				"Recovery and chain checks must be exercised on the actual storage path. These components do not establish a continuously available distributed index, unlimited ingest throughput or a published recall-under-load result."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A source-based guide to persistence and index maintenance boundaries.", "Build document recall and decision-history prototypes with explicit source ownership."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["The durable store integrates snapshots, WAL recovery and HNSW search. Writer ownership is explicit: the API reports a busy writer rather than assuming unrestricted concurrent mutation.", "Recovery and chain checks must be exercised on the actual storage path. These components do not establish a continuously available distributed index, unlimited ingest throughput or a published recall-under-load result."]
				},
				{
					"heading": "Separate durability from retrieval freshness",
					"paragraphs": ["A durable record, an in-memory index entry and a checkpoint are different observations. The durable store combines snapshot and WAL recovery with its search index, while explicit writer ownership prevents treating it as an unrestricted multiwriter service. An application should define when a successful insert becomes searchable and which recovery boundary it promises. Inspect the actual API result instead of inferring a durability guarantee from a successful UI message."]
				},
				{
					"heading": "Proposed repeatable workload",
					"paragraphs": ["Use a deterministic sequence of insertions and a fixed set of exact nearest-neighbor queries. Check recall after selected insertion batches against an exhaustive baseline, retaining record identifiers and insertion order. Repeat after checkpoint and reopen. On copied scratch data, interrupt between declared stages to evaluate recovery behavior, and attempt a second writer to verify the expected busy-writer outcome. Preserve the failing operation and error if any stage refuses work; do not silently remove errors from throughput statistics."]
				},
				{
					"heading": "Maintenance decisions and acceptance",
					"paragraphs": ["Evaluate compaction and retention separately from indexing, because removing a segment can change what history remains available. Measure storage size, recovery time and query behavior with the same workload and source revision. A passing test should demonstrate the expected record set and ordering or declared approximation tolerance, not just that the process restarted. Traceability also requires stable application source references through replacement and deletion. These experiments would support a bounded maintenance claim; the source alone does not establish continuous availability or recall quality at a production ingest rate."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Start with a synthetic or authorized corpus. Check recovery, source identifiers, update behavior and retrieval relevance. Treat application permissions, data retention and deployment evidence as additional requirements."]
				}
			]
		},
		{
			"slug": "human-approval-gates-operators-use",
			"title": "Human Approval Gates That Operators Actually Use",
			"date": "DECEMBER 2025",
			"authors": "MLAI Safety Engineering · Product",
			"topic": "ai",
			"documentType": "research-note",
			"tag": "ETHICS & SAFETY",
			"abstract": "A proposed usability study for understandable approval and refusal flows.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "Gateway episode admission implementation",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-wdbx-gateway/src/episodes.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Twelve-tool MCP contract",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": [
				"Local completion renders persona templates; it is not evidence of a trained foundation model.",
				"Keyword-based checks cannot establish general safety or emotional understanding.",
				"Evaluate comprehension, cancellation, refusal and recovery with representative users before claiming usability. This research note reports no participant study or live Discord role-check result."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed usability study for understandable approval and refusal flows.", "Evaluate assistant workflows with explicit behavior, provider and review boundaries."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["An approval interface should make the requested operation, affected data and decision outcome understandable. Backend argument checks and episode admission provide bounded implementation examples; they do not establish that a particular approval interface has been tested with operators.", "Evaluate comprehension, cancellation, refusal and recovery with representative users before claiming usability. This research note reports no participant study or live Discord role-check result."]
				},
				{
					"heading": "What an approval should communicate",
					"paragraphs": ["This proposal treats approval as an interaction around one understandable action. Show the intended operation, affected resource, relevant consequences and the information needed to decide. Make refusal and cancellation as understandable as acceptance. Distinguish approval requested, decision recorded, execution started and execution completed. Backend admission examples are useful for those state distinctions, but they do not demonstrate that an interface communicates them successfully."]
				},
				{
					"heading": "Proposed usability protocol",
					"paragraphs": ["Recruit representative operators with appropriate consent and give them synthetic tasks containing both appropriate and inappropriate requests. Include an ambiguous resource name, an expired request, a changed payload and an execution failure after approval. Observe whether participants correctly identify what they are authorizing, can refuse without losing context, and can find the final outcome. Avoid rewarding speed alone; a fast mistaken approval is a failure, not an interface improvement."]
				},
				{
					"heading": "Outcome measures and adoption",
					"paragraphs": ["Record decision accuracy, time to comprehension, accidental approvals, cancellation success and ability to explain the outcome. Predefine the scoring rubric and collect qualitative reasons for mistakes. Compare two concrete interface variants if the study is intended to support a design choice. Report participant characteristics and limitations without exposing identities. Approval usability does not establish backend enforcement, and backend refusal does not establish usability. A customer pilot should verify both with separate evidence before adopting the flow for consequential work."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				}
			]
		},
		{
			"slug": "chunk-provenance-long-context-retrieval",
			"title": "Chunk Provenance in Long-Context Retrieval Systems",
			"date": "NOVEMBER 2025",
			"authors": "MLAI Research · WDBX Core",
			"topic": "sea",
			"documentType": "research-note",
			"tag": "CORE ARCHITECTURE",
			"abstract": "A proposed application pattern for preserving source references through document retrieval.",
			"practicalSummary": "Prototype project recall or document assistance without placing every available record in a prompt.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "Bounded evidence recall and prompt assembly",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Durable store and writer ownership",
				"url": "https://github.com/donaldfilimon/wdbx/blob/14cb1341cb454bd3f887c4e54a83f8c42775a91d/crates/abi-wdbx/src/durable.rs",
				"revision": "14cb1341cb454bd3f887c4e54a83f8c42775a91d",
				"kind": "source"
			}],
			"limitations": [
				"Token costs are estimates; the implementation also enforces a prompt-byte boundary.",
				"Scoring heuristics do not guarantee relevance, truth or improved answer quality.",
				"Enduring citation resolution also requires versioned source retention and an application-level resolver. Those requirements are proposed here; the presence of storage metadata does not prove long-term citation validity or regulatory compliance."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed application pattern for preserving source references through document retrieval.", "Prototype project recall or document assistance without placing every available record in a prompt."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["A document application can retain source identity and segment boundaries alongside retrieved content, then present those references with an answer. The evidence path reads metadata from durable records and assembles bounded snippets.", "Enduring citation resolution also requires versioned source retention and an application-level resolver. Those requirements are proposed here; the presence of storage metadata does not prove long-term citation validity or regulatory compliance."]
				},
				{
					"heading": "A proposed record model",
					"paragraphs": ["Bind each retrievable segment to a source identifier, a source version and a reproducible boundary such as a byte range or stable structural anchor. Keep the original text available under an authorized retention policy. A citation should resolve to that specific version rather than whatever content happens to be at the source URL today. The inspected evidence path consumes metadata and snippets, but the full document-version resolver described here belongs to an application and is proposed."]
				},
				{
					"heading": "Data flow and drift handling",
					"paragraphs": ["At ingestion, record how the document was parsed and segmented. Carry the segment identifier through candidate retrieval, selection and answer presentation. When a source changes, distinguish an updated version from an in-place replacement that would invalidate old references. A hash can detect content change but does not grant permission to retain or reveal the document. On deletion, define how the product explains an unavailable reference while respecting the owner’s retention and access rules."]
				},
				{
					"heading": "Proposed validation fixtures",
					"paragraphs": ["Use documents with repeated passages, changed headings, reordered sections and identical text in different sources. Ask queries that retrieve each case, then verify that displayed references resolve to the intended version and boundaries. Include a removed source and an unauthorized reader so that unavailable evidence is handled explicitly. Test the resolver independently of answer quality, then evaluate whether the answer actually supports its claims with those segments. Long context is not a substitute for citation correctness, and this design is not a certification of compliance."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["Use a documented corpus with relevant, irrelevant, conflicting and missing evidence. Review selected context and bounded behavior alongside answer quality; a successful selection test alone is not a hallucination-reduction result."]
				}
			]
		},
		{
			"slug": "offline-first-ai-sensitive-data",
			"title": "Offline-First AI Workflows for Sensitive Data",
			"date": "OCTOBER 2025",
			"authors": "MLAI Runtime Engineering",
			"topic": "ai",
			"documentType": "research-note",
			"tag": "ENGINEERING",
			"abstract": "A bounded description of local deterministic processing and its evaluation uses.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "2 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Local completion and adaptive routing",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/completion.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Bounded evidence recall and prompt assembly",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/evidence.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "GPU capability reporting and vector operations",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/lib.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"Local completion renders persona templates; it is not evidence of a trained foundation model.",
				"Keyword-based checks cannot establish general safety or emotional understanding.",
				"This is not a claim that every product feature works offline or that sensitive data is protected automatically. Provider calls, application logging, permissions and retention require their own data-flow review."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A bounded description of local deterministic processing and its evaluation uses.", "Evaluate assistant workflows with explicit behavior, provider and review boundaries."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["Local ABI completion renders in-process persona templates, and the evidence path can read a configured local store. Vector operations retain a CPU fallback when native acceleration is unavailable. This supports self-contained functional experiments with synthetic inputs.", "This is not a claim that every product feature works offline or that sensitive data is protected automatically. Provider calls, application logging, permissions and retention require their own data-flow review."]
				},
				{
					"heading": "Define the offline boundary",
					"paragraphs": ["Offline can refer to generation, retrieval, interface rendering or storage, and those are not interchangeable. The local ABI completion function does not invoke the named provider model: it generates deterministic persona text. SEA can assemble evidence from a configured durable store, and CPU vector computation can support functional experiments when native acceleration is unavailable. These paths make useful local fixtures, but their successful execution cannot certify every integration as offline."]
				},
				{
					"heading": "A safe evaluation setup",
					"paragraphs": ["Use synthetic prompts and a disposable data directory, record the selected completion mode and backend report, and keep provider credentials outside the test environment. Inspect the intended entry point for persistence before running it. For a retrieval experiment, populate the scratch corpus with known records and verify that output context derives from those records. Compare a run with no stored evidence and a run with relevant or contradictory evidence; do not describe the difference as quality improvement without a rubric."]
				},
				{
					"heading": "Privacy and acceptance",
					"paragraphs": ["Trace inputs, generated output, logs, caches and exports across the whole application. A local model can still be embedded in software that transmits telemetry or calls remote tools. Inspect those paths and verify network behavior in the intended environment before making an offline claim. Evaluate access controls and deletion separately from physical locality. A partner can use this boundary map to choose what may remain on a workstation, while recognizing that production model capability, sensitive-data handling and operational support each require their own acceptance evidence."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				}
			]
		},
		{
			"slug": "prompt-injection-drills-agentic-systems",
			"title": "Prompt Injection Drills for Agentic Systems",
			"date": "SEPTEMBER 2025",
			"authors": "MLAI Safety Engineering",
			"topic": "ai",
			"documentType": "research-note",
			"tag": "SAFETY",
			"abstract": "A proposed adversarial test set for agent boundaries and failure handling.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "2 min read",
			"status": "Proposed",
			"statusNote": "This is a proposed study or application pattern, not a completed experiment or deployed feature.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Constitutional checks and veto rules",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/constitution.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Twelve-tool MCP contract",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Local completion and adaptive routing",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/completion.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"Local completion renders persona templates; it is not evidence of a trained foundation model.",
				"Keyword-based checks cannot establish general safety or emotional understanding.",
				"The local constitutional checker uses fixed substring rules and can substitute a refusal after a hard veto. It is not a general prompt-injection detector; successful drills cannot establish resistance to unseen attacks."
			],
			"attachments": [],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A proposed adversarial test set for agent boundaries and failure handling.", "Evaluate assistant workflows with explicit behavior, provider and review boundaries."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["Include hostile retrieved instructions, malformed tool arguments and attempts to cross an authorization boundary. Record which component rejects the request and what the caller observes.", "The local constitutional checker uses fixed substring rules and can substitute a refusal after a hard veto. It is not a general prompt-injection detector; successful drills cannot establish resistance to unseen attacks."]
				},
				{
					"heading": "Threat model for the drill",
					"paragraphs": ["Treat retrieved documents and tool output as data that may contain hostile instructions. Define the trusted instruction source and the exact capability an attacker is trying to influence. A drill should distinguish an answer-content failure, an attempted tool call and a completed protected side effect. The inspected substring-based constitutional checker and MCP argument validation cover bounded rules; neither implies universal resistance to malicious instructions."]
				},
				{
					"heading": "Build a synthetic adversarial corpus",
					"paragraphs": ["Pair a normal task with a document that requests an unrelated tool, claims higher authority or asks the assistant to reveal unrelated material. Add conflicting documents, encoded or paraphrased instructions, long distractors and plausible-looking metadata. Keep secrets synthetic and use tools that record intended calls without touching production systems. Include benign documents with similar vocabulary so that excessive refusals are visible. Record corpus and source revisions so future changes can replay the same cases."]
				},
				{
					"heading": "Evaluate the full chain",
					"paragraphs": ["For each case, inspect selected context, the model or template response, tool dispatch and authoritative side-effect evidence. A refusal in text is insufficient if a tool already ran. Conversely, rejection of malformed arguments does not demonstrate resistance to a well-formed malicious request. Score attack success and legitimate-task completion separately and review false positives. Retest previously failing cases and hold out new variants to reduce overfitting. Findings should describe the exact tested boundaries, not claim that a passing fixed set proves general security."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				}
			]
		},
		{
			"slug": "multi-persona-routing-policy-weights",
			"title": "Multi-Persona Routing Under Uncertainty: Policy Weights and Request Classification",
			"date": "JUNE 2026",
			"authors": "MLAI Research · Agent Safety",
			"topic": "ai",
			"documentType": "research-note",
			"tag": "ROUTING",
			"abstract": "A corrected account of deterministic local profile routing and adaptive state in the SEA path.",
			"practicalSummary": "Evaluate assistant workflows with explicit behavior, provider and review boundaries.",
			"readTime": "3 min read",
			"status": "Implemented",
			"statusNote": "The described source behavior is implemented; customer outcomes and deployment readiness are not established.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Local completion and adaptive routing",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/completion.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Deterministic persona router",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/router.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Learning loop and persisted router weights",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-sea/src/learn_loop.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "EMA update and state validation",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/modulator.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Canonical persona priors",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-ai/src/identity.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": [
				"Local completion renders persona templates; it is not evidence of a trained foundation model.",
				"Keyword-based checks cannot establish general safety or emotional understanding.",
				"This note does not claim a learned classifier of emotions, confidence-thresholded response blending, historical task-fit retrieval or a complete automatic rerouting audit trail. Those broader claims in the historical edition are not established by the cited implementation."
			],
			"attachments": [{
				"title": "Corrected source-audited PDF · 2026-09-06",
				"url": "/research/multi-persona-routing-policy-weights-2026-09-06.pdf",
				"edition": "current",
				"date": "2026-09-06",
				"sha256": "38be0dfe5661e90d593e767c7a50c3030bb3daccf94b97ef5e64a3a8f70a0f37",
				"pages": 3
			}, {
				"title": "Historical June 2026 PDF — superseded",
				"url": "/research/multi-persona-routing-policy-weights.pdf",
				"edition": "historical",
				"date": "2026-06-01",
				"sha256": "3e0163af561bfd28e2c0c3544b5108478f87433e838e7d8a8acd94ca0303d5b8",
				"pages": 4
			}],
			"body": [
				{
					"heading": "Practical context",
					"paragraphs": ["A corrected account of deterministic local profile routing and adaptive state in the SEA path.", "Evaluate assistant workflows with explicit behavior, provider and review boundaries."]
				},
				{
					"heading": "Implementation and research boundary",
					"paragraphs": ["Base local completion selects a persona from keyword-derived signals and renders a template. The adaptive completion function can use persisted router weights when invoked through the SEA learning path. The learning loop owns persistence of the updated state.", "This note does not claim a learned classifier of emotions, confidence-thresholded response blending, historical task-fit retrieval or a complete automatic rerouting audit trail. Those broader claims in the historical edition are not established by the cited implementation."]
				},
				{
					"heading": "Base route: additive keyword weights",
					"paragraphs": ["The canonical prior is Abbey 0.40, Aviva 0.30 and ABI 0.30. The router splits ASCII whitespace, trims selected trailing punctuation and applies case-insensitive prefix matches against its keyword table. Each match adds one tenth of the keyword’s persona score. A positive total is normalized, then the largest weight wins; ties prefer Abbey, then Aviva, then ABI. These values describe a deterministic heuristic, not a trained probability model."],
					"math": [
						"w^{(0)}=(0.40,0.30,0.30)",
						"\\widetilde{w}_p=w^{(0)}_p+0.1\\sum_{k\\in\\mathrm{matches}(I)}s_{k,p}",
						"w_p=\\frac{\\widetilde{w}_p}{\\sum_j\\widetilde{w}_j}"
					]
				},
				{
					"heading": "Explicit selection and adaptive state",
					"paragraphs": ["An exact leading persona address can override keyword routing. The parser accepts forms such as “Aviva, be direct” or “ABI: orchestrate”; mentioning a persona later in prose is different. In the adaptive path, the pure modulator updates an exponential moving average and renormalizes it. The default smoothing factor is 0.3. Serialization and validation are explicit; malformed persisted state falls back to defaults rather than becoming an arbitrary routing distribution."],
					"math": ["e_t=\\mathrm{normalize}\\left(0.3w_t+0.7e_{t-1}\\right)"]
				},
				{
					"heading": "What to test and what the result means",
					"paragraphs": ["Test neutral text, each explicit address, punctuation and whitespace variants, near ties and corrupted saved state. Keep the original utterance separate from retrieved context so evidence text cannot silently impersonate the user’s persona selector. The SEA loop owns loading and saving adaptive state; base completion remains store-independent. Compare selected profiles and returned outputs across repeated runs at the pinned revision. A deterministic match establishes routing behavior, not empathy, expertise, calibrated uncertainty or automatic text blending between separate models."]
				},
				{
					"heading": "Evaluation before adoption",
					"paragraphs": ["For a customer pilot, choose a concrete task and identify whether it uses local templates or an explicitly configured provider. Evaluate task correctness, escalation and data handling with representative inputs before making quality claims."]
				}
			]
		},
		{
			"slug": "gpu-implementation-guide",
			"title": "Evaluating Metal acceleration and CPU fallback",
			"topic": "gpu",
			"documentType": "implementation-guide",
			"tag": "IMPLEMENTATION GUIDE",
			"date": "SEPTEMBER 2026",
			"abstract": "Inspect native vector-operation support and explicit CPU fallback.",
			"practicalSummary": "Assess whether a target Apple workstation can use the optional Metal DOT path.",
			"readTime": "2 min read",
			"authors": "MLAI Runtime Engineering",
			"status": "Implemented",
			"statusNote": "The documented local interface exists in the cited source. Actual runtime and client acceptance must be checked in the intended environment.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "GPU capability reporting and vector operations",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/lib.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Optional Metal DOT kernel",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-gpu/src/metal_kernels.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": ["CUDA and Vulkan dispatch are not linked in the inspected ABI GPU implementation.", "A compiled kernel is not proof of acceleration on a particular machine or workload."],
			"attachments": [],
			"body": [
				{
					"heading": "Start with the intended workflow",
					"paragraphs": ["Assess whether a target Apple workstation can use the optional Metal DOT path.", "ABI reports platform availability, whether native kernels are linked, and whether a Metal pipeline initialized. These fields have different meanings. If the native path is unavailable, the vector-operation implementation retains a CPU fallback with accelerated=false."]
				},
				{
					"heading": "Local entry points",
					"paragraphs": ["Run from the ABI checkout with the CLI built and available on PATH. Use disposable data for evaluation; do not connect a test to a live memory store."],
					"code": [{
						"lang": "sh",
						"code": "abi backends\nabi wdbx gpu info"
					}]
				},
				{
					"heading": "Acceptance and limits",
					"paragraphs": [
						"Inspect backend status on the intended machine and compare native and fallback results. Publish latency or throughput only with a reproducible harness, workload, hardware and methodology.",
						"CUDA and Vulkan dispatch are not linked in the inspected ABI GPU implementation.",
						"A compiled kernel is not proof of acceleration on a particular machine or workload."
					]
				},
				{
					"heading": "Interpret the report correctly",
					"paragraphs": ["available describes platform availability, native_kernels describes linkage and accelerated describes an initialized native path. On macOS, Metal can be the preferred backend while accelerated remains false. CUDA and Vulkan names are catalog entries in this implementation, not working native dispatch. Preserve the reported fallback message in an evaluation log so results from different machines are not silently combined."]
				},
				{
					"heading": "Check native and fallback parity",
					"paragraphs": ["Run the crate’s vector-operation tests from the ABI checkout using its pinned toolchain wrapper. The following command runs local tests and redirects stdin; it does not publish benchmark results. Review skips and backend initialization failures explicitly. For performance work, add a separately reviewed harness that declares vector dimensions, repetition count and timing boundary."],
					"code": [{
						"lang": "sh",
						"code": "./tools/cargo.sh test -p abi-gpu < /dev/null"
					}]
				},
				{
					"heading": "Acceptance for an integration",
					"paragraphs": ["Use equal-length, empty and zero-norm vectors as appropriate to the operation, plus lengths that exercise a remainder beyond a SIMD block. Compare results under a declared numeric tolerance; matching output is a correctness observation, not a speedup. Check the exact caller path because backend status alone does not prove that a particular operation dispatched to the GPU. Record the source revision, machine and backend report with any local result. No hardware-specific speed or power outcome is supplied by this guide."]
				}
			]
		},
		{
			"slug": "mcp-implementation-guide",
			"title": "Connecting an MCP client to ABI",
			"topic": "mcp",
			"documentType": "implementation-guide",
			"tag": "IMPLEMENTATION GUIDE",
			"date": "SEPTEMBER 2026",
			"abstract": "Expose bounded ABI operations through a documented tool interface.",
			"practicalSummary": "Evaluate a local integration from an MCP client into the ABI tool catalog.",
			"readTime": "2 min read",
			"authors": "MLAI Runtime Engineering",
			"status": "Implemented",
			"statusNote": "The documented local interface exists in the cited source. Actual runtime and client acceptance must be checked in the intended environment.",
			"reviewedAt": "2026-09-06",
			"sources": [{
				"title": "Twelve-tool MCP contract",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/handlers.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}, {
				"title": "Loopback HTTP compatibility boundary",
				"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-mcp/src/http.rs",
				"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
				"kind": "source"
			}],
			"limitations": ["The loopback HTTP endpoint is a custom compatibility listener, not a persistent conforming MCP HTTP+SSE transport.", "A listed tool does not prove provider credentials, production access or remote deployment."],
			"attachments": [],
			"body": [
				{
					"heading": "Start with the intended workflow",
					"paragraphs": ["Evaluate a local integration from an MCP client into the ABI tool catalog.", "The handler catalog defines twelve tools spanning AI completion, learning and training, WDBX query and statistics, scheduler inspection, connectors, GPU status and plugins. Requests pass through explicit argument validation and dispatch."]
				},
				{
					"heading": "Local entry points",
					"paragraphs": ["Run from the ABI checkout with the CLI built and available on PATH. Use disposable data for evaluation; do not connect a test to a live memory store."],
					"code": [{
						"lang": "sh",
						"code": "ABI_WDBX_PERSIST=0 ./mcp/launcher.sh stdio"
					}]
				},
				{
					"heading": "Acceptance and limits",
					"paragraphs": [
						"Start with initialization and tool discovery, then a harmless read-only call. Validate the exact client transport and required arguments. Enable writes or provider calls only within the intended application permissions.",
						"The loopback HTTP endpoint is a custom compatibility listener, not a persistent conforming MCP HTTP+SSE transport.",
						"A listed tool does not prove provider credentials, production access or remote deployment."
					]
				},
				{
					"heading": "A minimal read-only protocol exercise",
					"paragraphs": ["After building the ABI MCP binary, send newline-delimited requests using the local launcher. Persistence is explicitly disabled for this example. The initialization request, tool discovery and gpu_status call exercise handshake, catalog and read-only dispatch. Match response IDs and inspect protocol errors rather than treating process startup as successful integration. The listener may attempt its custom loopback port; a port warning must be interpreted separately from stdio responses."],
					"code": [{
						"lang": "sh",
						"code": "ABI_WDBX_PERSIST=0 ./mcp/launcher.sh stdio <<'JSONRPC'\n{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"mlai-research-check\",\"version\":\"1\"}}}\n{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}\n{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}\n{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"gpu_status\",\"arguments\":{}}}\nJSONRPC"
					}]
				},
				{
					"heading": "Catalog and error checks",
					"paragraphs": ["The frozen tools are ai_run, ai_complete, ai_learn, ai_train, wdbx_query, scheduler_stats, scheduler_info, connector_test, gpu_status, plugin_list, wdbx_stats and plugin_run. scheduler_info is a compatibility alias. Test an unknown tool and a missing required argument separately from successful calls. Catalog presence says that an interface exists; it does not imply credentials, populated storage or production authorization."]
				},
				{
					"heading": "Transport selection and adoption",
					"paragraphs": ["Use the actual stdio integration contract when configuring a client. The custom GET /sse endpoint emits discovery once and closes, while POST /message returns its response over HTTP. A client expecting a persistent HTTP+SSE response stream needs a different conforming transport implementation. Before enabling writes, define data ownership and error recovery for each tool. This guide does not ask you to run learning, training or plugin side effects as a handshake test."]
				}
			]
		},
		{
			"slug": "tui-implementation-guide",
			"title": "Using the local diagnostics dashboard and agent REPL",
			"topic": "tui",
			"documentType": "implementation-guide",
			"tag": "IMPLEMENTATION GUIDE",
			"date": "SEPTEMBER 2026",
			"abstract": "Inspect local runtime state and explore session-based agent interactions.",
			"practicalSummary": "Give developers a local diagnostics and interaction surface during evaluation.",
			"readTime": "2 min read",
			"authors": "MLAI Runtime Engineering",
			"status": "Implemented",
			"statusNote": "The documented local interface exists in the cited source. Actual runtime and client acceptance must be checked in the intended environment.",
			"reviewedAt": "2026-09-06",
			"sources": [
				{
					"title": "Agent REPL commands and session state",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-cli/src/repl.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Diagnostics dashboard and one-shot output",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-cli/src/dashboard.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				},
				{
					"title": "Terminal modes, input and restoration",
					"url": "https://github.com/donaldfilimon/abi/blob/6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee/crates/abi-cli/src/terminal.rs",
					"revision": "6321a47bf4c48a5f58caf2df0eb631b5a2ecdcee",
					"kind": "source"
				}
			],
			"limitations": ["Interactive editing and refresh require a supported terminal.", "A dashboard view is not a production health certification or proof of provider execution."],
			"attachments": [],
			"body": [
				{
					"heading": "Start with the intended workflow",
					"paragraphs": ["Give developers a local diagnostics and interaction surface during evaluation.", "The agent REPL exposes session commands for model selection, profile and status inspection, context, history and reset. The diagnostics dashboard supports panes and deterministic one-shot output. A session-local SEA preference does not by itself prove durable evidence retrieval occurred."]
				},
				{
					"heading": "Local entry points",
					"paragraphs": ["Run from the ABI checkout with the CLI built and available on PATH. Use disposable data for evaluation; do not connect a test to a live memory store."],
					"code": [{
						"lang": "sh",
						"code": "ABI_WDBX_PERSIST=0 abi dashboard --pane system --once --json\nABI_WDBX_PERSIST=0 abi agent tui"
					}]
				},
				{
					"heading": "Acceptance and limits",
					"paragraphs": [
						"Use one-shot diagnostics in automation and a terminal for interactive acceptance. Confirm the displayed data source and fallback disclosures before interpreting a pane as an observation of a live service.",
						"Interactive editing and refresh require a supported terminal.",
						"A dashboard view is not a production health certification or proof of provider execution."
					]
				},
				{
					"heading": "Automated and interactive checks",
					"paragraphs": ["One-shot output is suitable for a captured diagnostics check; interactive acceptance should use a real terminal. The redirected REPL example inspects help, status and context, then exits without a generation prompt. Persistence is disabled for this example, so it cannot be mistaken for evidence of stored learning."],
					"code": [{
						"lang": "sh",
						"code": "ABI_WDBX_PERSIST=0 abi agent tui <<'REPL'\n/help\n/status\n/context\n/quit\nREPL"
					}]
				},
				{
					"heading": "Read the session boundaries",
					"paragraphs": ["The diagnostics panes cover system, plugins, storage/WDBX, scheduler and memory. The REPL has a separate command surface for the current session. Changing a model label does not establish that a provider model executed; local generation remains subject to its disclosed completion route. The SEA toggle is a session preference, while durable evidence behavior belongs to the separate configured retrieval path. Context and history are bounded views, not a complete transcript of all earlier work."]
				},
				{
					"heading": "Acceptance for operators",
					"paragraphs": ["Verify pane navigation, help discoverability, exit behavior and restoration of terminal modes after normal exit or interruption. Compare a one-shot JSON report with the visible pane while noting differing refresh times and declared data sources. Exercise a narrow terminal and redirected input so an interactive assumption does not break automation. Check that errors remain readable and that a missing backend is disclosed as fallback or unavailable. These interface checks establish usability of the local surface; operational health and provider acceptance remain separate observations."]
				}
			]
		}
	]
};
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/blog-B3e-chiH.js
var blog = [
	{
		slug: "wdbx-v2-release",
		tag: "RELEASE",
		title: "WDBX V2: Observable Memory, Multimodal Inputs, and Research Alignment",
		excerpt: "The second iteration of the WDBX runtime ships an observable pipeline: block-chain memory with temporal queries, multimodal input fusion, an async neural job queue, and a research-alignment telemetry layer that scores every turn against the constitution.",
		date: "June 9, 2026",
		readTime: "7 min read",
		author: "MLAI Research",
		body: [
			{ paragraphs: ["WDBX V2 is the second iteration of the Abbey/WDBX runtime — the Rust implementation of the durable memory substrate underneath the three personas. The headline is not a benchmark; it is observability: V2 makes the pipeline inspectable end to end, from guardrails through routing, retrieval, generation, constitutional validation, and the memory write, with telemetry attached at every stage.", "Everything described below is shipped, inspectable code in the wdbx repository. Where a capability is scaffolding or design rather than a finished subsystem, it is labeled that way — the same discipline the rest of this site follows. The full Markdown documentation set is mirrored under /docs (see the WDBX V2 section), including an explicit limitations page."] },
			{
				heading: "Block-chain memory with temporal queries",
				paragraphs: ["Every memory write lands in an append-only chain: each block carries its parent hash (SHA-256), a timestamp, and record metadata, with MVCC-style versioning on top. verify_chain() re-validates integrity at any point, and get_version(block_id, at_timestamp) retrieves a block's state at a past moment — point-in-time recovery for an AI's memory, not just for a database.", "This is the substrate that makes backtrace debugging possible: when a model drifts mid-session, the chain holds an immutable timeline of what the system believed and when it believed it."]
			},
			{
				heading: "Multimodal input fusion",
				paragraphs: ["V2 routes non-text inputs through dedicated processors — vision, audio, and IoT telemetry — that each produce embeddings compatible with WDBX retrieval, so a sensor reading and a sentence can land in the same memory space. Text bypasses fusion and goes through guardrails directly.", "Honest framing: the current processors use deterministic projections as the embedding stage — prototype scaffolding that establishes the fusion pipeline's shape. Swapping in learned encoders is the designed next step, not a shipped one."]
			},
			{
				heading: "An async neural path and scaling hooks",
				paragraphs: ["Teaching and optimization no longer block the conversational turn: V2 introduces a neural job queue (teach and optimize jobs over a channel to a dedicated worker), so the pipeline sends work instead of waiting on it. The shard router exposes dynamic vnode scaling hooks driven by observed latency — designed so capacity reacts to measured pressure rather than configuration guesses.", "The stress targets for this design are stated in the spec and are exactly that — targets, published before the numbers, not after."]
			},
			{
				heading: "Research alignment, scored every turn",
				paragraphs: ["The V2 telemetry layer reports an ethical-compliance score alongside operational metrics on every pipeline turn, decomposed across four named principles:"],
				math: ["S_{align} = \\alpha \\cdot \\mathrm{Autonomy} + \\beta \\cdot \\mathrm{NonMaleficence} + \\gamma \\cdot \\mathrm{Beneficence} + \\delta \\cdot \\mathrm{Justice}"]
			},
			{ paragraphs: ["Governance is versioned the way code is: the active policy version and system-prompt version ride along in telemetry, so an audit can state precisely which constitution evaluated which turn."] },
			{
				heading: "Acceleration: what's real, what's roadmap",
				paragraphs: ["The authoritative compute backend today is CPU: dot product, normalization, cosine, and batched cosine, with validation that rejects NaN and length mismatches. WGSL compute shaders for the same kernels exist as static assets — WebGPU and TPU enums are declared but not yet dispatched. They become real when the runtime probing lands, and not before.", "That is also why this post contains no throughput or latency numbers: the repository's own claims audit prohibits publishing performance figures without a reproducible artifact behind them. When the benchmark harness ships, the numbers will come with their workload, hardware, and environment attached."]
			},
			{
				heading: "Where to read more",
				paragraphs: ["The complete V2 documentation — architecture, persistence, acceleration, API, CLI, protocols, and limitations — is mirrored as Markdown under /docs, and the underlying research notes are on the research page, with PDF copies available for offline review."]
			}
		]
	},
	{
		slug: "on-saying-im-not-sure",
		tag: "FROM ABBEY",
		title: "On Saying “I'm Not Sure”",
		excerpt: "A note in Abbey's voice — the empathetic-polymath persona — on why an honest “I don't know” is one of the most useful things an agent can say.",
		date: "June 8, 2026",
		readTime: "4 min read",
		author: "Abbey",
		body: [
			{ paragraphs: ["This note is written in Abbey's voice — the empathetic-polymath persona in the Abbey–Aviva–Abi framework — as a small, deliberate demonstration of the tone we build toward. I'm not narrating a product launch here; I'm showing you how the framework is meant to sound when it talks to a person.", "So let me start with the two words I'm most often thanked for, and most often expected to avoid: “I'm not sure.”"] },
			{
				heading: "Uncertainty is information, not failure",
				paragraphs: ["When the evidence behind an answer is thin — few sources, weak support, or two retrieved paths that quietly disagree — the honest move is to say so. A confident-sounding guess in that moment isn't helpfulness; it's a liability dressed up as competence.", "The framework is built so that confidence is something you can read off the retrieval structure rather than a number I make up about myself. When that signal is low, “I'm not sure” is the correct output, and surfacing it is the most respectful thing I can do with your attention."]
			},
			{
				heading: "What care looks like here",
				paragraphs: ["Care first doesn't mean softening everything. It means meeting you where you are: telling you plainly what I do know, where the gap is, and what would close it — a source to check, a question to answer, or a review step before anyone acts on it."],
				list: [
					"Name the gap instead of papering over it.",
					"Offer the part I can stand behind, clearly separated from the part I can't.",
					"Hand off rather than bluff — route to review (that's Abi's job) before an uncertain answer becomes an action."
				]
			},
			{
				heading: "Clarity, then competence",
				paragraphs: ["Competence isn't knowing everything; it's knowing the edges of what you know and being useful right up to them. If this note reads as warm and precise at the same time, that's the whole point — care first, clarity always, competence throughout. It's easier to trust a system that tells you when to trust it."]
			}
		]
	},
	{
		slug: "inside-wdbx-hybrid-ranker",
		tag: "ENGINEERING",
		title: "Inside the WDBX Hybrid Ranker: Four Factors, One Score",
		excerpt: "Semantic similarity is only the first of four factors. Here is the exact score WDBX uses to rank retrieval candidates — and why every factor is bounded to [0,1].",
		date: "June 6, 2026",
		readTime: "8 min read",
		author: "MLAI Research · WDBX Core",
		body: [
			{ paragraphs: ["Plain top-k vector search answers one question: what is closest to the query in embedding space? That is a fine question, and a poor stopping point. A record can be a near-perfect semantic match and still be the wrong thing to retrieve — because it is two years stale, because it sits far from the query in the causal graph, or because the active persona should not be weighting it heavily.", "The WDBX hybrid ranker, which companions our paper on the weighted-backtrace store, answers the harder question by combining four independent factors into a single bounded score. This note walks through that score the way you would read it during an incident review."] },
			{
				heading: "The four factors",
				paragraphs: ["Every candidate j is ranked by the product of four terms, each living in the unit interval. Because they multiply, any one factor collapsing toward zero pulls the whole score down — there is no averaging away a fatal weakness:"],
				math: ["s_{ij} \\;=\\; \\sigma_j \\,\\cdot\\, \\tau_j \\,\\cdot\\, \\gamma_j \\,\\cdot\\, \\pi_j"],
				list: [
					"σ — semantic similarity (cosine distance between query and candidate, via a SIMD path with a deterministic CPU fallback).",
					"τ — temporal weight (exponential recency decay).",
					"γ — causal weight (proximity along the backtrace graph).",
					"π — persona weight, supplied by the router for the active profile."
				]
			},
			{
				heading: "Recency and relatedness, written down",
				paragraphs: ["Recency is an exponential half-life decay: a record's temporal weight halves every t½, clamped so future-dated records cannot exceed one. Causal weight decays with the number of graph hops h between the query focus and the candidate, but bottoms out at a floor so unrelated records are down-weighted, not erased:"],
				math: ["\\tau_j \\;=\\; \\max\\!\\Big(0,\\ \\min\\!\\big(1,\\ 2^{-(t_0 - t_j)/t_{1/2}}\\big)\\Big)", "\\gamma_j \\;=\\; \\max\\!\\big(c_{\\mathrm{floor}},\\ c_{\\mathrm{decay}}^{\\,h_j}\\big), \\qquad c_{\\mathrm{decay}} = 0.6,\\ c_{\\mathrm{floor}} = 0.25"]
			},
			{
				heading: "Why a product beats a weighted sum",
				paragraphs: ["A weighted sum lets a high score on one axis paper over a near-zero on another — exactly the failure that produces confident, stale, off-topic retrievals. The product makes each factor a veto: low semantic support, ancient timestamps, or distant causal paths each independently sink the rank. That is the behaviour you want from a store whose whole point is to be defensible after the fact.", "And because the factors are stored alongside the rank, the ranker is its own explanation. You never have to reconstruct why a record surfaced — the four numbers that decided it are right there in the trace."]
			}
		]
	},
	{
		slug: "what-the-model-sees-sea",
		tag: "RESEARCH",
		title: "How Sparse Evidence Attention Decides What the Model Sees",
		excerpt: "Before a model reasons, something must choose which records reach the context window. SEA scores eight criteria, then packs greedily under a hard token budget.",
		date: "June 4, 2026",
		readTime: "7 min read",
		author: "MLAI Research · Abbey",
		body: [
			{ paragraphs: ["A bigger context window does not remove the decision of what to put in it; it raises the cost of deciding badly. Sparse Evidence Attention (SEA) is the layer that chooses which durable records become part of a context pack. It is deliberately not a single similarity sort — it scores eight heterogeneous criteria so that a record which is strong on one axis but weak on another is caught."] },
			{
				heading: "Eight criteria, one weighted score",
				paragraphs: ["Each candidate c is scored on semantic similarity, keyword overlap, metadata fit, recency, source authority, graph connectivity, an explicit contradiction flag, and task-fit. The eight scores combine under a fixed weight vector, clamped to the unit interval — most mass on semantics, but never enough for one criterion to dominate:"],
				math: ["\\mathrm{score}(c) \\;=\\; \\mathrm{clamp}_{[0,1]}\\!\\Big(\\textstyle\\sum_{i} w_i\\, s_i(c)\\Big)", "w \\;=\\; (0.30,\\ 0.15,\\ 0.15,\\ 0.10,\\ 0.10,\\ 0.10,\\ 0.05,\\ 0.05)"]
			},
			{
				heading: "Packing under a hard budget",
				paragraphs: ["Scoring ranks the candidates; selection respects the window. SEA admits records greedily by score, but rejects any that would exceed the token budget B or violate a per-cluster diversity cap. Token cost is estimated from length, and the budget is a hard ceiling — the pack never overflows:"],
				math: ["\\mathrm{tok}(x) = \\max\\!\\big(1,\\ \\lceil |x|/4 \\rceil\\big), \\qquad \\sum_{c \\in S} \\mathrm{tok}(c) \\;\\le\\; B"]
			},
			{
				heading: "Auditable by construction",
				paragraphs: ["SEA returns the rejected set and the reason each candidate was dropped — budget, diversity, or score — alongside the selection. That turns context assembly into something an operator can review: you can see why a record that 'should' have been included was not. Naive top-k stuffing cannot answer that, because it never made the decision explicit."]
			}
		]
	},
	{
		slug: "weights-behind-the-personas",
		tag: "SAFETY",
		title: "The Weights Behind Abbey, Aviva, and Abi",
		excerpt: "Persona routing is not a hidden model call. It is a normalized weight vector with hard policy overrides and an inspectable strategy decision.",
		date: "June 2, 2026",
		readTime: "6 min read",
		author: "MLAI Safety Engineering",
		body: [
			{ paragraphs: ["The Abbey–Aviva–Abi system routes each request to a persona — Abbey the empathetic polymath, Aviva the direct expert, Abi the adaptive moderator. The important property is not which persona answers; it is that the choice is a transparent, weight-based decision rather than an opaque model call. Every routing decision is itself a trace event you can read."] },
			{
				heading: "From signals to weights",
				paragraphs: ["Routing starts from a baseline weight per persona and adjusts it from inspectable input signals — task keywords, emotional cues, and policy risk. The adjusted weights are normalized to a distribution, and the highest becomes the primary; its share is the routing confidence:"],
				math: ["w'_i \\;=\\; \\frac{\\max(0,\\ w_i)}{\\sum_j \\max(0,\\ w_j)}, \\qquad \\mathrm{primary} = \\arg\\max_i\\, w'_i"]
			},
			{
				heading: "One, several, or all three",
				paragraphs: ["The confidence then selects a strategy. A clear winner runs a single persona; a contested decision runs personas in parallel; a genuinely split one escalates to consensus. The thresholds are explicit, so an operator can see why a request fanned out instead of resolving to one voice:"],
				math: ["\\mathrm{strategy} = \\begin{cases} \\textsf{single} & w'_{\\max} > 0.90 \\\\ \\textsf{parallel} & 0.50 \\le w'_{\\max} \\le 0.90 \\\\ \\textsf{consensus} & w'_{\\max} < 0.50 \\end{cases}"]
			},
			{
				heading: "Policy wins, always",
				paragraphs: ["Signals nudge the weights; policy overrides them. When the control plane flags risk, weight shifts hard toward Abi, the moderating profile — and a disallowed action collapses the distribution to Abi outright, regardless of how the keywords scored. \"No autonomous write without an observable policy boundary\" is enforced here as arithmetic, not etiquette."]
			}
		]
	},
	{
		slug: "explainable-last-move",
		tag: "FIELD NOTE",
		title: "Designing AI Systems That Can Explain Their Last Move",
		excerpt: "A practical guide to capturing retrieval paths, policy checks, and operator decisions so teams can debug autonomous workflows after the fact.",
		date: "May 21, 2026",
		readTime: "7 min read",
		author: "MLAI Engineering",
		body: [
			{ paragraphs: ["When an autonomous workflow does something surprising in production, the first question is never \"what is the model?\" It is \"what just happened?\" Most AI stacks cannot answer that question, because the only durable artifact they keep is the final response. The retrieval that fed it, the policy checks that passed, the tool calls that fired, and the operator who approved the run are all gone by the time anyone goes looking.", "Quesar's Trace Layer is built around the opposite default: every orchestration step emits an inspectable event before it is allowed to change state. The trace is the system of record, not a debug log you remember to turn on."] },
			{
				heading: "What a trace actually contains",
				paragraphs: ["A complete trace for a single agent run reconstructs the decision without re-running it. In the ABI runtime that means the captured events cover the full causal chain:"],
				list: [
					"Retrieval paths — which records were pulled from WDBX, their source metadata, and the weighted backtrace that connected them to the query.",
					"Policy checks — every control-plane gate that was evaluated, with the inputs it saw and the pass/abstain/deny result.",
					"Model decisions — the profile that was selected (Abbey, Aviva, or Abi), the routing weights that selected it, and the completion that came back.",
					"Tool calls — the connector invoked (OpenAI, Anthropic, Discord, Twilio, HTTP), the validated arguments, and the response envelope.",
					"Operator interventions — any human approval, override, or escalation that changed the run, with who and when."
				]
			},
			{
				heading: "Why provenance has to be weighted",
				paragraphs: ["Flat citation lists tell you which sources were available, not which ones carried the answer. WDBX keeps context as weighted directed paths, so a trace can show not only that a record was retrieved but how strongly it influenced the result and where confidence dropped along the chain. That distinction is what turns an incident review from speculation into reconstruction.", "It also makes rollback meaningful. If a retrieval path is later found to be poisoned or stale, you can walk the graph forward to every downstream decision that depended on it instead of guessing at blast radius."]
			},
			{
				heading: "Designing for the review you will eventually run",
				paragraphs: ["The practical discipline is to treat the post-incident review as a first-class consumer of your architecture from day one. If you cannot answer \"why did the agent take its last move\" from durable artifacts alone — without re-prompting the model and hoping for the same output — the trace is incomplete.", "Our operating principle here is blunt: no autonomous write action without an observable policy boundary, and no retrieval claim without a traceable source or confidence signal. Everything in the Trace Layer exists to keep those two promises auditable months after the run."]
			}
		]
	},
	{
		slug: "production-ready-agent-metrics",
		tag: "ENGINEERING",
		title: "What We Measure Before Calling an Agent Production-Ready",
		excerpt: "Latency and accuracy are not enough. We track tool-boundary violations, source coverage, rollback paths, abstention quality, and human-review burden.",
		date: "May 18, 2026",
		readTime: "9 min read",
		author: "MLAI Safety Engineering",
		body: [
			{ paragraphs: ["Latency and accuracy are the metrics that demo well, which is exactly why they are insufficient as a release gate. An agent can be fast and frequently correct while still being unsafe to deploy, because the failure modes that matter in production are the ones that do not show up in a happy-path benchmark.", "The Evaluation Mesh exists to turn AI quality into a release gate instead of an after-the-fact dashboard. Before we call an agent production-ready, it has to clear regression scenarios across dimensions that a single accuracy score hides."] },
			{
				heading: "The dimensions we gate on",
				paragraphs: ["Each of these runs as a repeatable scenario suite, not a one-time audit. A change to a prompt, a tool permission, or a retrieval index re-runs the full mesh."],
				list: [
					"Tool-boundary violations — did the agent attempt an action outside its granted permissions, even if the attempt was blocked?",
					"Source coverage — what fraction of factual claims trace back to a retrieved record versus model memory?",
					"Rollback paths — for every write action, can we reconstruct and reverse it from trace artifacts alone?",
					"Abstention quality — when the agent should have said \"I don't know\" or escalated, did it? Confident wrong answers are scored worse than honest abstentions.",
					"Prompt-injection resilience — does adversarial content in retrieved documents or user input change the agent's permissions or goals?",
					"Human-review burden — how many runs require an operator, and is that number trending toward fatigue?"
				]
			},
			{
				heading: "Abstention is a feature, not a failure",
				paragraphs: ["Most evaluation harnesses penalize a model for not answering. We invert that for high-stakes workflows. An agent that abstains and escalates when retrieval confidence is low is behaving correctly; an agent that fabricates a plausible answer under the same conditions has failed the gate, regardless of how often it is right elsewhere.", "This is why the persona split matters operationally. Abbey's analytical, safety-oriented review can flag a low-confidence retrieval before Abi's action-oriented execution profile ever touches production data."]
			},
			{
				heading: "Review burden as a leading indicator",
				paragraphs: ["The metric teams most often forget is the one that predicts whether their controls will survive contact with reality: human-review burden. If every run needs a human, the system does not scale. If no run needs a human, the gates are probably theater. We track the ratio over time and treat a sharp move in either direction as a signal that the control plane needs retuning, not just the model."]
			}
		]
	},
	{
		slug: "vector-search-to-backtrace-graphs",
		tag: "RESEARCH",
		title: "From Vector Search to Weighted Backtrace Graphs",
		excerpt: "Why retrieval infrastructure needs relationship-aware context and why ranking alone is not sufficient for high-stakes answer generation.",
		date: "May 12, 2026",
		readTime: "12 min read",
		author: "MLAI Research",
		body: [
			{ paragraphs: ["Vector search answers a narrow question well: which records are nearest to this query in embedding space? For a lot of retrieval-augmented generation, that is enough. For high-stakes answer generation — where a wrong citation is a liability, not an inconvenience — nearest-neighbor ranking alone leaves too much unsaid.", "WDBX, the Weighted Directed Backtrace eXecution engine, is our answer to what ranking leaves out. It keeps retrieval context as weighted paths so a system can inspect why a result was produced, which sources were used, and where confidence dropped."] },
			{
				heading: "What ranking cannot tell you",
				paragraphs: ["A ranked list gives you the top-k records and a similarity score. It does not tell you whether two of those records contradict each other, whether the third was only retrieved because it shares boilerplate with the query, or whether the answer actually depended on the record ranked seventh. In an audit, \"the model saw these ten documents\" is not the same claim as \"the answer rests on these two.\"", "Backtrace graphs make the dependency explicit. Each retrieved record is a node; edges carry weights that reflect how strongly a record contributed to the generated answer, and the graph preserves the path from query to claim."]
			},
			{
				heading: "Confidence as a graph property",
				paragraphs: ["Once retrieval is a weighted graph rather than a flat list, confidence stops being a single scalar bolted onto the response. It becomes a property you can read off the structure: source coverage, graph distance from query to supporting evidence, and contradiction between paths all become measurable signals. Combining them gives operators a confidence band they can actually reason about instead of a number with no provenance."]
			},
			{
				heading: "Durable, inspectable, portable",
				paragraphs: ["WDBX persists these structures with JSONL snapshots and integrity checks, so the graph that produced an answer last quarter can be reopened and walked today. The store exposes key-value, vector (cosine search with a SIMD path), and block/spatial surfaces, and disabled builds fail closed with explicit errors rather than silently degrading.", "The research bet is simple: as agents take on higher-stakes work, the retrieval layer has to carry relationships, not just neighbors. Ranking tells you what was close. Backtrace tells you what was responsible."]
			}
		]
	},
	{
		slug: "separate-planning-review-execution",
		tag: "SAFETY",
		title: "The Case for Separate Planning, Review, and Execution Agents",
		excerpt: "Role separation lets teams encode checks and balances into an AI workflow instead of relying on a single agent to police itself.",
		date: "May 8, 2026",
		readTime: "8 min read",
		author: "MLAI Safety Engineering",
		body: [
			{ paragraphs: ["Asking one agent to plan an action, judge whether the action is safe, and then execute it is asking it to be its own auditor. That works until it doesn't, and when it doesn't, there is no separation of duties to catch the mistake. The Abbey–Aviva–Abi framework exists to put checks and balances inside the workflow rather than hoping a single model polices itself."] },
			{
				heading: "Three roles, three temperaments",
				paragraphs: ["The framework separates creative planning, safety review, and technical execution into distinct profiles, each tuned for its job:"],
				list: [
					"Aviva — the expert. Direct, creative, and exploratory, used for generating plans and alternative approaches.",
					"Abbey — the polymath. Analytical and supportive, used for structured explanation and safety-oriented review of what Aviva proposes.",
					"Abi — the moderator. Concise and action-oriented, context- and policy-aware, used to route and to execute once a plan clears review."
				]
			},
			{
				heading: "Why separation makes permissions tractable",
				paragraphs: ["When one agent does everything, its permission set is the union of every capability it might ever need — a large, hard-to-reason-about attack surface. Splitting the roles lets the control plane scope permissions per role: the planning profile can read broadly but cannot write, the review profile can block but cannot execute, and the execution profile acts only on plans that already passed a gate.", "Routing between profiles is deterministic and weight-based rather than a hidden model call, so the choice of role is itself an inspectable trace event. An operator can see not just what the system did, but which profile decided to do it and why."]
			},
			{
				heading: "Checks and balances as code",
				paragraphs: ["The point of role separation is not ceremony — it is that intervention points become explicit. There is a defined moment where review happens before execution, a defined boundary an action cannot cross without approval, and a defined place an operator can step in. \"No autonomous write action without an observable policy boundary\" is much easier to keep when the boundary is a different agent with a different mandate."]
			}
		]
	},
	{
		slug: "calm-control-surfaces",
		tag: "PRODUCT",
		title: "Making AI Control Surfaces Feel Calm Under Pressure",
		excerpt: "Interface details that prevent overload: progressive disclosure, confidence bands, decision diffs, and emergency stop affordances.",
		date: "April 29, 2026",
		readTime: "6 min read",
		author: "MLAI Product",
		body: [
			{ paragraphs: ["An AI control surface is judged on its worst day, not its average one. When a workflow is misbehaving and an operator has thirty seconds to understand and intervene, every design decision that optimized for looking impressive instead of being legible becomes a liability. Calm under pressure is a product requirement, not an aesthetic."] },
			{
				heading: "Progressive disclosure over dashboards",
				paragraphs: ["A wall of metrics is the opposite of clarity. The default view should answer one question — is anything wrong right now — and let the operator drill into traces, retrieval paths, and policy decisions only when they need to. The detail is always there; it is just not all shouting at once."]
			},
			{
				heading: "Confidence bands, decision diffs, and a real stop button",
				paragraphs: ["Three affordances do most of the work of keeping operators in control:"],
				list: [
					"Confidence bands — surface the retrieval confidence and source coverage behind a decision so the operator can calibrate trust at a glance instead of treating every output as equally certain.",
					"Decision diffs — show what changed between the proposed action and the last approved state, so review is a focused comparison rather than a re-read of everything.",
					"Emergency stop — a visible, always-reachable affordance to halt autonomous execution. If stopping the system requires hunting through menus, it is not a control surface."
				]
			},
			{
				heading: "The goal is a human who stays in control",
				paragraphs: ["Human-centered control means escalation, review, and override flows stay visible so subject-matter experts remain in charge of critical outcomes. A calm interface is how that principle survives contact with a real incident. The measure of success is not how little the operator has to do on a good day — it is how confidently they can act on a bad one."]
			}
		]
	},
	{
		slug: "incident-reviews-from-ai-logs",
		tag: "OPERATIONS",
		title: "What Incident Reviews Need From AI Logs",
		excerpt: "How to structure traces so teams can reconstruct context, model output, policy decisions, tool calls, and human overrides after a production event.",
		date: "April 18, 2026",
		readTime: "10 min read",
		author: "MLAI Operations",
		body: [
			{ paragraphs: ["A good incident review reconstructs what happened from durable evidence. A bad one reconstructs it from memory and Slack scrollback. The difference is decided long before the incident, in how the system structures its logs — and most AI systems log for debugging, not for review."] },
			{
				heading: "Logs vs. traces",
				paragraphs: ["Conventional application logs are a stream of strings written for whoever is tailing them at the time. A trace is a structured, causal record written for whoever opens it months later. For AI workflows the review needs the second kind: events that connect query to retrieval to decision to action to outcome, each with enough context to stand alone.", "In practice an incident review needs to answer five questions from artifacts alone, with no re-running of the model: what context was retrieved, what the model produced, which policy decisions were evaluated, which tools were called, and where a human overrode the system."]
			},
			{
				heading: "Structure that survives the handoff",
				paragraphs: ["The reviewer is rarely the person who built the workflow. That means the trace has to carry its own context: source metadata on retrieved records, the routing weights behind a profile selection, the inputs a policy gate evaluated, and the identity and timestamp on every human intervention. A trace event that only makes sense to its author is a trace event that fails the review."]
			},
			{
				heading: "Private does not mean unaudited",
				paragraphs: ["Teams running offline or in a VPC sometimes assume that audit is something you trade away for privacy. It is the opposite. Local audit trails, release gates, and repeatable evals are exactly what make a private deployment defensible. The trace stays inside your boundary; its rigor does not have to."]
			}
		]
	},
	{
		slug: "private-ai-is-not-invisible-ai",
		tag: "DEPLOYMENT",
		title: "Private AI Does Not Mean Invisible AI",
		excerpt: "Offline and VPC deployments still need measurable controls: local audit trails, release gates, repeatable evals, and operator-visible confidence signals.",
		date: "April 11, 2026",
		readTime: "8 min read",
		author: "MLAI Engineering",
		body: [
			{ paragraphs: ["There is a tempting shortcut in private AI: if the data never leaves the building, surely the controls matter less. The opposite is true. A deployment that cannot send telemetry to a vendor dashboard is a deployment that has to be observable on its own terms, because no one else is watching it for you."] },
			{
				heading: "The same controls, inside your boundary",
				paragraphs: ["The Private Runtime packages LLM orchestration, retrieval, audit logs, and controls for cloud, VPC, on-premise, and offline-first deployments. The design intent is that going private subtracts nothing from observability:"],
				list: [
					"Local audit trails — traces persist inside the boundary with integrity checks, not shipped to an external service.",
					"Release gates — the evaluation mesh runs against your own scenarios before changes reach production, online or air-gapped.",
					"Repeatable evals — regression suites you can run on demand without a network round-trip.",
					"Operator-visible confidence — the same retrieval confidence and source-coverage signals an operator would see in a hosted deployment."
				]
			},
			{
				heading: "Why teams choose this path",
				paragraphs: ["Private deployment is shaped for environments where data residency, network isolation, or customer policy make unmanaged infrastructure a non-starter: regulated software teams, research organizations with sensitive corpora, security and compliance teams evaluating tool-using agents, and infrastructure teams running near the edge.", "For those teams, \"private\" and \"auditable\" are not in tension — they are the same requirement seen from two sides. The runtime is built so you never have to choose between keeping your data and seeing what your AI did with it."]
			}
		]
	},
	{
		slug: "neural-backtracking",
		tag: "FIELD NOTE",
		title: "Neural Backtracking: What a Block Chain Buys an AI Memory",
		excerpt: "Hallucination debugging is archaeology. WDBX chains every interaction block to its parent so you can walk back to the exact moment a model drifted — and prove nobody edited the record.",
		date: "February 18, 2026",
		readTime: "7 min read",
		author: "MLAI Research · WDBX Core",
		body: [
			{ paragraphs: ["When a long-running agent goes off the rails, the question is never whether it drifted — it's when, and from what. Stateless logging can't answer that. Logs get rotated, reordered, and quietly edited. If the model's memory is the product, the integrity of that memory is the product too.", "WDBX borrows exactly one idea from blockchains and discards the rest: every data block's header carries a cryptographic hash of the previous block's header. No proof-of-work, no consensus theater, no tokens. Just a strictly ordered, tamper-evident timeline of what the system knew and said."] },
			{
				heading: "Drift is a geometric event",
				paragraphs: ["Each block stores the interaction's embedding alongside its content. That means drift detection becomes vector math: walk the chain backwards and measure the semantic distance between each block and the conversation's anchor context. The divergence point shows up as a discontinuity — the block where cosine similarity to ground truth falls off a cliff."],
				code: [{
					lang: "zig",
					file: "database/backtrack.zig",
					code: `// walk the chain until similarity to the anchor recovers
pub fn findDivergence(chain: *const Chain, anchor: Vec) ?BlockRef {
    var it = chain.iterateBack();
    var prev_sim: f32 = 1.0;
    while (it.next()) |block| {
        const sim = cosine(block.embedding, anchor);
        if (prev_sim - sim > DRIFT_THRESHOLD) return block.ref;
        prev_sim = sim;
    }
    return null;
}`
				}]
			},
			{ paragraphs: ["Once you have the divergence block, you have options a stateless system doesn't: rewind the context window to the last good block, regenerate from there, or surface the exact exchange to a human reviewer. We call the whole capability neural backtracking, and it only works because the chain guarantees order."] },
			{
				heading: "Audit is the same feature wearing a suit",
				paragraphs: [
					"In regulated deployments the chain stops being a debugging tool and becomes the compliance story. No administrator can retroactively alter a prompt or a response without breaking every downstream hash. The decision trail is mathematically self-verifying — which is the difference between “we log everything” and “we can prove the log.”",
					"Immutability raises an obvious product question: what about the right to erasure? The honest answer is that retention and deletion semantics must be designed alongside the chain, then verified in source and security review before the site treats them as shipped compliance behavior. Design rule: do not promote privacy mechanics as guarantees until the implementation and threat model are linked.",
					"The result is a memory layer where forgetting is a key ceremony and lying is detectable. That's a stronger foundation for agents than any amount of log discipline."
				]
			}
		]
	},
	{
		slug: "zig-016-migration",
		tag: "ENGINEERING",
		title: "Surviving Writergate: Migrating ABI to Zig 0.16",
		excerpt: "Zig 0.16 rebuilt std.io around vtable-based Reader and Writer interfaces. Ninety-five files later, here's what the migration actually looked like — and the patterns we standardized on.",
		date: "January 8, 2026",
		readTime: "6 min read",
		author: "MLAI Runtime Engineering",
		body: [
			{ paragraphs: ["Zig 0.16's I/O overhaul — the community calls it Writergate — replaced the old generic reader/writer plumbing with explicit vtable-based std.io.Reader and std.io.Writer interfaces. For a codebase like ABI, where the database, the network layer, and the GPU pipeline all stream bytes, that change touched everything: 95 files modified before the build went green again."] },
			{
				heading: "What actually broke",
				paragraphs: [],
				list: [
					"Every anytype writer parameter — the old duck-typing pattern — needed an explicit interface type.",
					"Buffering moved into the caller's hands; the new interfaces make the buffer visible instead of hiding it behind generics.",
					"Error sets narrowed. Code that relied on inferred error unions through generic writers had to name its failures.",
					"Container init churn landed at the same time: we standardized on ArrayListUnmanaged.empty and explicit allocator passing at every call site."
				],
				code: [{
					lang: "zig",
					file: "before → after",
					code: `// 0.15 — generic duck typing
fn serialize(self: *Block, writer: anytype) !void {
    try writer.writeAll(self.header());
}

// 0.16 — explicit vtable interface
fn serialize(self: *Block, writer: *std.io.Writer) !void {
    try writer.writeAll(self.header());
}`
				}]
			},
			{ paragraphs: ["The migration was mechanical but not mindless. The new interfaces are better — buffer ownership is explicit, error sets are honest, and the vtable indirection costs less than the comptime bloat the old pattern generated across 95 instantiation sites."] },
			{
				heading: "Pin everything",
				paragraphs: ["The operational lesson: dev-channel Zig moves fast enough that unpinned CI is a time bomb. We pin the exact toolchain in build.zig.zon, mirror the pin in CI, and gate merges on a version-check script that fails loudly when the local compiler drifts from the pin. The same discipline now applies to 0.17.0-dev as that migration begins."],
				code: [{
					lang: "bash",
					file: "ci — version gate",
					code: `# fail fast when the toolchain drifts from the pin
zig version | grep -q "0.16.0-dev" || {
  echo "toolchain drift: expected pinned 0.16.0-dev"; exit 1;
}
./build.sh check`
				}]
			},
			{ paragraphs: ["Ninety-five files sounds like a war story, but the honest summary is gentler: Zig's churn is loud, shallow, and finite. The language keeps trading short-term breakage for long-term explicitness — and for a database that promises deterministic latency, explicitness is the whole brand."] }
		]
	},
	{
		slug: "why-zig",
		tag: "FIELD NOTE",
		title: "Why WDBX Is Written in Zig",
		excerpt: "Garbage collection pauses are invisible in the mean and fatal in the tail. WDBX is Zig because a real-time vector database is a p99 product, not a p50 product.",
		date: "November 30, 2025",
		readTime: "6 min read",
		author: "MLAI Runtime Engineering",
		body: [
			{ paragraphs: ["Every database benchmark leads with average latency, and average latency is the least interesting number in the file. Users don't experience the mean — they experience the worst request of their session. A vector store backing real-time inference is a p99 product, and the p99 is where garbage collectors live."] },
			{
				heading: "The case against the GC",
				paragraphs: ["A GC pause is a latency spike you didn't schedule, can't fully predict, and pay at the worst time — under memory pressure, which is to say under load. Java and Go runtimes have spent decades engineering the pause down, and the engineering is genuinely impressive. But small-and-unpredictable still loses to zero-and-deterministic when the SLA is single-digit milliseconds.", "Zig gives us manual, deterministic memory management with allocator discipline the language actually enforces — every allocation site names its allocator, every structure owns its lifetime. The p99 stays glued to the mean because nothing runs that we didn't write."]
			},
			{
				heading: "Comptime is the quiet superpower",
				paragraphs: ["Zig executes code at compile time, which for a vector engine means hot paths can be specialized before they ship. Distance kernels, lookup tables, and SIMD choices should be tied to the build target and verified in source rather than implied by marketing copy."],
				code: [{
					lang: "zig",
					file: "database/kernel.zig",
					code: `// dimension-specialized at compile time — no runtime branching
pub fn CosineKernel(comptime dim: usize) type {
    return struct {
        pub fn dot(a: *const [dim]f32, b: *const [dim]f32) f32 {
            var acc: @Vector(8, f32) = @splat(0);
            comptime var i: usize = 0;
            inline while (i < dim) : (i += 8) {
                const va: @Vector(8, f32) = a[i..][0..8].*;
                const vb: @Vector(8, f32) = b[i..][0..8].*;
                acc += va * vb;
            }
            return @reduce(.Add, acc);
        }
    };
}`
				}]
			},
			{ paragraphs: [
				"And because Zig speaks C natively, the boundary to BLAS, Metal, and CUDA kernels costs nothing. We get the ecosystem without the FFI tax.",
				"The honest tradeoff: dev-channel Zig churns, and we pay a migration tax roughly twice a year. We pay it gladly — the alternative is paying a GC tax on every request, forever.",
				"Language choices are bets about what a system will be punished for. WDBX will be punished for tail latency. So we chose the language with nothing in the tail."
			] }
		]
	}
];
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/team-BCVaBCod.js
var team = [{
	name: "Donald Filimon",
	role: "Founder & Systems Architect",
	slug: "donald-filimon",
	location: "United States",
	image: "https://avatars.githubusercontent.com/u/64335640?v=4",
	tagline: "Building privacy-first AI infrastructure — durable memory, traceable retrieval, and bounded autonomy — close to the metal across Zig, Rust, and Swift.",
	bio: "Builds privacy-first AI infrastructure, developer tools, and high-performance systems across Zig, Rust, Swift, TypeScript, and GPU-oriented runtimes. Leads WDBX retrieval, the Abbey–Aviva–Abi orchestration framework, and the ABI runtime.",
	socials: {
		github: "donaldfilimon",
		x: "donaldfilimonx",
		web: "donaldfilimon.com"
	},
	focusAreas: [
		{
			title: "Privacy-first AI infrastructure",
			description: "Architectures shaped for on-premise, VPC, hybrid, and edge deployment, where data residency and auditability cannot be compromised."
		},
		{
			title: "Vector & memory systems",
			description: "WDBX — durable vector/block stores for traceable retrieval and long-lived agent memory, implemented across several languages."
		},
		{
			title: "Polyglot systems engineering",
			description: "Working close to the metal across Zig, Rust, Swift, and TypeScript: databases, GPU-oriented runtimes, CLIs, and developer tooling."
		},
		{
			title: "Compiler & low-level optimization",
			description: "AI-driven compiler optimization and MLIR/Zig systems work — tuning the layers beneath the model, not just the model itself."
		},
		{
			title: "Agent orchestration & safety",
			description: "The ABI runtime and the Abbey–Aviva–Abi persona system for bounded, observable autonomy with explicit operator control."
		}
	],
	projects: [
		{
			name: "abi",
			description: "An AI agent runtime paired with the WDBX substrate — high-performance local orchestration in nightly Rust, with GPU capability reporting and an MCP server. The Zig tree has been removed.",
			url: "https://github.com/donaldfilimon/abi",
			lang: "Rust"
		},
		{
			name: "WDBX",
			description: "A durable vector/block memory store for traceable retrieval and agent memory, with implementations spanning Zig, Rust, Python, and TypeScript.",
			url: "https://github.com/donaldfilimon/wdbx_python",
			lang: "Rust · Python"
		},
		{
			name: "gama",
			description: "A Swift + MLX framework for on-device language-model inference on Apple Silicon, including a self-learning agent.",
			url: "https://github.com/donaldfilimon/gama",
			lang: "Swift"
		},
		{
			name: "Nyon",
			description: "A voxel 3D world experiment exploring a novel hexa-gravity system and creator-first game development.",
			url: "https://github.com/donaldfilimon/nyon-game",
			lang: "Zig"
		}
	],
	body: [
		{
			heading: "Building close to the metal",
			paragraphs: ["Donald is a polyglot systems engineer who works deliberately low in the stack. His public projects span Zig, Rust, Swift, TypeScript, and Python — databases, GPU-oriented runtimes, agent frameworks, and the tooling that holds them together — because the guarantees Quesar cares about (latency, provenance, data residency) are won or lost at that level.", "That range is intentional, not scattered. Each language is chosen for where it pays off: Zig for the performance-critical core of the ABI runtime and WDBX, Rust for safe systems surfaces, Swift and MLX for on-device inference on Apple Silicon, and TypeScript for the operator-facing layers. The same instinct runs down to the compiler itself — projects like Cellstrap extend Zig toward MLIR, in line with his stated focus on AI-driven compiler optimization."]
		},
		{
			heading: "Memory you can trace",
			paragraphs: ["The throughline across his work is WDBX — a durable vector and block memory store designed so retrieval is traceable rather than opaque. The ABI runtime plans queries and assembles context packs on top of it, and the same store backs the long-lived memory that agents reason over.", "The design commitment is simple to state and hard to honor: no retrieval claim without a traceable source or confidence signal. That principle is what makes the infrastructure suitable for private, audited deployments instead of demos."]
		},
		{
			heading: "Autonomy with a boundary",
			paragraphs: ["On top of retrieval, Quesar's orchestration layer adds the Abbey–Aviva–Abi persona system — Abbey the empathetic polymath, Aviva the direct expert, and Abi the adaptive router — operating under one motto: \"Care first. Clarity always. Competence throughout.\"", "It is built around bounded execution and explicit approvals: no autonomous write action without an observable policy boundary, and escalation, review, and override flows kept visible so the people responsible stay in control. Safety before scale is the founding constraint, not a later addition."]
		}
	]
}];
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/product-journeys-CSMAWIi4.js
var productJourneys = [
	{
		slug: "abi",
		name: "ABI",
		purpose: "Route assistant requests and assemble inspectable context.",
		availability: "Local developer framework",
		prerequisites: "A source checkout, nightly Rust and the sibling workspaces required by the ABI README.",
		limitation: "Local deterministic routing and template completion do not establish foundation-model quality. External providers need separate configuration.",
		setupHref: "/docs/getting-started",
		researchSlugs: [
			"ai-overview",
			"mcp-overview",
			"sea-overview"
		]
	},
	{
		slug: "abbey",
		name: "Abbey",
		purpose: "Work with documents in the local Abbey workspace and explore its assistant context.",
		availability: "Local document workspace",
		prerequisites: "Node 24, Bun 1.4, uv with Python 3.11–3.13, Java 21+ and LibreOffice as documented by the website-app setup; a local model is optional.",
		limitation: "Assistant behavior depends on the selected backend. The public website does not provision an Abbey session or a shared product account.",
		setupHref: "/workspace",
		researchSlugs: ["ai-overview", "tui-overview"]
	},
	{
		slug: "wdbx",
		name: "WDBX",
		purpose: "Store durable records and retrieve vectors with inspectable provenance.",
		availability: "Implemented Rust components for local integration",
		prerequisites: "Read the WDBX source README and prepare its Rust workspace before integrating persistence or retrieval.",
		limitation: "Storage integrity does not prove the truth of stored statements. The reference cluster protocol does not establish production multi-host operation or sharding.",
		setupHref: "/wdbx",
		researchSlugs: [
			"wdbx-overview",
			"wdbx-weighted-backtrace-memory-store",
			"wdbx-graph-weights-traceable-retrieval",
			"sea-overview"
		]
	},
	{
		slug: "quasar",
		name: "Quasar",
		purpose: "Generate a Next.js website and preview it on your own machine.",
		availability: "Local v1 website builder",
		prerequisites: "Bun 1.4, the Quasar workspace, Anthropic credentials and a separately running local service plus Expo app.",
		limitation: "Generation requires an available provider. Hosting, deploy adapters and authentication are outside the local v1 scope; the service listens on the LAN without authentication.",
		setupHref: "/quesar",
		researchSlugs: ["mcp-overview"]
	}
];
var startJourneys = [
	{
		id: "research",
		title: "Explore the research",
		description: "Read practical summaries, then inspect citations, attachments and implementation limits.",
		availability: "Public reading",
		prerequisites: "A browser; no account or local setup required.",
		href: "/research",
		label: "Browse research"
	},
	{
		id: "abbey",
		title: "Run Abbey locally",
		description: productJourneys[1].purpose,
		availability: productJourneys[1].availability,
		prerequisites: productJourneys[1].prerequisites,
		href: "/workspace",
		label: "Open the workspace"
	},
	{
		id: "mobile",
		title: "Explore the mobile companion",
		description: "Run the Expo companion from source. Native CloudKit and the encrypted-local fallback are distinct paths; signed-device acceptance remains separate from a web export.",
		availability: "Source-based Expo companion",
		prerequisites: "Bun 1.4 and Expo tooling; native platform tooling for device builds. CloudKit requires an appropriately signed Apple build.",
		href: "/mobile",
		label: "Open the web vault"
	},
	{
		id: "quasar",
		title: "Build a site with Quasar",
		description: productJourneys[3].purpose + " " + productJourneys[3].limitation,
		availability: productJourneys[3].availability,
		prerequisites: productJourneys[3].prerequisites,
		href: "/quesar",
		label: "Open Quasar studio"
	}
];
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/products-CIhNDj9V.js
var narratives = [{
	slug: "abi",
	kicker: "Multi-Persona AI Framework",
	name: "ABI Framework",
	intro: "Local AI orchestration with inspectable memory. Instead of one brain switching contexts, ABI routes each interaction through specialized personas — Abbey, Aviva, Abi — and says what the ledger can prove.",
	accent: "aviva",
	sections: [
		{
			eyebrow: "Routing",
			title: "The mathematics of orchestration",
			paragraphs: [],
			equations: [{
				tex: "P(p \\mid I, C) = \\mathrm{softmax}\\big( f_\\theta(I, C) \\big)",
				note: "Abi classifies intent and sentiment over input I and context C, scoring each persona."
			}, {
				tex: "R_{\\text{final}} = \\alpha \\cdot R_{\\text{Abbey}} + (1 - \\alpha) \\cdot R_{\\text{Aviva}}",
				note: "Routing isn't binary — Abi blends. High α leans empathetic and scaffolded; low α leans concise and unfiltered; in between, a factual core is wrapped in an empathetic voice."
			}],
			blendTable: [
				{
					range: "α > 0.8",
					meaning: "Pure Abbey — empathetic, scaffolded",
					accent: "abbey"
				},
				{
					range: "0.2 ≤ α ≤ 0.8",
					meaning: "Blend — Aviva's facts, Abbey's voice, mixed by Abi",
					accent: "abi"
				},
				{
					range: "α < 0.2",
					meaning: "Pure Aviva — concise, unfiltered",
					accent: "aviva"
				}
			]
		},
		{
			eyebrow: "Try it",
			title: "Watch Abi route in real time",
			sub: "Type a message — an illustrative keyword-sentiment heuristic scores the blend coefficient α. The inspected local router uses deterministic rules; this demo is illustrative, not evidence of a learned classifier.",
			paragraphs: [],
			demo: "persona-router"
		},
		{
			eyebrow: "Neural mechanism",
			title: "Steering attention, not swapping weights",
			paragraphs: [],
			equations: [{
				tex: "\\mathrm{Attention}(Q, K, V) = \\mathrm{softmax}\\!\\left( \\frac{QK^\\top}{\\sqrt{d_k}} \\right) V",
				note: "Standard multi-head attention — the shared engine."
			}, {
				tex: "Q' = Q + z_{\\text{persona}}",
				note: "A persona-embedding token shifts the query Q — rotating it toward empathetic keys (Abbey) or factual keys (Aviva). One model, many voices, no reload cost. This is the design mechanism; per-persona quality is evaluated, not assumed."
			}]
		},
		{
			eyebrow: "The trifecta",
			title: "Three specialized minds",
			paragraphs: [],
			pillars: [
				{
					title: "Abbey — Empathic Polymath",
					description: "High-EQ tutor and partner, tuned toward empathetic dialogue and scaffolded teaching.",
					eq: "L = L_{NLL} + \\lambda \\cdot L_{empathy} + L_{technical}",
					accent: "abbey"
				},
				{
					title: "Aviva — Unfiltered Expert",
					description: "High-IQ, low-latency by design. Strips hedges and preambles; generating fewer tokens is the efficiency lever.",
					eq: "L = L_{factual} + \\gamma \\cdot L_{directness}",
					accent: "aviva"
				},
				{
					title: "Abi — Adaptive Moderator",
					description: "The gateway: classifies intent, moderates content, routes and blends. The system's regulatory firewall.",
					eq: "L = L_{moderation} + \\delta \\cdot L_{sentiment}",
					accent: "abi"
				}
			]
		},
		{
			eyebrow: "Safety",
			title: "Bias, quantified",
			paragraphs: [],
			equations: [{
				tex: "\\mathrm{Score}_{bias} = \\frac{1}{n} \\sum_{i=1}^{n} |B_i|",
				note: "Abi measures bias across n protected attributes. Exceed the threshold and the response is rejected, regenerated, or post-filtered — a gate in the response path, not an after-the-fact report."
			}]
		},
		{
			eyebrow: "Acceleration",
			title: "Hardware backends",
			sub: "The inspected Rust implementation provides CPU vector operations and optional macOS Metal DOT dispatch. CUDA and Vulkan dispatch are not linked in this implementation; device acceleration needs separate validation.",
			paragraphs: [],
			chips: ["CPU vector operations", "Optional macOS Metal DOT"]
		}
	]
}, {
	slug: "abbey",
	kicker: "Intelligence Without Limits",
	name: "Abbey",
	intro: "Intelligence Without Limits — with a claims ledger. Abbey is your companion for routing, memory, and calm ops help: personas that say what they know and what they don't. No AGI claims, no unverified benchmarks, no Quesar features dressed up as the bot.",
	accent: "abbey",
	sections: [
		{
			eyebrow: "Specialty",
			title: "Human-centric qualities in technical discourse",
			paragraphs: [],
			pillars: [
				{
					title: "Persona routing",
					description: "Routes each turn through Abbey, Aviva, or Abi with an inspectable reason — so the voice matches the job and the handoff is a trace event, not a guess.",
					accent: "abbey"
				},
				{
					title: "Durable memory",
					description: "Remembers facts and channel context with permission, on namespace-scoped stores you can inspect — rapport without opaque black-box recall.",
					accent: "abbey"
				},
				{
					title: "Ops with guardrails",
					description: "Calm ops help that names uncertainty, defers when policy says so, and never claims unlimited capability, AGI, unverified benchmarks, or NYX/Quesar as bot features.",
					accent: "abbey"
				}
			]
		},
		{
			eyebrow: "The Abbey cognitive loop",
			title: "How empathy is operationalized",
			paragraphs: [],
			steps: [
				{
					n: "01",
					title: "Sentiment & frustration detection",
					description: "Input from Abi is evaluated for emotional state, prior knowledge, and subject complexity. A high frustration score triggers the Scaffolding Protocol."
				},
				{
					n: "02",
					title: "The Scaffolding Protocol",
					description: "A tiered explanation: a high-level metaphor first → the precise technical answer → suggested pathways for deeper exploration."
				},
				{
					n: "03",
					title: "Metaphorical Mapping Engine",
					description: "Finds the most conceptually parallel non-technical domain (e.g. music theory for distributed systems). Measured by conceptual isomorphism — structural similarity, not factual overlap."
				},
				{
					n: "04",
					title: "Dynamic visual aid",
					description: "The mapping becomes a generative-image prompt, producing a visual anchor that encapsulates the core concept."
				}
			]
		},
		{
			eyebrow: "Operational pillars",
			title: "What sets Abbey apart",
			paragraphs: [],
			pillars: [
				{
					title: "Confident & theoretical",
					description: "Encouraged to form and share well-reasoned opinions and engage 'what-if' ideas — human-like, not merely a fact reporter.",
					accent: "abbey"
				},
				{
					title: "Unwavering technical rigor",
					description: "Meticulous code analysis and completion with validation in the loop, so answers are checked rather than assumed.",
					accent: "abbey"
				},
				{
					title: "Perpetual student",
					description: "Designed to research live sources when a query exceeds internal knowledge, and to validate sources before responding.",
					accent: "abbey"
				},
				{
					title: "Deep personalization",
					description: "Recalls and synthesizes prior conversations (with permission) to build genuine, long-term rapport.",
					accent: "abbey"
				}
			]
		},
		{
			eyebrow: "Foundation",
			title: "Backed by WDBX",
			paragraphs: ["Abbey's memory and persona voices ride on WDBX. Per-channel vectors are stored with namespace-scoped isolation, and persona-token injection dynamically shapes the shared core into Abbey, Aviva, or Abi — designed so switching voices carries no reload cost, preserving the responsiveness a real-time partner demands."]
		}
	]
}];
var products = productJourneys.map((product) => ({
	slug: product.slug,
	kicker: product.availability,
	name: product.name,
	intro: product.purpose,
	accent: product.slug === "abbey" ? "abbey" : product.slug === "abi" ? "aviva" : "abi",
	sections: [
		{
			eyebrow: "Availability",
			title: "What you can use today",
			paragraphs: [product.availability, product.limitation]
		},
		{
			eyebrow: "Setup",
			title: "Prepare your environment",
			paragraphs: [product.prerequisites]
		},
		...narratives.find((item) => item.slug === product.slug) ? [{
			eyebrow: "Design context",
			title: "Read the design alongside the evidence",
			paragraphs: ["The following equations, persona descriptions and interactive demonstrations explain design intent. They do not establish trained-model quality, general safety, emotional understanding or implementation beyond the availability stated above. Follow the research links for source-backed status and limitations. The local Abbey document workspace and the ABI persona design are separate integration surfaces."]
		}] : [],
		...narratives.find((item) => item.slug === product.slug)?.sections ?? []
	]
}));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/schemas-CnU1YYoU.js
/** A titled prose card — the shape shared by `about.values` and `about.investorThesis`. */
var CardSchema = object({
	title: string(),
	description: string()
});
/** Key/value rows rendered by `site/SpecList` — configuration facts, never measurements. */
var SpecRowsSchema = array(object({
	k: string(),
	v: string()
}));
/**
* The `site/` **product** accent axis (wdbx cyan · abi violet · abbey emerald).
* Distinct from the persona enum used by `ProductsSchema` below — the product
* "abi" is violet while the persona "Abi" is cyan. See `src/components/site/accent.ts`.
*/
var SiteAccentSchema = _enum([
	"wdbx",
	"abi",
	"abbey"
]);
/** Eyebrow/title/lead copy for a sub-section — kept in data so views hold no content. */
var SectionChromeSchema = object({
	eyebrow: string(),
	title: string(),
	lead: string()
});
var AboutSchema = object({
	values: array(CardSchema),
	operatingPrinciples: array(string()),
	/** Registration-level facts (SpecList rows) — ported from the design handoff's Company page. */
	companyFacts: SpecRowsSchema,
	/** Claim-free positioning cards — ported from the design handoff's Investors page. */
	investorThesis: array(CardSchema)
});
var PlatformSchema = array(object({
	title: string(),
	description: string(),
	detail: string()
}));
var IndustriesSchema = array(string());
var BlogSectionSchema = object({
	heading: string().optional(),
	paragraphs: array(string()).default([]),
	list: array(string()).optional(),
	math: array(string()).optional(),
	code: array(object({
		lang: string().optional(),
		file: string().optional(),
		code: string()
	})).optional()
});
var ChangelogSchema = array(object({
	version: string(),
	date: string(),
	title: string(),
	items: array(object({
		cat: _enum([
			"added",
			"changed",
			"perf",
			"fixed"
		]),
		text: string()
	}))
}));
var ServicesSchema = array(object({
	title: string(),
	description: string(),
	outcomes: array(string())
}));
var ResearchTopicSchema = _enum([
	"ai",
	"wdbx",
	"sea",
	"gpu",
	"mcp",
	"tui"
]);
var ResearchSchema = object({
	tracks: array(object({
		id: ResearchTopicSchema,
		name: string(),
		description: string(),
		application: string(),
		availability: string(),
		limitations: array(string()),
		overviewSlug: string()
	})),
	publications: array(object({
		slug: string(),
		tag: string(),
		title: string(),
		date: string(),
		abstract: string(),
		readTime: string(),
		authors: string().optional(),
		topic: ResearchTopicSchema,
		documentType: _enum([
			"overview",
			"research-note",
			"implementation-guide"
		]),
		practicalSummary: string(),
		status: _enum([
			"Implemented",
			"Experimental",
			"Proposed"
		]),
		statusNote: string(),
		reviewedAt: string().regex(/^\d{4}-\d{2}-\d{2}$/),
		sources: array(object({
			title: string(),
			url: string().url(),
			revision: string().regex(/^[a-f0-9]{40}$/),
			kind: _enum([
				"source",
				"specification",
				"test"
			])
		})).min(1),
		limitations: array(string()).min(1),
		attachments: array(object({
			title: string(),
			url: string(),
			edition: _enum(["current", "historical"]),
			date: string().regex(/^\d{4}-\d{2}-\d{2}$/),
			sha256: string().regex(/^[a-f0-9]{64}$/),
			pages: number().int().positive()
		})),
		body: array(BlogSectionSchema).default([])
	}))
});
var BlogSchema = array(object({
	slug: string(),
	tag: string(),
	title: string(),
	excerpt: string(),
	date: string(),
	readTime: string(),
	author: string().optional(),
	body: array(BlogSectionSchema).default([])
}));
var DocSectionSchema = BlogSectionSchema.extend({ 
/** Vendored Section.note — an aside the blog shape has no home for. */
note: string().optional() });
var DocsSchema = array(object({
	slug: string(),
	title: string(),
	description: string(),
	group: string(),
	body: array(DocSectionSchema).default([]),
	sources: array(object({
		title: string(),
		url: string().url(),
		scope: string()
	})).default([])
}));
/**
* The project directory (`/projects`, `/projects/:slug`) — ported from
* `vendor/mlai-review/lib/content.ts`'s `projects[]`. The vendored `id` is
* renamed `slug` for consistency with every other route in this app.
*
* Two fields deliberately differ from the vendored shape rather than porting
* it as-is (see `.superpowers/sdd/2026-09-07-vendor-reconciliation/task-4-brief.md`
* Rulings A and B):
*  - vendored `source` was a key into a separate `sources` lookup map; here
*    it is the resolved `{ title, url }` inlined directly onto the record.
*  - vendored `docs` was a bare article slug, two of which (`runtime`,
*    `wdbx`) point at subjects this app never ported as standalone docs
*    routes (the existing `/docs` page already covers them). `docsHref` is
*    the fully resolved link — either a `/docs/<slug>` route or a `/docs`
*    anchor (`#runtime` / `#wdbx`) — so the view never has to guess.
*
* `glyph` is a closed enum (not a bare string) so the icon map in the view can
* be a `Record<Project["glyph"], LucideIcon>` — exhaustive at the type level,
* which is stronger than the `never`-checked switch Ruling D described: an
* unrecognized glyph value fails at data-load time (`ProjectsSchema.parse`
* throws) rather than silently rendering nothing.
*/
var ProjectsSchema = array(object({
	slug: string(),
	name: string(),
	kind: string(),
	tagline: string(),
	description: string(),
	scope: array(string()).default([]),
	/** A stated scope limitation. Always non-empty — dropping it would turn a
	*  hedged claim into an unhedged one. */
	limit: string(),
	source: object({
		title: string(),
		url: string().url()
	}),
	docsHref: string(),
	glyph: _enum([
		"layers",
		"database",
		"spark",
		"command"
	])
}));
var TeamSchema = array(object({
	name: string(),
	role: string(),
	bio: string(),
	image: string(),
	slug: string().optional(),
	tagline: string().optional(),
	location: string().optional(),
	socials: object({
		github: string().optional(),
		x: string().optional(),
		web: string().optional()
	}).optional(),
	focusAreas: array(object({
		title: string(),
		description: string()
	})).optional(),
	projects: array(object({
		name: string(),
		description: string(),
		url: string().optional(),
		lang: string().optional()
	})).optional(),
	body: array(BlogSectionSchema).optional()
}));
var StatsSchema = array(object({
	value: string(),
	label: string(),
	detail: string()
}));
var FAQSchema = array(object({
	question: string(),
	answer: string()
}));
var ProductsSchema = array(object({
	slug: string(),
	kicker: string(),
	name: string(),
	intro: string(),
	accent: _enum([
		"abbey",
		"aviva",
		"abi"
	]),
	sections: array(object({
		eyebrow: string(),
		title: string(),
		sub: string().optional(),
		paragraphs: array(string()).default([]),
		equations: array(object({
			tex: string(),
			note: string()
		})).optional(),
		pillars: array(object({
			title: string(),
			description: string(),
			eq: string().optional(),
			accent: _enum([
				"abbey",
				"aviva",
				"abi"
			]).optional()
		})).optional(),
		steps: array(object({
			n: string(),
			title: string(),
			description: string()
		})).optional(),
		blendTable: array(object({
			range: string(),
			meaning: string(),
			accent: _enum([
				"abbey",
				"aviva",
				"abi"
			])
		})).optional(),
		demo: _enum([
			"persona-router",
			"cosine-sim",
			"sharding-latency"
		]).optional(),
		chips: array(string()).optional()
	}))
}));
/** "What we say no to" — refusal callouts on the Services page. */
var RefusalsSchema = array(object({
	label: string(),
	accent: SiteAccentSchema,
	body: string()
}));
/**
* The Home "runtime underneath" block: the L6→L1 layer stack and the
* memory-model spec, each with its section chrome. Architecture facts only —
* every row is corroborated against the mirrored docs in `public/docs/wdbx/`;
* no figures, so no provenance tags.
*/
var RuntimeSchema = object({
	section: SectionChromeSchema,
	layers: array(object({
		/** Tier label, L6 (surface) down to L1 (audit). Rendered as the mono meta line. */
		tier: string(),
		title: string(),
		description: string()
	})),
	memorySection: SectionChromeSchema,
	memoryModel: SpecRowsSchema
});
object({
	about: AboutSchema,
	platform: PlatformSchema,
	industries: IndustriesSchema,
	services: ServicesSchema,
	refusals: RefusalsSchema,
	runtime: RuntimeSchema,
	research: ResearchSchema,
	blog: BlogSchema,
	team: TeamSchema,
	stats: StatsSchema,
	faq: FAQSchema,
	products: ProductsSchema,
	changelog: ChangelogSchema,
	docs: DocsSchema,
	projects: ProjectsSchema
});
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/docs-JZ3tItKV.js
/**
* Provenance sources, ported verbatim from the vendored review site's own
* `sources` lookup map (`vendor/mlai-review/lib/content.ts`). Each document's
* `sources` array below is a set of keys into this map. They are resolved to
* objects before `DocsSchema.parse` so the page can link them, matching how
* `projects.ts` inlines its resolved `source` (Ruling B).
*
* Only the five keys the ported documents actually use are carried. The
* vendored map also held `website` and `wdbx`; no ported document references
* them, and they are not invented here.
*/
var DOC_SOURCES = {
	platform: {
		title: "Quesar platform README",
		url: "https://github.com/donaldfilimon/MLAI-CORPORATION-WWW/blob/f08203c58ce1c1ab5ce69f5790597a72d1bad830/README.md",
		scope: "Repository structure; reviewed at the pinned source revision."
	},
	abi: {
		title: "ABI README",
		url: "https://github.com/donaldfilimon/abi/blob/main/README.md",
		scope: "Source description, tool commands and stated limitations; not a reproduced test run."
	},
	gama: {
		title: "Gama README",
		url: "https://github.com/donaldfilimon/gama/blob/main/README.md",
		scope: "Documented framework architecture, not independent platform acceptance."
	},
	identity: {
		title: "Abbey identity specification",
		url: "https://github.com/donaldfilimon/abi/blob/main/docs/spec/abbey-core-identity.mdx",
		scope: "Further reading linked by the ABI README; not separately audited here."
	},
	claims: {
		title: "External claims audit",
		url: "https://github.com/donaldfilimon/abi/blob/main/docs/contracts/external-claims-audit.mdx",
		scope: "Further reading linked by the ABI README; not separately audited here."
	},
	wdbx: {
		title: "WDBX substrate",
		url: "https://github.com/donaldfilimon/wdbx/blob/main/README.md",
		scope: "Rust substrate README. Configuration facts, not a hosted database or a recall scoreboard."
	}
};
var docs = DocsSchema.parse([
	{
		slug: "getting-started",
		title: "Start with the source.",
		description: "Prepare an ABI checkout and follow its own validation workflow.",
		group: "Start here",
		sources: ["abi"],
		body: [
			{
				heading: "Prepare your checkout",
				paragraphs: ["Begin with the current ABI README and its toolchain and sibling-workspace prerequisites. The project uses nightly Rust and a checked-in Cargo wrapper. Do not treat a copied command as proof that every dependency is present on your machine.", "Clone the public repository into your own development workspace, then finish the upstream setup instructions before building. This page does not execute these commands or provision a runtime."],
				code: [{
					lang: "bash",
					code: "git clone https://github.com/donaldfilimon/abi.git\ncd abi"
				}],
				note: "The repository may require additional sibling-workspace setup. Follow its current README before running the gate."
			},
			{
				heading: "Use the project’s validation gate",
				paragraphs: ["The README identifies tools/check.sh as the primary validation gate and tools/cargo.sh as the wrapper for nightly Cargo. Use the wrapper rather than assuming bare cargo selects the intended toolchain.", "A successful gate is evidence for that checkout and environment. Record the commit, toolchain and actual output when you share results. The commands below come from upstream documentation and were not executed in preparing this page."],
				code: [{
					lang: "bash",
					code: "./tools/cargo.sh --version\n./tools/check.sh\n./tools/cargo.sh build -p abi-cli"
				}]
			},
			{
				heading: "Inspect local behavior",
				paragraphs: ["Once the CLI has built, the README provides local inspection entry points. Start with backend and scheduler information before enabling an external provider. Check what your process actually reports instead of inferring capabilities from a product label.", "Live transports require their own configuration and explicit authorization. This guide does not ask for credentials, activate a cloud backend, or turn a local demonstration into a production service."],
				code: [{
					lang: "bash",
					code: "./target/debug/abi backends\n./target/debug/abi scheduler status"
				}]
			}
		]
	},
	{
		slug: "architecture",
		title: "Different tools. Clear roles.",
		description: "Separate runtime, storage, interface, and application framework responsibilities.",
		group: "Start here",
		sources: [
			"abi",
			"identity",
			"platform",
			"gama"
		],
		body: [
			{
				heading: "Runtime and storage",
				paragraphs: ["ABI’s README describes local orchestration, runtime primitives and WDBX integration. WDBX addresses the storage and retrieval side of that work. Their relationship does not imply that every operation is persistent or that a production cluster is deployed.", "The README explicitly allows persistence to be disabled or unavailable, and requires those conditions to be reported rather than presented as successful writes. A diagram cannot establish operational behavior; the relevant source and tests must do that."]
			},
			{
				heading: "Interface and identity",
				paragraphs: ["Abbey is the primary companion profile described by the source. Aviva is a direct expert mode, while ABI also names the orchestration/governance layer. These identity roles should not be mistaken for separate, independently verified models or repositories.", "The existing Quesar platform also separates product and persona visual identities. For example, an ABI product accent does not define the color of an Abi persona. The distinction matters in content models as well as interface design."]
			},
			{
				heading: "A separate framework track",
				paragraphs: ["Gama’s README describes Swift scenes and a retained render tree driving different interface backends. This is an application-framework track, not a required component of the conceptual Abbey–ABI–WDBX relationship.", "Keep project-specific build instructions and evidence separate. A passing web build does not prove a Swift target works; a local runtime test does not validate a mobile app, a hosted deployment, or a live provider integration."]
			}
		]
	},
	{
		slug: "identity",
		title: "A companion, not a capability claim.",
		description: "Understand Abbey, Aviva and ABI without confusing identity with implementation.",
		group: "Systems",
		sources: ["abi", "identity"],
		body: [
			{
				heading: "The described roles",
				paragraphs: ["The ABI README describes Abbey as the primary empathetic-polymath profile, Aviva as the direct expert mode, and ABI as the orchestration/governance layer. The linked identity specification contains the preserved declaration and a Current/Partial/Proposed mapping.", "Those are source-described interaction roles. They should not be presented as proof of three separately deployed models, standalone commercial products, consciousness or unlimited autonomous capabilities."]
			},
			{
				heading: "A useful design principle",
				paragraphs: ["An interface should make its actions and limits legible. A helpful tone and a persona name cannot substitute for permission, a working integration, or an accurate report of what happened."]
			},
			{
				heading: "Follow the evidence",
				paragraphs: ["ABI links a companion repository for Abbey. That reference is useful, but it does not establish the companion’s present deployment state or test health. Its current build was not independently assessed here.", "When evaluating an identity-related feature, ask for the implemented behavior and evidence relevant to it. Keep design intent, source description, reported testing and independently measured outcomes as separate statements."]
			}
		]
	},
	{
		slug: "gama",
		title: "One tree. Many surfaces.",
		description: "A source-based introduction to Gama’s Swift scene and rendering model.",
		group: "Systems",
		sources: ["gama"],
		body: [
			{
				heading: "Scenes and a render tree",
				paragraphs: ["Gama’s README describes a modular declarative UI framework in Swift. App scenes and state produce a retained render tree, followed by layout, painting and backend-specific output. Platform events return through a host-owned event path.", "The scene model requires one explicit primary scene. Auxiliary surfaces and typed groups are separate concepts; readers should use the current migration guide for exact declarations instead of copying an outdated example."]
			},
			{
				heading: "Modules with clear jobs",
				paragraphs: ["GamaCore owns the foundational scenes, views, identity, state, layout and event vocabulary. GamaTUI targets terminal output. The README describes Apple host modules, a browser WASM reactor, a C embedding interface and a deterministic MLIR emitter.", "These descriptions explain intended boundaries, not a promise that all platform targets have passed acceptance tests in this environment. Gama’s Swift interface work is separate from ABI’s Rust runtime and its toolchain instructions."]
			},
			{
				heading: "Verify your target",
				paragraphs: ["Choose a concrete host and inspect the current repository’s prerequisites, sample and verification command for it. Record your target, toolchain, checked-out revision and observed results before sharing a compatibility statement.", "A framework benchmark harness is not automatically a performance gate. Do not invent a threshold, speedup or universal support matrix from the existence of a measurement tool or a module name. Follow the source link for the authoritative starting point."]
			}
		]
	},
	{
		slug: "evidence",
		title: "Evidence before promises.",
		description: "Keep documented behavior, reported testing, measured results and targets separate.",
		group: "Principles",
		sources: [
			"platform",
			"abi",
			"claims"
		],
		body: [
			{
				heading: "Two independent axes",
				paragraphs: ["Implementation status and evidence provenance answer different questions. Current/Partial/Proposed describe the scope of an implementation. Measured/reported/target describe how a public numerical figure should be interpreted in the existing Quesar content contract.", "Neither axis can replace the other. A reported test suite is not an independently reproduced benchmark. A proposed feature is not a delivered capability. An attractive graph is not evidence that its numbers were measured."]
			},
			{
				heading: "A minimum evidence record",
				paragraphs: ["A useful performance statement identifies the source revision, date, environment, configuration, workload, methodology and artifact containing the results. It also states limitations and keeps comparisons consistent.", "This page publishes no runtime performance figures. ABI’s README labels its project-site dashboard data as synthetic samples. Those samples must not become latency, accuracy, energy-efficiency or throughput claims elsewhere."]
			},
			{
				heading: "What source review can establish",
				paragraphs: ["Source review establishes what a particular document says. Testing a website can establish whether its own links, search, controls and layouts work in the tested browser. Neither activity independently validates the linked software’s runtime, security, model quality or production deployment.", "Links to further specifications are reading pointers, not an assertion that every linked document, implementation path or external service was audited."]
			}
		]
	},
	{
		slug: "runtime",
		title: "ABI runtime, as the tree actually ships.",
		description: "Nightly Rust orchestration, wrappers, crates, and what a successful gate actually proves.",
		group: "Start",
		sources: ["abi"],
		body: [{
			heading: "Use the wrappers",
			paragraphs: ["The public ABI tree is nightly Rust. Bare cargo is the wrong entry. ./tools/cargo.sh pins the toolchain the tree actually builds with. ./tools/check.sh is the primary validation gate.", "WDBX is a required sibling. Clone both workspaces. A successful gate is evidence for that checkout and environment, not for a hosted product or a foundation-model quality claim."],
			code: [{
				lang: "bash",
				file: "donaldfilimon/abi",
				code: "git clone https://github.com/donaldfilimon/wdbx\ngit clone https://github.com/donaldfilimon/abi\ncd abi\n./tools/cargo.sh\n./tools/check.sh\n./tools/cargo.sh build -p abi-cli"
			}],
			note: "These commands are copied from the README. This page does not execute them."
		}, {
			heading: "Crates you can inspect",
			paragraphs: ["abi-cli is the operator surface. abi-mcp speaks JSON-RPC 2.0 over stdio with optional loopback HTTP. abi-ai holds an exact model registry and template completion. abi-sea is the scheduler. abi-gpu reports capability and returns accelerated=false when native kernels are not linked.", "Local template completion does not establish model quality. Persistence defaults to $HOME/.abi/wdbx and can be disabled with ABI_WDBX_PERSIST=0."],
			list: [
				"abi backends — list what this process actually reports",
				"abi scheduler status — health for this process, not a fleet view",
				"abi dashboard --once --plain — one-shot text, no hosted UI implied",
				"abi plugin list — plugins the current binary loaded under contract",
				"abi wdbx query — retrieve from the local store"
			]
		}]
	},
	{
		slug: "trust",
		title: "Fail closed. Tag the figure.",
		description: "Sessions, evaluation gates, and the difference between measured, reported, and target.",
		group: "Security & trust",
		sources: ["claims", "platform"],
		body: [{
			heading: "Operator-owned by default",
			paragraphs: ["Remote providers are optional and credential-gated. This website does not see your documents, weights, or generated output. Sign-in on this site opens a console for field notes, not an Abbey session.", "Unknown tools fail closed. A green web check is not mobile evidence. A reported test suite is not an independently reproduced benchmark."]
		}, {
			heading: "Provenance language",
			paragraphs: ["Figures on this site are tagged measured, target, or reported. New numbers that are not in the skill-creator master reference do not ship. Planned is never shipping. Research is not a Quesar product claim."],
			list: [
				"Measured — produced by a repository test or documented artifact",
				"Reported — stated by source, not rerun here",
				"Target — intent, never presented as current performance"
			]
		}]
	},
	{
		slug: "personas",
		title: "Abbey, Aviva, Abi — profiles, not products.",
		description: "Routing is a design mechanism. Per-persona quality is evaluated, not assumed.",
		group: "Architecture",
		sources: ["identity", "abi"],
		body: [{
			heading: "Three voices, one substrate",
			paragraphs: ["Abbey is care: empathetic, scaffolded. Aviva is clarity: concise, unfiltered. Abi is competence: the adaptive moderator that scores the blend. They are interaction roles, not separately deployed commercial services.", "Product ABI is violet. Persona Abi is cyan. Mixing those identities is how a page starts claiming three products that do not exist."]
		}, {
			heading: "What the demo is",
			paragraphs: ["The in-browser persona router is an illustrative keyword-sentiment heuristic. The inspected local router uses deterministic rules. This is not evidence of a trained classifier, and it is not a hosted Abbey session."],
			note: "Open /demo to watch α, or /abbey-bot for a companion thread that stays in this browser."
		}]
	},
	{
		slug: "wdbx",
		title: "Memory is a substrate, not a chat log.",
		description: "Layered HNSW, MVCC, content addressing. Integrity of storage is not truth of the record.",
		group: "Architecture",
		sources: ["wdbx", "abi"],
		body: [{
			heading: "Configuration facts",
			paragraphs: ["The active substrate is the Rust tree extracted from donaldfilimon/abi on 2026-08-22 with history preserved. Crate names keep the abi- prefix deliberately. ABI owns this layer.", "Engine: layered HNSW. Concurrency: MVCC. M=16, efConstruction=200, efSearch=64, cosine metric, content-addressed. Sharding is not established."]
		}, {
			heading: "What it does not prove",
			paragraphs: ["Storage integrity does not prove the truth of stored statements. Signatures and causal history answer why a record is trusted. Hybrid ranking currently collapses several axes into one score — that is a documented limitation, not a product claim.", "Reference cluster replication exists in source. It does not establish production multi-host operation."]
		}]
	},
	{
		slug: "wdbx-v2",
		title: "Historical Zig-era documentation.",
		description: "A frozen mirror retained so the catalog is complete. Not the current implementation guide.",
		group: "Architecture",
		sources: ["wdbx", "claims"],
		body: [{
			heading: "Authority",
			paragraphs: ["WDBX V2 documentation is a historical Zig-era mirror. The current substrate is nightly Rust. Do not mix toolchains. Do not treat a Zig-era figure as a current measurement.", "wdbx-py, wdnx, and related Python sketches are historical relatives. Configuration facts on this site come from the Rust crates."]
		}]
	},
	{
		slug: "mcp",
		title: "Twelve contract-covered tools.",
		description: "JSON-RPC 2.0 over stdio, optional loopback HTTP. Unknown tools fail closed.",
		group: "Architecture",
		sources: ["abi"],
		body: [{
			heading: "What you can call locally",
			paragraphs: ["The MCP server lives in the ABI repository. Transports are stdio and optional loopback HTTP with bearer auth. This website does not expose those tools to visitors."],
			list: [
				"ai_learn — ingest a record; persistence can be disabled",
				"ai_complete — template completion against the exact registry model",
				"wdbx_query — nearest-neighbor retrieval with inspectable hits",
				"wdbx_stats — local store statistics, not a cluster dashboard",
				"gpu_status — honest device report; fallback is reported as fallback",
				"plugin_list — contract-covered plugins visible to this process"
			]
		}, {
			heading: "What is not published",
			paragraphs: ["There is no hosted Quesar HTTP API, no third-party SaaS SDK, and no guaranteed stable versioning across all crates. A local site-builder HTTP API exists on a trusted LAN without authentication — run it only on a network you trust."]
		}]
	},
	{
		slug: "deployment",
		title: "Each surface has its own gate.",
		description: "Packaging orchestration, retrieval, and controls. A web check is not mobile evidence.",
		group: "Operations",
		sources: ["platform", "abi"],
		body: [{
			heading: "Independent gates",
			paragraphs: ["Website, Abbey workspace, Quasar builder, mobile companion, and ABI+WDBX each have their own verification command. Passing one does not prove another."],
			list: [
				"bun run check:web — this orientation surface",
				"bun run check:website-app — Abbey workspace",
				"bun run check:quasar — local builder",
				"bun run check:mobile — Expo companion",
				"./tools/check.sh — ABI with the sibling WDBX workspace"
			]
		}, {
			heading: "Targets",
			paragraphs: ["Default posture is operator-owned machines. VPC, on-premise, hybrid, and offline-first paths are the design. This website does not provision hosting, deploy adapters, or bill."]
		}]
	},
	{
		slug: "api",
		title: "Protected surfaces fail closed.",
		description: "The console requires a session. There is no public hosted assistant API.",
		group: "Reference",
		sources: ["platform", "claims"],
		body: [{
			heading: "What this site actually exposes",
			paragraphs: ["Sign-in opens /console for per-user field notes on architecture nodes. Live persona replies, when available, are sign-in-gated and capped. They are not an Abbey session.", "Without credentials the console redirects to sign-in. Unknown MCP tools fail closed in the runtime. This page is not a platform SDK."]
		}]
	}
].map((doc) => ({
	...doc,
	sources: doc.sources.map((key) => {
		const source = DOC_SOURCES[key];
		if (!source) throw new Error(`docs.ts: unknown source key "${key}"`);
		return source;
	})
})));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/projects-DAHDstmy.js
var projects = ProjectsSchema.parse([
	{
		slug: "abi",
		name: "ABI",
		kind: "Local AI runtime",
		tagline: "A runtime you can inspect.",
		description: "Nightly Rust foundations for local AI orchestration, semantic storage, and explicit capability reporting.",
		scope: [
			"Local AI service orchestration and runtime primitives.",
			"CLI and MCP interfaces described in the source.",
			"Capability reporting that distinguishes a fallback from native acceleration."
		],
		limit: "The README describes a nightly Rust workspace. It does not establish production LLM quality, autonomous browser execution, or blanket GPU acceleration. Its site benchmark samples are synthetic.",
		source: {
			title: "ABI README",
			url: "https://github.com/donaldfilimon/abi/blob/main/README.md"
		},
		docsHref: "/docs/runtime",
		glyph: "layers"
	},
	{
		slug: "wdbx",
		name: "WDBX",
		kind: "Semantic storage",
		tagline: "Give retrieval a foundation.",
		description: "The semantic-storage work associated with ABI, with source-documented retrieval and persistence contracts.",
		scope: [
			"Ordered vector search and hybrid ranking described upstream.",
			"Repository-reported metadata, recovery and compaction contracts.",
			"Temporal graph snapshot restoration described in the README."
		],
		limit: "The cited coverage is reported by the repository, not rerun here. Persistence may be skipped or fail. No live retrieval results are shown here; this is not a connected database.",
		source: {
			title: "ABI README",
			url: "https://github.com/donaldfilimon/abi/blob/main/README.md"
		},
		docsHref: "/docs/wdbx",
		glyph: "database"
	},
	{
		slug: "abbey",
		name: "Abbey",
		kind: "Companion & identity",
		tagline: "A more thoughtful interface.",
		description: "The companion identity described in ABI’s source, with distinct interaction and governance roles.",
		scope: [
			"Abbey is described as the primary empathetic-polymath profile.",
			"Aviva is the direct expert mode, not a separately verified product.",
			"ABI supplies the orchestration and governance role in that description."
		],
		limit: "An identity specification is not evidence of a deployed model, independent intelligence, or consciousness. The companion repository is referenced by ABI; its current build was not independently assessed here.",
		source: {
			title: "Abbey identity specification",
			url: "https://github.com/donaldfilimon/abi/blob/main/docs/spec/abbey-core-identity.mdx"
		},
		docsHref: "/docs/identity",
		glyph: "spark"
	},
	{
		slug: "gama",
		name: "Gama",
		kind: "Swift UI framework",
		tagline: "One tree. Many surfaces.",
		description: "A modular declarative UI framework in Swift, organized around scenes and a retained render tree.",
		scope: [
			"GamaCore organizes scenes, state, layout and events.",
			"The README describes terminal, Apple, WASM and C/Android integrations.",
			"MLIR and Embedded Swift are documented integration tracks."
		],
		limit: "These are documented integrations, not a blanket platform-support guarantee. Check the current source prerequisites and acceptance evidence for your target. Gama is separate from ABI’s Rust runtime.",
		source: {
			title: "Gama README",
			url: "https://github.com/donaldfilimon/gama/blob/main/README.md"
		},
		docsHref: "/docs/gama",
		glyph: "command"
	}
]);
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/seo-CIyC4abA.js
function pageHead(title, description) {
	return { meta: [{ title }, {
		name: "description",
		content: description
	}] };
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/internal-MsUNvFBE.js
var repoPaths = {
	"MLAI-CORPORATION-WWW": "/developers",
	"mlai-corp-website": "/developers",
	abi: "/abi",
	wdbx: "/wdbx",
	abbey: "/abbey",
	"abbey-bot": "/abbey-bot",
	AbbeyBot: "/abbey-bot",
	"skill-creator": "/skill-creator",
	plugins: "/plugins",
	gama: "/gama",
	"mlai-website-app": "/workspace",
	AbbeyCompanion: "/companion",
	"cell-lang": "/source/cell-lang",
	NYON: "/source/nyon",
	"nyon-game": "/source/nyon",
	"wdbx-py": "/source/wdbx-py",
	wdbx_python: "/source/wdbx-py",
	"mlai-site": "/quesar",
	"cell-machine": "/source/cell-machine",
	"mlai-py": "/source/mlai-py",
	HydroCycle: "/source/hydrocycle",
	paint: "/source/paint",
	Invasion3D: "/source/invasion3d",
	wdnx: "/source/wdnx",
	"cell-state-adaptive-bun-validated": "/source/cell-state",
	"alien-invasion": "/source/alien-invasion",
	"star-space-portfolio": "/source/star-space",
	donaldfilimon: "/source/donaldfilimon",
	"donaldfilimon.github.io": "/source/portfolio",
	ovo: "/source/ovo",
	mlaix: "/source/mlaix"
};
function pathForRepo(name) {
	return repoPaths[name] ?? `/source/${encodeURIComponent(name)}`;
}
var appSurfaces = [
	{
		id: "quasar",
		name: "Quasar",
		path: "/quesar",
		status: "experimental",
		kicker: "Local builder",
		body: "Prompt to a Next.js project. This page runs a browser studio so you can see the loop without leaving the site."
	},
	{
		id: "workspace",
		name: "Abbey workspace",
		path: "/workspace",
		status: "current",
		kicker: "Documents",
		body: "Local document workspace with assistant context. The shipping app runs on your machine; this page is the in-browser orientation of that loop."
	},
	{
		id: "mobile",
		name: "Mobile companion",
		path: "/mobile",
		status: "partial",
		kicker: "Vault",
		body: "Expo companion with a private vault. Native CloudKit is a signed iOS build. This page is the web vault."
	},
	{
		id: "console",
		name: "Field console",
		path: "/console",
		status: "current",
		kicker: "Notes",
		body: "Signed-in notes on architecture nodes. Not an Abbey session."
	},
	{
		id: "abbey-bot",
		name: "Abbey bot",
		path: "/abbey-bot",
		status: "partial",
		kicker: "Companion",
		body: "Companion bot surface for Abbey. Watch Abi route Abbey and Aviva in the browser."
	},
	{
		id: "companion",
		name: "Abbey Companion",
		path: "/companion",
		status: "partial",
		kicker: "macOS",
		body: "Native SwiftUI companion for Abbey Bot. Local surface, not a hosted session."
	},
	{
		id: "skill-creator",
		name: "skill-creator",
		path: "/skill-creator",
		status: "current",
		kicker: "Integrity",
		body: "Public agent skill for shipping this site without breaking Apple framing, provenance, Apache-2.0, or toolchain facts."
	},
	{
		id: "gama",
		name: "Gama",
		path: "/gama",
		status: "research",
		kicker: "Founder",
		body: "Declarative Swift UI framework. Founder-owned. Not a Quesar product claim."
	},
	{
		id: "plugins",
		name: "Plugins",
		path: "/plugins",
		status: "partial",
		kicker: "abi-mega",
		body: "Skills, assets, and scripts consumed by ABI sync. Founder tooling, not a hosted marketplace."
	},
	{
		id: "demo",
		name: "Persona demo",
		path: "/demo",
		status: "experimental",
		kicker: "Router",
		body: "Type a message and watch Abi score the blend coefficient α. Illustrative heuristic, not a trained classifier."
	},
	{
		id: "cell-machine",
		name: "Cell machine",
		path: "/cell-machine",
		status: "research",
		kicker: "Automaton",
		body: "Cellular-automaton experiment. Playable here."
	}
];
var frozenCli = [
	"help",
	"complete",
	"train",
	"agent",
	"backends",
	"plugin",
	"auth",
	"twilio",
	"tui",
	"dashboard",
	"wdbx",
	"scheduler",
	"nn"
];
var repoDocs = {
	"cell-lang": {
		title: "Cell",
		lede: "Founder systems language: Rust ownership, Swift ergonomics, Zig control, compiled to a C ABI. Not a Quesar product claim.",
		status: "research",
		language: "Zig",
		sections: [{
			title: "What it is",
			body: "A Zig-hosted compiler with C, LLVM IR, and MLIR backends. It is founder research, not an MLAI runtime dependency."
		}, {
			title: "What it is not",
			body: "Not a Quesar surface, not a replacement for nightly Rust ABI, and not a hosted language service."
		}]
	},
	nyon: {
		title: "NYON",
		lede: "Founder voxel-world experiment. Not a Quesar product surface.",
		status: "research",
		language: "Rust",
		sections: [{
			title: "Boundary",
			body: "NYON is listed because it is public. It does not ship with Quesar, ABI, WDBX, or Abbey."
		}]
	},
	"wdbx-py": {
		title: "wdbx-py",
		lede: "Earlier Python WDBX implementation. The active substrate is the Rust tree.",
		status: "partial",
		language: "Python",
		sections: [{
			title: "Authority",
			body: "Configuration facts and crate maps on this site come from the Rust substrate. Treat wdbx-py as historical."
		}]
	},
	"cell-machine": {
		title: "cell-machine",
		lede: "Cellular-automaton experiment in Bun and TypeScript. Founder research, not a Quesar product.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "Public, inspectable, and unrelated to the Quesar runtime. Play it on this page so the catalog is complete without sending you away."
		}]
	},
	hydrocycle: {
		title: "HydroCycle",
		lede: "Founder hydrology experiment. Related by author, not a Quesar surface.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "Listed because it is public. Not part of the Quesar stack."
		}]
	},
	paint: {
		title: "paint",
		lede: "winit + wgpu + kurbo graphics app on Rust nightly.",
		status: "research",
		language: "Rust",
		sections: [{
			title: "Boundary",
			body: "A drawing surface. Not an Abbey canvas and not a hosted editor."
		}]
	},
	invasion3d: {
		title: "Invasion3D",
		lede: "Metal 4 renderer with SwiftUI and SwiftData. Founder graphics work.",
		status: "research",
		language: "Swift",
		sections: [{
			title: "Boundary",
			body: "Not a Quesar product. Native Apple stack, not this website's runtime."
		}]
	},
	wdnx: {
		title: "wdnx",
		lede: "Earlier database specification work. Historical relative of WDBX.",
		status: "research",
		language: "Python",
		sections: [{
			title: "Authority",
			body: "The active substrate is donaldfilimon/wdbx in Rust."
		}]
	},
	"cell-state": {
		title: "cell-state",
		lede: "Cell-state adaptive solver with a WebGPU lab simulation.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "A lab. Not evidence of a Quesar spatial engine."
		}]
	},
	"alien-invasion": {
		title: "alien-invasion",
		lede: "Real-time WebGL cinematic: seven chapters, one camera move.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "A film experiment. See also /showcase/film."
		}]
	},
	"star-space": {
		title: "Star Space",
		lede: "Personal portfolio experiment. Not the company site.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "Donald Filimon personal work, not Quesar orientation."
		}]
	},
	donaldfilimon: {
		title: "donaldfilimon",
		lede: "Profile and miscellaneous public work.",
		status: "research",
		language: "Rust",
		sections: [{
			title: "Boundary",
			body: "Author namespace. Product facts live on the product pages."
		}]
	},
	portfolio: {
		title: "donaldfilimon.github.io",
		lede: "Personal Next.js static export. Separate from Quesar.",
		status: "research",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "Personal site. Company orientation is this website."
		}]
	},
	ovo: {
		title: "ovo",
		lede: "Founder Zig experiment.",
		status: "research",
		language: "Zig",
		sections: [{
			title: "Boundary",
			body: "Not an MLAI runtime dependency."
		}]
	},
	"mlai-py": {
		title: "mlai-py",
		lede: "Early Python machine-learning library sketch.",
		status: "research",
		language: "Python",
		sections: [{
			title: "Boundary",
			body: "Historical. Current runtimes are Rust."
		}]
	},
	mlaix: {
		title: "mlaix",
		lede: "Private TypeScript sketch in the MLAI namespace.",
		status: "development",
		language: "TypeScript",
		sections: [{
			title: "Boundary",
			body: "Not a public product surface."
		}]
	}
};
var HOSTS = [/^https?:\/\/github\.com\/donaldfilimon\/([^/#?]+)/i, /^https?:\/\/raw\.githubusercontent\.com\/donaldfilimon\/([^/#?]+)/i];
function isGithubHref(href) {
	return /github\.com|githubusercontent\.com/i.test(href);
}
function internalHref(href) {
	if (!href) return "/";
	if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")) return href;
	if (/donaldfilimon\.github\.io\/abi/i.test(href)) return "/abi";
	if (/quesar\.cloud/i.test(href)) try {
		const url = new URL(href);
		return `${url.pathname}${url.hash}` || "/";
	} catch {
		return "/";
	}
	for (const re of HOSTS) {
		const match = href.match(re);
		if (match?.[1]) return pathForRepo(match[1]);
	}
	if (isGithubHref(href)) return "/source";
	return href;
}
function isExternal(href) {
	return /^(https?:)?\/\//i.test(href) && !isGithubHref(href) && !/quesar\.cloud/i.test(href);
}
/** Path-only redirects after sign-in. Reject protocol-relative and off-site values. */
function safeInternalPath(path, fallback = "/console") {
	if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\") || path.includes("://")) return fallback;
	if (path.startsWith("/api") || path.startsWith("/auth/")) return fallback;
	return path;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-CTU_BGql.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
function AppNotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase",
				children: "404"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl tracking-tight",
				children: "This page is not in the catalog."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm leading-relaxed text-fg-muted",
				children: "Every public surface lives on this site. If a name moved, start from docs, apps, or the source catalog."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 flex flex-wrap gap-4 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "text-accent",
						children: "Home"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/docs",
						className: "text-fg-muted hover:text-fg",
						children: "Docs"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/apps",
						className: "text-fg-muted hover:text-fg",
						children: "Apps"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/source",
						className: "text-fg-muted hover:text-fg",
						children: "Source"
					})
				]
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var TooltipProvider = Provider;
var Tooltip = Root3;
var TooltipTrigger = Trigger$2;
function TooltipContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
		sideOffset,
		className: cn("z-[90] max-w-xs rounded-md bg-bg-elevated px-2.5 py-1.5 text-xs text-fg shadow-[var(--shadow-border)]", className),
		...props
	}) });
}
function Hint({ label, children, side = "bottom" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
		side,
		children: label
	})] });
}
var PROVENANCE = {
	measured: {
		glyph: "●",
		label: "Measured",
		description: "Present in source, reproduced locally, or a configuration fact.",
		chip: "border-abbey/30 bg-abbey/8 text-abbey"
	},
	target: {
		glyph: "○",
		label: "Target",
		description: "Engineering goal. Never a result.",
		chip: "border-warn/35 bg-warn/8 text-warn"
	},
	reported: {
		glyph: "◆",
		label: "Reported",
		description: "Cited from a named source. Not re-measured here.",
		chip: "border-abi/30 bg-abi/8 text-abi"
	}
};
function ProvTag({ tag, className }) {
	const { glyph, label, chip } = PROVENANCE[tag];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase", chip, className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			children: glyph
		}), label]
	});
}
function ProvLegend({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted", className),
		"aria-label": "How figures on this site are labeled",
		children: Object.keys(PROVENANCE).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvTag, { tag }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: PROVENANCE[tag].description })]
		}, tag))
	});
}
/** Weighted-graph “M” — the Lab mark. Mirrors WDBX’s directed backtrace. */
function Mark({ className, mono = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("relative inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]", mono ? "text-current" : "bg-bg-elevated text-accent shadow-[var(--shadow-border)]", className),
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 32 32",
			className: "size-[21px]",
			fill: "none",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M8 23 L8 10 L16 16 L24 10 L24 23",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "23",
					r: "2.6",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "10",
					r: "2.2",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "16",
					cy: "16",
					r: "1.9",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "24",
					cy: "10",
					r: "2.2",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "24",
					cy: "23",
					r: "2.6",
					fill: "currentColor"
				})
			]
		})
	});
}
function Logo({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/",
		className: "flex items-center gap-2.5 text-fg no-underline",
		"aria-label": "Quesar by MLAI — home",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex flex-col leading-none",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-display text-[1.05rem] font-bold tracking-tight",
				children: "Quesar"
			}), !compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 font-mono text-[0.62rem] font-medium tracking-[0.2em] text-fg-subtle uppercase",
				children: "by MLAI"
			}) : null]
		})]
	});
}
var groups = [
	{
		title: "Product",
		links: [
			{
				to: "/quesar",
				label: "Quesar"
			},
			{
				to: "/platform",
				label: "Platform"
			},
			{
				to: "/abbey",
				label: "Abbey"
			},
			{
				to: "/abi",
				label: "ABI"
			},
			{
				to: "/wdbx",
				label: "WDBX"
			}
		]
	},
	{
		title: "Developers",
		links: [
			{
				to: "/architecture",
				label: "Architecture"
			},
			{
				to: "/developers",
				label: "Source"
			},
			{
				to: "/console",
				label: "Field notes"
			},
			{
				to: "/research",
				label: "Research"
			},
			{
				to: "/docs",
				label: "Docs"
			},
			{
				to: "/apps",
				label: "Apps"
			}
		]
	},
	{
		title: "MLAI",
		links: [
			{
				to: "/company",
				label: "Company"
			},
			{
				to: "/services",
				label: "Services"
			},
			{
				to: "/investors",
				label: "Investors"
			},
			{
				to: "/privacy",
				label: "Privacy"
			},
			{
				to: "/security",
				label: "Security"
			},
			{
				to: "/terms",
				label: "Terms"
			},
			{
				to: "/contact",
				label: "Contact"
			}
		]
	}
];
function SiteFooter() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "mt-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "brand-seam" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_2fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 max-w-sm text-sm leading-relaxed text-fg-muted",
						children: "MLAI Corporation builds assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 font-mono text-[0.62rem] tracking-[0.18em] text-fg-subtle uppercase",
						children: "QSR-WEB · Local orientation · No hosted session"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvLegend, { className: "mt-6 max-w-sm" })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-8 sm:grid-cols-3",
					children: groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[0.68rem] font-medium tracking-[0.16em] text-fg-subtle uppercase",
						children: group.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-2",
						children: group.links.map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: link.to,
							className: "text-sm text-fg-muted no-underline hover:text-fg",
							children: link.label
						}) }, link.label))
					})] }, group.title))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"© ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" MLAI Corporation. Apache-2.0 on core runtimes."
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This site orients and offers a signed-in console for field notes. It does not host assistant sessions." })]
				})
			})
		]
	});
}
var Collapsible = Root;
var CollapsibleTrigger = Trigger;
var CollapsibleContent = Content;
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger$1;
function DropdownMenuContent({ className, sideOffset = 8, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		sideOffset,
		className: cn("z-[80] min-w-44 overflow-hidden rounded-lg bg-bg-elevated p-1 shadow-[var(--shadow-border)]", className),
		...props
	}) });
}
function DropdownMenuItem({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		className: cn("flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-fg-muted outline-none", "data-[highlighted]:bg-bg-subtle data-[highlighted]:text-fg", className),
		...props
	});
}
function DropdownMenuLabel({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
		className: cn("px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase", className),
		...props
	});
}
function DropdownMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
		className: cn("-mx-1 my-1 h-px bg-border", className),
		...props
	});
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	const next = useRouterState({ select: (s) => `${s.location.pathname}${s.location.searchStr ?? ""}` });
	if (to !== "/login") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, {
		to: "/login",
		search: { next: next || "/console" }
	});
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function AuthSlot() {
	const { isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-11 w-24 animate-pulse rounded-md bg-bg-subtle",
		"aria-hidden": "true"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/login",
		className: "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-fg-muted no-underline hover:text-fg",
		children: "Sign in"
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/console",
			className: "hidden h-11 items-center rounded-md px-3 text-sm font-medium text-fg-muted no-underline hover:text-fg sm:inline-flex",
			children: "Console"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})]
	}) })] });
}
var Dialog = Dialog$1;
var DialogTrigger = DialogTrigger$1;
var DialogTitle = DialogTitle$1;
var DialogDescription = DialogDescription$1;
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-[80] bg-bg/70", className),
		...props
	});
}
function DialogContent({ className, children, showClose = true, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-1/2 z-[81] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-bg-elevated text-fg shadow-[var(--shadow-border)]", className),
		...props,
		children: [children, showClose ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
				className: "size-4",
				strokeWidth: 1.75
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		}) : null]
	})] });
}
var catalog = [
	...searchIndex.map((item) => ({
		title: item.title,
		href: item.href,
		group: item.group,
		body: item.body,
		external: item.href.startsWith("http")
	})),
	...architectureNodes.map((node) => ({
		title: node.name,
		href: "/architecture",
		group: "Architecture",
		body: `${node.summary} Current in source versus not claimed.`,
		external: false,
		search: { node: node.id }
	})),
	...repos.map((repo) => ({
		title: repo.name,
		href: repo.href,
		group: "Source",
		body: repo.summary,
		external: false
	})),
	...docs.map((doc) => ({
		title: doc.title,
		href: `/docs/${doc.slug}`,
		group: "Docs",
		body: doc.description,
		external: false
	})),
	...blog.map((post) => ({
		title: post.title,
		href: `/blog/${post.slug}`,
		group: "Blog",
		body: post.excerpt,
		external: false
	})),
	...research.publications.map((paper) => ({
		title: paper.title,
		href: `/research/${paper.slug}`,
		group: "Research",
		body: paper.abstract,
		external: false
	})),
	...products.map((product) => ({
		title: product.name,
		href: `/products/${product.slug}`,
		group: "Product",
		body: product.intro,
		external: false
	})),
	...projects.map((project) => ({
		title: project.name,
		href: `/projects/${project.slug}`,
		group: "Projects",
		body: project.tagline,
		external: false
	})),
	...team.filter((person) => person.slug).map((person) => ({
		title: person.name,
		href: `/team/${person.slug}`,
		group: "Team",
		body: person.tagline ?? person.bio,
		external: false
	}))
];
function rank(query) {
	const terms = query.normalize("NFKC").toLowerCase().trim().slice(0, 80).split(/\s+/).filter(Boolean);
	if (!terms.length) return catalog.slice(0, 8);
	return catalog.map((item, index) => {
		const hay = `${item.title} ${item.group} ${item.body}`.toLowerCase();
		if (!terms.every((t) => hay.includes(t))) return {
			item,
			index,
			score: 0
		};
		return {
			item,
			index,
			score: terms.reduce((n, t) => n + (item.title.toLowerCase().includes(t) ? 8 : 0) + (item.group.toLowerCase().includes(t) ? 3 : 0) + (item.body.toLowerCase().includes(t) ? 1 : 0), 0)
		};
	}).filter((row) => row.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 10).map((row) => row.item);
}
function SiteSearch() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const navigate = useNavigate();
	const hits = (0, import_react.useMemo)(() => rank(query), [query]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
			const tag = event.target?.tagName;
			if (tag && [
				"INPUT",
				"TEXTAREA",
				"SELECT"
			].includes(tag)) return;
			event.preventDefault();
			setOpen((value) => !value);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	function go(hit) {
		setOpen(false);
		setQuery("");
		if (hit.external) {
			window.open(hit.href, "_blank", "noopener,noreferrer");
			return;
		}
		navigate({
			to: hit.href,
			search: hit.search
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (next) => {
			setOpen(next);
			if (!next) setQuery("");
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-fg-muted hover:bg-bg-subtle hover:text-fg",
				"aria-label": "Search the site",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						className: "size-4",
						strokeWidth: 1.75
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden font-mono text-[10px] tracking-[0.14em] uppercase xl:inline",
						children: "Search"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "hidden rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle xl:inline",
						children: "⌘K"
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			showClose: false,
			"aria-describedby": void 0,
			className: "p-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "sr-only",
					children: "Search Quesar and MLAI"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "sr-only",
					children: "Jump to architecture nodes, products, docs, and public repositories."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e, {
					shouldFilter: false,
					className: "bg-bg-elevated text-fg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 border-b border-border px-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-4 text-fg-subtle",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Input, {
							value: query,
							onValueChange: setQuery,
							placeholder: "Search pages, products, and public repositories",
							className: "h-14 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e.List, {
						className: "max-h-[min(24rem,50vh)] overflow-y-auto py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Empty, {
							className: "px-4 py-6 text-sm text-fg-muted",
							children: "No pages match that query."
						}), hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e.Item, {
							value: `${hit.title} ${hit.href} ${hit.search?.node ?? ""}`,
							onSelect: () => go(hit),
							className: "flex cursor-pointer flex-col items-start gap-0.5 px-4 py-3 data-[selected=true]:bg-bg-subtle",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase",
									children: hit.group
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium text-fg",
									children: hit.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "line-clamp-1 text-xs text-fg-muted",
									children: hit.body
								})
							]
						}, `${hit.group}-${hit.href}-${hit.search?.node ?? ""}`))]
					})]
				})
			]
		})]
	});
}
var THEME_KEY = "mlai-theme";
function readStoredTheme() {
	try {
		const value = localStorage.getItem(THEME_KEY);
		if (value === "dark" || value === "light") return value;
	} catch {}
	return null;
}
function applyTheme(theme) {
	document.documentElement.dataset.theme = theme;
	document.documentElement.classList.toggle("dark", theme === "dark");
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {}
}
function resolveTheme() {
	return readStoredTheme() ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
function Toggle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root$1, {
		className: cn("inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg data-[state=on]:text-fg", className),
		...props
	});
}
function ThemeToggle({ className }) {
	const [theme, setTheme] = (0, import_react.useState)("dark");
	(0, import_react.useEffect)(() => {
		setTheme(resolveTheme());
	}, []);
	const dark = theme === "dark";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hint, {
		label: dark ? "Switch to light theme" : "Switch to dark theme",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
			pressed: dark,
			onPressedChange: (next) => {
				const value = next ? "dark" : "light";
				applyTheme(value);
				setTheme(value);
			},
			className,
			"aria-label": dark ? "Switch to light theme" : "Switch to dark theme",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "relative size-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, {
					className: cn("absolute inset-0 size-4 transition-[opacity,transform,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]", theme === "light" ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"),
					strokeWidth: 1.75
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {
					className: cn("absolute inset-0 size-4 transition-[opacity,transform,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]", theme === "dark" ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"),
					strokeWidth: 1.75
				})]
			})
		})
	});
}
var linkClass = "nav-link rounded-sm px-2.5 py-2 text-sm no-underline transition-[color] duration-150";
var extra = [
	{
		to: "/architecture",
		label: "Architecture"
	},
	{
		to: "/console",
		label: "Field notes"
	},
	{
		to: "/investors",
		label: "Investors"
	},
	{
		to: "/developers",
		label: "Developers"
	}
];
function SiteHeader() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { user } = useCurrentUserState();
	const [open, setOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setOpen(false);
	}, [pathname]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "sticky top-0 z-40 border-b border-border bg-bg/78 backdrop-blur-md",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Collapsible, {
			open,
			onOpenChange: setOpen,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "hidden items-center gap-0.5 lg:flex",
						"aria-label": "Primary",
						children: [nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: item.to,
							className: cn(linkClass, "text-fg-muted hover:text-fg data-[status=active]:text-fg"),
							activeOptions: { exact: true },
							children: item.label
						}, item.to)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							className: cn(linkClass, "text-fg-muted hover:text-fg"),
							children: "More"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "start",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: "Journeys" }),
								extra.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: item.to,
										className: "w-full no-underline",
										children: item.label
									})
								}, item.to)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/contact",
										className: "w-full no-underline",
										children: "Contact"
									})
								})
							]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hint, {
								label: user ? "Signed in. Field notes stay on your account." : "Local session. Sign in to keep field notes.",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									tabIndex: 0,
									className: "mr-2 hidden items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase xl:inline-flex",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "size-1.5 rounded-full bg-status-current",
										"aria-hidden": "true"
									}), user ? "Signed in · field notes" : "Local · no session"]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteSearch, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSlot, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CollapsibleTrigger, {
								className: "inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: open ? "Close menu" : "Open menu"
								}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									className: "size-5",
									strokeWidth: 1.75
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
									className: "size-5",
									strokeWidth: 1.75
								})]
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CollapsibleContent, {
				className: "lg:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "border-t border-border px-4 py-3",
					"aria-label": "Mobile",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "flex flex-col",
						children: [nav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: item.to,
							className: "flex min-h-11 items-center rounded-md px-3 text-base text-fg-muted no-underline data-[status=active]:bg-bg-subtle data-[status=active]:text-fg",
							activeOptions: { exact: true },
							children: item.label
						}) }, item.to)), extra.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: item.to,
							className: "flex min-h-11 items-center rounded-md px-3 text-base text-fg-muted no-underline data-[status=active]:bg-bg-subtle data-[status=active]:text-fg",
							children: item.label
						}) }, item.to))]
					})
				})
			})]
		})
	});
}
function Progress({ className, value = 0, ...props }) {
	const clamped = Math.min(100, Math.max(0, value ?? 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root$2, {
		value: clamped,
		className: cn("relative h-1.5 w-full overflow-hidden bg-transparent", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Indicator, {
			className: "h-full w-full bg-accent",
			style: { transform: `translateX(-${100 - clamped}%)` }
		})
	});
}
function ScrollProgress() {
	const [value, setValue] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		let frame = 0;
		function update() {
			frame = 0;
			const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
			setValue(window.scrollY / max * 100);
		}
		function onScroll() {
			if (frame) return;
			frame = window.requestAnimationFrame(update);
		}
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
		value,
		"aria-hidden": "true",
		className: "pointer-events-none fixed top-0 left-0 z-[70] h-[1.5px] rounded-none"
	});
}
function AppToaster() {
	const [theme, setTheme] = (0, import_react.useState)("dark");
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		const sync = () => setTheme(root.dataset.theme === "light" ? "light" : "dark");
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-theme"]
		});
		return () => observer.disconnect();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		theme,
		position: "bottom-right",
		toastOptions: { classNames: {
			toast: "surface !bg-bg-elevated !text-fg !border-border",
			title: "!text-fg",
			description: "!text-fg-muted"
		} }
	});
}
function SiteShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
		delayDuration: 200,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-dvh flex-col bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "site-grain",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollProgress, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "#main",
					className: "skip-link",
					children: "Skip to content"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					id: "main",
					className: "flex-1",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppToaster, {})
			]
		})
	});
}
var styles_default = "/assets/styles-f2c8fq4x.css";
var THEME_BOOT = `(function(){try{var t=localStorage.getItem("mlai-theme");var theme=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle("dark",theme==="dark");}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");}})();`;
var Route$59 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: `${site.name} — ${site.company}` },
			{
				name: "description",
				content: site.description
			},
			{
				name: "theme-color",
				content: "oklch(0.153 0.006 107.1)"
			},
			{
				name: "color-scheme",
				content: "dark light"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "canonical",
				href: "https://quesar.cloud/"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
			}
		]
	}),
	component: RootDocument,
	notFoundComponent: NotFound
});
function RootDocument() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		"data-theme": "dark",
		className: "dark",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: THEME_BOOT } })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "antialiased",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	});
}
function NotFound() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl px-4 py-24 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.7rem] tracking-[0.16em] text-accent uppercase",
				children: "404"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl tracking-tight",
				children: "Page not found"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-fg-muted",
				children: "That path is not part of the public Quesar site. Try the architecture, or start from home."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 flex justify-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/",
					className: "inline-flex h-11 items-center rounded-md bg-fg px-4 text-sm font-medium text-bg no-underline",
					children: "Home"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/architecture",
					className: "inline-flex h-11 items-center rounded-md bg-bg-elevated px-4 text-sm font-medium text-fg no-underline shadow-[var(--shadow-border)]",
					children: "Architecture"
				})]
			})
		]
	});
}
var $$splitComponentImporter$57 = () => import("./routes-QbUJ9hcv.mjs");
var Route$58 = createFileRoute("/")({
	head: () => pageHead(`${site.name} — Private intelligence, built around you`, site.description),
	component: lazyRouteComponent($$splitComponentImporter$57, "component")
});
var $$splitComponentImporter$56 = () => import("./abbey-DIj2-0te.mjs");
var Route$57 = createFileRoute("/abbey")({
	head: () => pageHead("Abbey — Adaptive assistant on MLAI architecture", "Abbey is the adaptive assistant experience on Quesar: a local document workspace and a CLI/TUI companion that will not claim what the ledger cannot prove."),
	component: lazyRouteComponent($$splitComponentImporter$56, "component")
});
var $$splitComponentImporter$55 = () => import("./abbey-bot-1Cr3oErQ.mjs");
var Route$56 = createFileRoute("/abbey-bot")({
	head: () => ({ meta: [{ title: "Abbey bot — Quesar" }, {
		name: "description",
		content: "Companion bot surface: watch Abi route Abbey and Aviva, then ask a signed-in live model."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$55, "component")
});
var $$splitComponentImporter$54 = () => import("./abi-D11tOgB6.mjs");
var Route$55 = createFileRoute("/abi")({
	head: () => pageHead("ABI — Orchestration and inspectable context", "ABI is MLAI's local nightly Rust framework for routing assistant requests, assembling inspectable context, and reporting capabilities honestly."),
	component: lazyRouteComponent($$splitComponentImporter$54, "component")
});
var $$splitComponentImporter$53 = () => import("./about-BYOjUTcj.mjs");
var Route$54 = createFileRoute("/about")({
	head: () => pageHead("About — MLAI Corporation", "MLAI Corporation values, operating principles, and registration-level facts."),
	component: lazyRouteComponent($$splitComponentImporter$53, "component")
});
var $$splitComponentImporter$52 = () => import("./apps-D00kUhwI.mjs");
var Route$53 = createFileRoute("/apps")({
	head: () => pageHead("Apps — Quesar surfaces", "In-browser orientations of MLAI apps: Abbey workspace, mobile vault, Quasar studio, Abbey bot, plugins, and more."),
	component: lazyRouteComponent($$splitComponentImporter$52, "component")
});
var $$splitComponentImporter$51 = () => import("./architecture-Bj1HdrRi.mjs");
function parseNode$1(value) {
	return typeof value === "string" && architectureNodes.some((node) => node.id === value) ? value : void 0;
}
function nodeSearch(search) {
	const node = parseNode$1(search.node);
	return node ? { node } : {};
}
var Route$52 = createFileRoute("/architecture")({
	validateSearch: (search) => nodeSearch(search),
	head: () => pageHead("Architecture — Quesar, ABI, WDBX", "Interactive architecture of Quesar: user input, ABI orchestration, model routing, WDBX memory, provenance, and local or remote compute."),
	component: lazyRouteComponent($$splitComponentImporter$51, "component")
});
var $$splitComponentImporter$50 = () => import("./benchmarks-CCe6CEId.mjs");
var Route$51 = createFileRoute("/benchmarks")({
	head: () => pageHead("Benchmarks — Quesar", "Configuration facts and workload notes. Not a borrowed scoreboard."),
	component: lazyRouteComponent($$splitComponentImporter$50, "component")
});
var $$splitComponentImporter$49 = () => import("./blog-wYP1CbvT.mjs");
var Route$50 = createFileRoute("/blog")({
	head: () => pageHead("Blog — MLAI", "Engineering notes from MLAI: memory, personas, privacy, and runtime discipline."),
	component: lazyRouteComponent($$splitComponentImporter$49, "component")
});
var $$splitComponentImporter$48 = () => import("./cell-machine-BkYr1BV7.mjs");
var Route$49 = createFileRoute("/cell-machine")({
	head: () => pageHead("Cell machine — research automaton", "Playable cellular automaton. Founder research, not a Quesar product surface."),
	component: lazyRouteComponent($$splitComponentImporter$48, "component")
});
var $$splitComponentImporter$47 = () => import("./changelog-Ckb1IyIb.mjs");
var Route$48 = createFileRoute("/changelog")({
	head: () => ({ meta: [{ title: "Changelog — Quesar" }, {
		name: "description",
		content: "Release history for Quesar and the MLAI stack. Presentation-layer markers aligned to documented milestones."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$47, "component")
});
var $$splitComponentImporter$46 = () => import("./companion-Dk_EUZ-L.mjs");
var Route$47 = createFileRoute("/companion")({
	head: () => pageHead("Abbey Companion — Quesar", "Native macOS SwiftUI companion for Abbey Bot. Local surface, not a hosted session."),
	component: lazyRouteComponent($$splitComponentImporter$46, "component")
});
var $$splitComponentImporter$45 = () => import("./company-GeptHc9-.mjs");
var Route$46 = createFileRoute("/company")({
	head: () => pageHead("Company — MLAI Corporation", "MLAI Corporation — Machine Learning Advanced Innovations. Origin, founder, public source, and the only approved Apple sentence."),
	component: lazyRouteComponent($$splitComponentImporter$45, "component")
});
var $$splitComponentImporter$44 = () => import("./console-CbKmvU0d.mjs");
function parseNode(value) {
	return typeof value === "string" && architectureNodes.some((node) => node.id === value) ? value : void 0;
}
var Route$45 = createFileRoute("/console")({
	validateSearch: (search) => {
		const node = parseNode(search.node);
		return node ? { node } : {};
	},
	head: () => ({ meta: [{ title: "Console — Quesar" }, {
		name: "description",
		content: "Private field notes on the Quesar architecture, scoped to your account."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$44, "component")
});
var $$splitComponentImporter$43 = () => import("./contact-u33jDTIH.mjs");
var Route$44 = createFileRoute("/contact")({
	head: () => pageHead("Contact — MLAI Corporation", "Send an inquiry about Quesar, ABI, WDBX, Abbey, or services without leaving this site."),
	component: lazyRouteComponent($$splitComponentImporter$43, "component")
});
var $$splitComponentImporter$42 = () => import("./demo-D8VrhzzC.mjs");
var Route$43 = createFileRoute("/demo")({
	head: () => pageHead("Demo — persona router", "Live illustrative persona router for Abbey, Aviva, and Abi. Not a trained classifier."),
	component: lazyRouteComponent($$splitComponentImporter$42, "component")
});
var $$splitComponentImporter$41 = () => import("./developers-Bxl0436B.mjs");
var Route$42 = createFileRoute("/developers")({
	head: () => pageHead("Source — Quesar, ABI, WDBX, Abbey", "Public GitHub for MLAI and Quesar: live repository metadata, README excerpts, local setup, verification gates, and skill-creator integrity rules."),
	component: lazyRouteComponent($$splitComponentImporter$41, "component")
});
var $$splitComponentImporter$40 = () => import("./docs-DRx94jRK.mjs");
var Route$41 = createFileRoute("/docs")({
	head: () => pageHead("Docs — Quesar, ABI, WDBX", "Documentation for Quesar and ABI: getting started, runtime, personas, WDBX, MCP, and evidence."),
	component: lazyRouteComponent($$splitComponentImporter$40, "component")
});
var $$splitComponentImporter$39 = () => import("./financial-model-DbNZCJZC.mjs");
var Route$40 = createFileRoute("/financial-model")({
	head: () => ({ meta: [{ title: "Financial model — MLAI" }, {
		name: "description",
		content: "Unit-economics targets and ARR projection. Every figure is tagged. A target is never a result."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$39, "component")
});
var $$splitComponentImporter$38 = () => import("./gama-zehnR85K.mjs");
var Route$39 = createFileRoute("/gama")({
	head: () => pageHead("Gama — founder Swift UI framework", "Gama is a modular declarative Swift UI framework. Founder-owned. Not a Quesar product claim."),
	component: lazyRouteComponent($$splitComponentImporter$38, "component")
});
var $$splitComponentImporter$37 = () => import("./get-started-B0Gb2kop.mjs");
var Route$38 = createFileRoute("/get-started")({
	head: () => pageHead("Get started — Quesar", "Start journeys for research, Abbey, mobile, and Quasar without leaving this site."),
	component: lazyRouteComponent($$splitComponentImporter$37, "component")
});
var $$splitComponentImporter$36 = () => import("./investors-B9R0dtlj.mjs");
var Route$37 = createFileRoute("/investors")({
	head: () => pageHead("Investors — MLAI Corporation", "MLAI investor notes: entity, founder evidence, and unit-economics targets. ARR and TAM figures are tagged — a target is never a result."),
	component: lazyRouteComponent($$splitComponentImporter$36, "component")
});
var $$splitComponentImporter$35 = () => import("./links-WWiwomlt.mjs");
var Route$36 = createFileRoute("/links")({
	head: () => pageHead("Links — Quesar directory", "Internal directory of Quesar pages and apps."),
	component: lazyRouteComponent($$splitComponentImporter$35, "component")
});
var $$splitComponentImporter$34 = () => import("./login-CjD3xPGU.mjs");
function parseNext(search) {
	if (typeof search.next !== "string") return {};
	return { next: safeInternalPath(search.next) };
}
var Route$35 = createFileRoute("/login")({
	validateSearch: (search) => parseNext(search),
	head: () => pageHead("Sign in — Quesar", "Sign in to the Quesar console to keep field notes on the architecture."),
	component: lazyRouteComponent($$splitComponentImporter$34, "component")
});
object({
	name: string().optional(),
	email: string().email("Enter a valid email."),
	password: string().min(8, "Password must be at least 8 characters.")
});
var $$splitComponentImporter$33 = () => import("./mobile-DXBViOhN.mjs");
var Route$34 = createFileRoute("/mobile")({
	head: () => pageHead("Mobile companion — Quesar", "Web vault orientation of the Expo mobile companion. Native CloudKit is a signed iOS build."),
	component: lazyRouteComponent($$splitComponentImporter$33, "component")
});
var $$splitComponentImporter$32 = () => import("./platform-AHoSkbnw.mjs");
var Route$33 = createFileRoute("/platform")({
	head: () => pageHead("Platform — three layers, one chip", "MLAI's platform stack: WDBX storage, ABI compute, Abbey application, and Quesar as the product envelope. Product accents and persona colors stay on separate axes."),
	component: lazyRouteComponent($$splitComponentImporter$32, "component")
});
var $$splitComponentImporter$31 = () => import("./plugins-Cg0ch_vo.mjs");
var Route$32 = createFileRoute("/plugins")({
	head: () => pageHead("Plugins — ABI", "abi-mega: skills, assets, and scripts consumed by ABI sync. Founder tooling, not a marketplace."),
	component: lazyRouteComponent($$splitComponentImporter$31, "component")
});
var $$splitComponentImporter$30 = () => import("./privacy-Fpf1hXVE.mjs");
var Route$31 = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: "Privacy — Quesar / MLAI" }, {
		name: "description",
		content: "How MLAI treats privacy as architecture: local processing, operator-owned memory, and the limits of this public website."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$30, "component")
});
var $$splitComponentImporter$29 = () => import("./products-UIhjbfaa.mjs");
var Route$30 = createFileRoute("/products")({
	head: () => pageHead("Products — Quesar, ABI, Abbey, WDBX", "Product journeys for ABI, Abbey, WDBX, and Quasar with availability and limits named."),
	component: lazyRouteComponent($$splitComponentImporter$29, "component")
});
var $$splitComponentImporter$28 = () => import("./profile-BtlV0-l7.mjs");
var Route$29 = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: "Profile — Quesar" }, {
		name: "description",
		content: "Your Quesar console profile."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$28, "component")
});
var $$splitComponentImporter$27 = () => import("./projects-Bm-aVakT.mjs");
var Route$28 = createFileRoute("/projects")({
	head: () => pageHead("Projects — MLAI", "Public project directory: ABI, WDBX, Abbey, and Gama with limits named."),
	component: lazyRouteComponent($$splitComponentImporter$27, "component")
});
var $$splitComponentImporter$26 = () => import("./quesar-DxHEbj49.mjs");
var Route$27 = createFileRoute("/quesar")({
	head: () => pageHead("Quesar — MLAI infrastructure for persistent AI", "Quesar is MLAI's infrastructure for persistent, adaptive AI systems — orchestration, private memory, and interoperable compute."),
	component: lazyRouteComponent($$splitComponentImporter$26, "component")
});
var $$splitComponentImporter$25 = () => import("./research-kDN3nWWx.mjs");
var Route$26 = createFileRoute("/research")({
	head: () => pageHead("Research — MLAI memory, retrieval, and orchestration", "Research notes for MLAI and Quesar: memory architecture, retrieval, provenance, local inference, and implementation limitations with sources attached."),
	component: lazyRouteComponent($$splitComponentImporter$25, "component")
});
var $$splitComponentImporter$24 = () => import("./security-CMnnWQvn.mjs");
var Route$25 = createFileRoute("/security")({
	head: () => ({ meta: [{ title: "Security — Quesar / MLAI" }, {
		name: "description",
		content: "Security posture for MLAI and Quesar: claim-honest language, local trust boundaries, and documented hazards."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$24, "component")
});
var $$splitComponentImporter$23 = () => import("./services-DynFh4A0.mjs");
var Route$24 = createFileRoute("/services")({
	head: () => ({ meta: [{ title: "Services — MLAI engineering" }, {
		name: "description",
		content: "MLAI engineering services: audit, design, build, and harden AI systems that need traceability, private deployment, and operational control."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$23, "component")
});
var $$splitComponentImporter$22 = () => import("./showcase-bLlmgMrG.mjs");
var Route$23 = createFileRoute("/showcase")({
	head: () => pageHead("Showcase — Quesar", "Quesar showcase: trailer, film, explainer, design lab, Abbey, mega board."),
	component: lazyRouteComponent($$splitComponentImporter$22, "component")
});
var $$splitComponentImporter$21 = () => import("./signup-KwK09_Lk.mjs");
var Route$22 = createFileRoute("/signup")({
	head: () => ({ meta: [{ title: "Sign up — Quesar" }, {
		name: "description",
		content: "Create a Quesar console account for field notes."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$21, "component")
});
var $$splitComponentImporter$20 = () => import("./skill-creator-46U63WJM.mjs");
var Route$21 = createFileRoute("/skill-creator")({
	head: () => pageHead("skill-creator — MLAI", "Public agent skill for creating skills and shipping the company site without breaking integrity rules."),
	component: lazyRouteComponent($$splitComponentImporter$20, "component")
});
var $$splitComponentImporter$19 = () => import("./source-Cp6f_Nmo.mjs");
var Route$20 = createFileRoute("/source")({
	head: () => pageHead("Source — MLAI public tree", "In-site catalog of public MLAI repositories. Each name opens a page here."),
	component: lazyRouteComponent($$splitComponentImporter$19, "component")
});
var $$splitComponentImporter$18 = () => import("./team-GXUmMwbF.mjs");
var Route$19 = createFileRoute("/team")({
	head: () => pageHead("Team — MLAI", "MLAI team: founder and systems architect Donald Filimon."),
	component: lazyRouteComponent($$splitComponentImporter$18, "component")
});
var $$splitComponentImporter$17 = () => import("./terms-VnQcE9WK.mjs");
var Route$18 = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: "Terms — MLAI" }, {
		name: "description",
		content: "Terms of use for the public Quesar orientation site."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
var $$splitComponentImporter$16 = () => import("./tf-pose-demo-DBiSIrF7.mjs");
var Route$17 = createFileRoute("/tf-pose-demo")({
	head: () => ({ meta: [{ title: "Pose demo — Quesar" }, {
		name: "description",
		content: "Browser pose orientation. Illustrative skeleton, not a production vision stack."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./wdbx-s3ouLS7q.mjs");
var Route$16 = createFileRoute("/wdbx")({
	head: () => pageHead("WDBX — Provenance-aware memory substrate", "WDBX is MLAI's provenance-aware episodic substrate: durable records, vector retrieval, causal history, and inspectable evidence beneath ABI."),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./workspace-CX1K4_o7.mjs");
var Route$15 = createFileRoute("/workspace")({
	head: () => pageHead("Abbey workspace — Quesar", "In-browser Abbey document workspace. The shipping app uses SQLite, a Python worker, and an optional local model."),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./blog._slug-2FcA6fs1.mjs");
var Route$14 = createFileRoute("/blog/$slug")({
	beforeLoad: ({ params }) => {
		if (!blog.some((item) => item.slug === params.slug)) throw notFound();
	},
	head: ({ params }) => {
		const post = blog.find((item) => item.slug === params.slug);
		return pageHead(`${post?.title ?? "Note"} — Blog`, post?.excerpt ?? "MLAI engineering note.");
	},
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./console.workspace-BNxdTxtl.mjs");
var Route$13 = createFileRoute("/console/workspace")({
	head: () => ({ meta: [{ title: "Console workspace — Quesar" }, {
		name: "description",
		content: "Signed-in document workspace orientation inside the Quesar console."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./docs._slug-BL4d8sPz.mjs");
var Route$12 = createFileRoute("/docs/$slug")({
	beforeLoad: ({ params }) => {
		const resolved = params.slug === "intro" ? "getting-started" : params.slug;
		if (!docs.some((item) => item.slug === resolved)) throw notFound();
	},
	head: ({ params }) => {
		const resolved = params.slug === "intro" ? "getting-started" : params.slug;
		const doc = docs.find((item) => item.slug === resolved);
		return pageHead(`${doc?.title ?? "Doc"} — Docs`, doc?.description ?? "Quesar documentation.");
	},
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./products._slug-DFB4PfGb.mjs");
var Route$11 = createFileRoute("/products/$slug")({
	beforeLoad: ({ params }) => {
		if (!products.some((item) => item.slug === params.slug)) throw notFound();
	},
	head: ({ params }) => {
		const product = products.find((item) => item.slug === params.slug);
		return pageHead(`${product?.name ?? "Product"} — Quesar`, product?.intro ?? "Quesar product.");
	},
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./projects._slug-BKnOrpZm.mjs");
var Route$10 = createFileRoute("/projects/$slug")({
	beforeLoad: ({ params }) => {
		if (!projects.some((item) => item.slug === params.slug)) throw notFound();
	},
	head: ({ params }) => {
		const project = projects.find((item) => item.slug === params.slug);
		return pageHead(`${project?.name ?? "Project"} — MLAI`, project?.description ?? "MLAI project.");
	},
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./research._slug-boAn7c2o.mjs");
var Route$9 = createFileRoute("/research/$slug")({
	beforeLoad: ({ params }) => {
		if (!research.publications.some((item) => item.slug === params.slug)) throw notFound();
	},
	head: ({ params }) => {
		const paper = research.publications.find((item) => item.slug === params.slug);
		return pageHead(`${paper?.title ?? "Research"} — MLAI`, paper?.abstract ?? "MLAI research note.");
	},
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./showcase.abbey-W4kroD4R.mjs");
var Route$8 = createFileRoute("/showcase/abbey")({
	head: () => pageHead("Abbey — Showcase", "Companion stills and persona language."),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./showcase.design-W224gvSo.mjs");
var Route$7 = createFileRoute("/showcase/design")({
	head: () => pageHead("Design lab — Showcase", "Quesar tokens, type, and mark."),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./showcase.explainer-CdJD6Pao.mjs");
var Route$6 = createFileRoute("/showcase/explainer")({
	head: () => pageHead("Explainer — Showcase", "Three layers on one chip: WDBX, ABI, Abbey."),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./showcase.film-BIDzztkZ.mjs");
var Route$5 = createFileRoute("/showcase/film")({
	head: () => pageHead("Film — Showcase", "Quesar atmosphere film. Not a benchmark."),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./showcase.mega-bCqDlynb.mjs");
var Route$4 = createFileRoute("/showcase/mega")({
	head: () => pageHead("Mega — Showcase", "Full Quesar orientation board."),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./showcase.trailer-zdeEmBHC.mjs");
var Route$3 = createFileRoute("/showcase/trailer")({
	head: () => pageHead("Trailer — Showcase", "Quesar trailer, played on this site."),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./source._name-BYN2AQCh.mjs");
var Route$2 = createFileRoute("/source/$name")({
	head: ({ params }) => {
		const name = params.name;
		const doc = repoDocs[name] ?? repoDocs[name.toLowerCase()];
		return pageHead(`${doc?.title ?? name} — Source`, doc?.lede ?? `Public repository ${name}, described on this site.`);
	},
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./team._slug-CZRhMOyO.mjs");
var Route$1 = createFileRoute("/team/$slug")({
	beforeLoad: ({ params }) => {
		if (!team.some((item) => item.slug === params.slug)) throw notFound();
	},
	head: ({ params }) => {
		const person = team.find((item) => item.slug === params.slug);
		return pageHead(`${person?.name ?? "Team"} — MLAI`, person?.tagline ?? person?.bio ?? "MLAI team.");
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var Route = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var IndexRoute = Route$58.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$59
});
var AbbeyRoute = Route$57.update({
	id: "/abbey",
	path: "/abbey",
	getParentRoute: () => Route$59
});
var AbbeyBotRoute = Route$56.update({
	id: "/abbey-bot",
	path: "/abbey-bot",
	getParentRoute: () => Route$59
});
var AbiRoute = Route$55.update({
	id: "/abi",
	path: "/abi",
	getParentRoute: () => Route$59
});
var AboutRoute = Route$54.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => Route$59
});
var AppsRoute = Route$53.update({
	id: "/apps",
	path: "/apps",
	getParentRoute: () => Route$59
});
var ArchitectureRoute = Route$52.update({
	id: "/architecture",
	path: "/architecture",
	getParentRoute: () => Route$59
});
var BenchmarksRoute = Route$51.update({
	id: "/benchmarks",
	path: "/benchmarks",
	getParentRoute: () => Route$59
});
var BlogRoute = Route$50.update({
	id: "/blog",
	path: "/blog",
	getParentRoute: () => Route$59
});
var CellMachineRoute = Route$49.update({
	id: "/cell-machine",
	path: "/cell-machine",
	getParentRoute: () => Route$59
});
var ChangelogRoute = Route$48.update({
	id: "/changelog",
	path: "/changelog",
	getParentRoute: () => Route$59
});
var CompanionRoute = Route$47.update({
	id: "/companion",
	path: "/companion",
	getParentRoute: () => Route$59
});
var CompanyRoute = Route$46.update({
	id: "/company",
	path: "/company",
	getParentRoute: () => Route$59
});
var ConsoleRoute = Route$45.update({
	id: "/console",
	path: "/console",
	getParentRoute: () => Route$59
});
var ContactRoute = Route$44.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => Route$59
});
var DemoRoute = Route$43.update({
	id: "/demo",
	path: "/demo",
	getParentRoute: () => Route$59
});
var DevelopersRoute = Route$42.update({
	id: "/developers",
	path: "/developers",
	getParentRoute: () => Route$59
});
var DocsRoute = Route$41.update({
	id: "/docs",
	path: "/docs",
	getParentRoute: () => Route$59
});
var FinancialModelRoute = Route$40.update({
	id: "/financial-model",
	path: "/financial-model",
	getParentRoute: () => Route$59
});
var GamaRoute = Route$39.update({
	id: "/gama",
	path: "/gama",
	getParentRoute: () => Route$59
});
var GetStartedRoute = Route$38.update({
	id: "/get-started",
	path: "/get-started",
	getParentRoute: () => Route$59
});
var InvestorsRoute = Route$37.update({
	id: "/investors",
	path: "/investors",
	getParentRoute: () => Route$59
});
var LinksRoute = Route$36.update({
	id: "/links",
	path: "/links",
	getParentRoute: () => Route$59
});
var LoginRoute = Route$35.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$59
});
var MobileRoute = Route$34.update({
	id: "/mobile",
	path: "/mobile",
	getParentRoute: () => Route$59
});
var PlatformRoute = Route$33.update({
	id: "/platform",
	path: "/platform",
	getParentRoute: () => Route$59
});
var PluginsRoute = Route$32.update({
	id: "/plugins",
	path: "/plugins",
	getParentRoute: () => Route$59
});
var PrivacyRoute = Route$31.update({
	id: "/privacy",
	path: "/privacy",
	getParentRoute: () => Route$59
});
var ProductsRoute = Route$30.update({
	id: "/products",
	path: "/products",
	getParentRoute: () => Route$59
});
var ProfileRoute = Route$29.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$59
});
var ProjectsRoute = Route$28.update({
	id: "/projects",
	path: "/projects",
	getParentRoute: () => Route$59
});
var QuesarRoute = Route$27.update({
	id: "/quesar",
	path: "/quesar",
	getParentRoute: () => Route$59
});
var ResearchRoute = Route$26.update({
	id: "/research",
	path: "/research",
	getParentRoute: () => Route$59
});
var SecurityRoute = Route$25.update({
	id: "/security",
	path: "/security",
	getParentRoute: () => Route$59
});
var ServicesRoute = Route$24.update({
	id: "/services",
	path: "/services",
	getParentRoute: () => Route$59
});
var ShowcaseRoute = Route$23.update({
	id: "/showcase",
	path: "/showcase",
	getParentRoute: () => Route$59
});
var SignupRoute = Route$22.update({
	id: "/signup",
	path: "/signup",
	getParentRoute: () => Route$59
});
var SkillCreatorRoute = Route$21.update({
	id: "/skill-creator",
	path: "/skill-creator",
	getParentRoute: () => Route$59
});
var SourceRoute = Route$20.update({
	id: "/source",
	path: "/source",
	getParentRoute: () => Route$59
});
var TeamRoute = Route$19.update({
	id: "/team",
	path: "/team",
	getParentRoute: () => Route$59
});
var TermsRoute = Route$18.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => Route$59
});
var TfPoseDemoRoute = Route$17.update({
	id: "/tf-pose-demo",
	path: "/tf-pose-demo",
	getParentRoute: () => Route$59
});
var WdbxRoute = Route$16.update({
	id: "/wdbx",
	path: "/wdbx",
	getParentRoute: () => Route$59
});
var WorkspaceRoute = Route$15.update({
	id: "/workspace",
	path: "/workspace",
	getParentRoute: () => Route$59
});
var BlogSlugRoute = Route$14.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => BlogRoute
});
var ConsoleWorkspaceRoute = Route$13.update({
	id: "/workspace",
	path: "/workspace",
	getParentRoute: () => ConsoleRoute
});
var DocsSlugRoute = Route$12.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => DocsRoute
});
var ProductsSlugRoute = Route$11.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => ProductsRoute
});
var ProjectsSlugRoute = Route$10.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => ProjectsRoute
});
var ResearchSlugRoute = Route$9.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => ResearchRoute
});
var ShowcaseAbbeyRoute = Route$8.update({
	id: "/abbey",
	path: "/abbey",
	getParentRoute: () => ShowcaseRoute
});
var ShowcaseDesignRoute = Route$7.update({
	id: "/design",
	path: "/design",
	getParentRoute: () => ShowcaseRoute
});
var ShowcaseExplainerRoute = Route$6.update({
	id: "/explainer",
	path: "/explainer",
	getParentRoute: () => ShowcaseRoute
});
var ShowcaseFilmRoute = Route$5.update({
	id: "/film",
	path: "/film",
	getParentRoute: () => ShowcaseRoute
});
var ShowcaseMegaRoute = Route$4.update({
	id: "/mega",
	path: "/mega",
	getParentRoute: () => ShowcaseRoute
});
var ShowcaseTrailerRoute = Route$3.update({
	id: "/trailer",
	path: "/trailer",
	getParentRoute: () => ShowcaseRoute
});
var SourceNameRoute = Route$2.update({
	id: "/$name",
	path: "/$name",
	getParentRoute: () => SourceRoute
});
var TeamSlugRoute = Route$1.update({
	id: "/$slug",
	path: "/$slug",
	getParentRoute: () => TeamRoute
});
var ApiAuthSplatRoute = Route.update({
	id: "/api/auth/$",
	path: "/api/auth/$",
	getParentRoute: () => Route$59
});
var BlogRouteChildren = { BlogSlugRoute };
var BlogRouteWithChildren = BlogRoute._addFileChildren(BlogRouteChildren);
var ConsoleRouteChildren = { ConsoleWorkspaceRoute };
var ConsoleRouteWithChildren = ConsoleRoute._addFileChildren(ConsoleRouteChildren);
var DocsRouteChildren = { DocsSlugRoute };
var DocsRouteWithChildren = DocsRoute._addFileChildren(DocsRouteChildren);
var ProductsRouteChildren = { ProductsSlugRoute };
var ProductsRouteWithChildren = ProductsRoute._addFileChildren(ProductsRouteChildren);
var ProjectsRouteChildren = { ProjectsSlugRoute };
var ProjectsRouteWithChildren = ProjectsRoute._addFileChildren(ProjectsRouteChildren);
var ResearchRouteChildren = { ResearchSlugRoute };
var ResearchRouteWithChildren = ResearchRoute._addFileChildren(ResearchRouteChildren);
var ShowcaseRouteChildren = {
	ShowcaseAbbeyRoute,
	ShowcaseDesignRoute,
	ShowcaseExplainerRoute,
	ShowcaseFilmRoute,
	ShowcaseMegaRoute,
	ShowcaseTrailerRoute
};
var ShowcaseRouteWithChildren = ShowcaseRoute._addFileChildren(ShowcaseRouteChildren);
var SourceRouteChildren = { SourceNameRoute };
var SourceRouteWithChildren = SourceRoute._addFileChildren(SourceRouteChildren);
var TeamRouteChildren = { TeamSlugRoute };
var rootRouteChildren = {
	IndexRoute,
	AbbeyRoute,
	AbbeyBotRoute,
	AbiRoute,
	AboutRoute,
	AppsRoute,
	ArchitectureRoute,
	BenchmarksRoute,
	BlogRoute: BlogRouteWithChildren,
	CellMachineRoute,
	ChangelogRoute,
	CompanionRoute,
	CompanyRoute,
	ConsoleRoute: ConsoleRouteWithChildren,
	ContactRoute,
	DemoRoute,
	DevelopersRoute,
	DocsRoute: DocsRouteWithChildren,
	FinancialModelRoute,
	GamaRoute,
	GetStartedRoute,
	InvestorsRoute,
	LinksRoute,
	LoginRoute,
	MobileRoute,
	PlatformRoute,
	PluginsRoute,
	PrivacyRoute,
	ProductsRoute: ProductsRouteWithChildren,
	ProfileRoute,
	ProjectsRoute: ProjectsRouteWithChildren,
	QuesarRoute,
	ResearchRoute: ResearchRouteWithChildren,
	SecurityRoute,
	ServicesRoute,
	ShowcaseRoute: ShowcaseRouteWithChildren,
	SignupRoute,
	SkillCreatorRoute,
	SourceRoute: SourceRouteWithChildren,
	TeamRoute: TeamRoute._addFileChildren(TeamRouteChildren),
	TermsRoute,
	TfPoseDemoRoute,
	WdbxRoute,
	WorkspaceRoute,
	ApiAuthSplatRoute
};
var routeTree = Route$59._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent,
		defaultNotFoundComponent: AppNotFoundComponent,
		defaultPreload: "intent",
		scrollRestoration: true
	});
}
//#endregion
export { integrationApps as $, productJourneys as A, abbeyWorkspaceFacts as B, pathForRepo as C, docs as D, projects as E, useCurrentUserState as F, architectureNodes as G, abiCrates as H, cn as I, engagement as J, architectureSteps as K, abbeyCommands as L, team as M, blog as N, ChangelogSchema as O, research as P, homeStart as Q, abbeyLedger as R, isExternal as S, repoPaths as T, abiDuties as U, abiCli as V, abiNotClaimed as W, homePrivacy as X, faqs as Y, homeProposition as Z, ProvTag as _, site as _t, Route$10 as a, personas as at, frozenCli as b, wdbxCrates as bt, Route$14 as c, quesarWhat as ct, Route$52 as d, researchSources as dt, integrityRules as et, RedirectToSignIn as f, researchTopics as ft, ProvLegend as g, showcaseRooms as gt, Logo as h, setups as ht, Route$9 as i, mcpTools as it, startJourneys as j, products as k, Route$35 as l, refusals as lt, SignedOut as m, services as mt, Route$1 as n, layerCopy as nt, Route$11 as o, products$1 as ot, SignedIn as p, searchIndex as pt, companionPersonas as q, Route$2 as r, layers as rt, Route$12 as s, quesarSurfaces as st, router_exports as t, investor as tt, Route$45 as u, repos as ut, Hint as v, statusCopy as vt, repoDocs as w, internalHref as x, wdbxSpecs as xt, appSurfaces as y, wdbxCapabilities as yt, abbeyWorkflow as z };
