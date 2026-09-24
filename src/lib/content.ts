import type { Provenance } from "@/components/site/prov-tag";

export type StatusKind =
  "current" | "partial" | "experimental" | "development" | "planned" | "research";

/** Shown in place of field-note prompts on the static site, which has no server. */
export const fieldNotesOffline = "Field notes need the server deployment.";

export type RepoKind = "core" | "surface" | "skill" | "related";

export type ArchLayer = "experience" | "runtime" | "memory" | "compute";

export type ArchNode = {
  id: string;
  name: string;
  layer: ArchLayer;
  status: StatusKind;
  summary: string;
  detail: string;
  implemented: string[];
  notClaimed: string[];
  href?: string;
};

export const site = {
  name: "Quesar",
  company: "MLAI",
  legal: "Machine Learning Advanced Innovations, Inc.",
  description:
    "Quesar is MLAI's infrastructure for persistent, adaptive AI — inspectable orchestration, provenance-aware memory, and compute that stays on machines you own.",
  mission:
    "Build assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries.",
  origin:
    "Three voices, not one: Abbey for care, Aviva for clarity, Abi for competence. One substrate. Yours alone.",
  apple:
    "MLAI software is independent and is not affiliated with, endorsed by, or sponsored by Apple Inc.",
} as const;

export const nav = [
  { to: "/quesar", label: "Quesar" },
  { to: "/platform", label: "Platform" },
  { to: "/docs", label: "Docs" },
  { to: "/apps", label: "Apps" },
  { to: "/company", label: "Company" },
] as const;

export const statusCopy: Record<StatusKind, { mark: string; label: string; meaning: string }> = {
  current: {
    mark: "●",
    label: "Current",
    meaning: "Present in public source and used as described.",
  },
  partial: {
    mark: "◐",
    label: "Partial",
    meaning: "Implemented in part. Scope is named on the page.",
  },
  experimental: {
    mark: "◌",
    label: "Experimental",
    meaning: "Runnable or inspectable, not a product claim.",
  },
  development: {
    mark: "◦",
    label: "In development",
    meaning: "Actively changing. Do not treat as stable.",
  },
  planned: { mark: "○", label: "Planned", meaning: "Intent. Never presented as shipping." },
  research: {
    mark: "◆",
    label: "Research",
    meaning: "Founder or lab work. Not a Quesar product surface.",
  },
};

export const integrationApps = [
  {
    path: "src/",
    href: "/",
    purpose:
      "The one app: TanStack Start site, console, admin, workspace, demos, Quasar screens, and cinematic showcase",
    gate: "bun run typecheck && bun run lint && bun run test && bun run build",
    status: "current" as StatusKind,
  },
  {
    path: "migrations/",
    href: "/security",
    purpose:
      "Postgres schema (Neon, or in-memory PGLite without DATABASE_URL): auth, notes, audits, connectors, rate limits",
    gate: "bun run build (applies migrations)",
    status: "current" as StatusKind,
  },
  {
    path: "sidecars/quasar-service/",
    href: "/quasar/sites",
    purpose:
      "Local AI site-builder service (Bun, port 4700) that the /quasar screens drive; run it yourself, never hosted",
    gate: "bun test",
    status: "experimental" as StatusKind,
  },
  {
    path: "sidecars/python-worker/",
    href: "/workspace",
    purpose:
      "Optional local document extraction and embeddings worker, reached by URL, never spawned",
    gate: "uv run pytest",
    status: "experimental" as StatusKind,
  },
  {
    path: "native/",
    href: "/mobile",
    purpose:
      "Capacitor shell that loads the deployed site; Android project and CloudKit plugin, iOS blocked on CocoaPods",
    gate: "not gated (no Capacitor build on this machine)",
    status: "partial" as StatusKind,
  },
  {
    path: "notes/",
    href: "/docs",
    purpose:
      "Merge spec, plan and gap matrix, plus the pre-merge MLAI records under notes/mlai/ (docs/ holds the built static site)",
    gate: "reviewed, not built",
    status: "current" as StatusKind,
  },
] as const;

export const integrityRules = [
  {
    title: "Apple sentence",
    body: "The only approved Apple sentence is the one on this site. Do not invent affiliation, endorsement, or silicon partnership.",
  },
  {
    title: "Provenance tags",
    body: "Figures are measured, target, or reported. A target is never a result. Missing a tag is a defect.",
  },
  {
    title: "Apache-2.0",
    body: "Core runtimes ship Apache-2.0. Do not relicense by implication or copy a proprietary notice onto public crates.",
  },
  {
    title: "Toolchain facts",
    body: "ABI is nightly Rust. Follow each repository README. Do not mix Zig-era claims into the current tree.",
  },
  {
    title: "WDBX unexpanded",
    body: "Do not invent recall, QPS, or latency numbers. Graph defaults are configuration, not a scoreboard.",
  },
  {
    title: "No borrowed benchmarks",
    body: "If a number is not in the public skill-creator master reference or a named source artifact, it does not ship.",
  },
] as const;

export const faqs = [
  {
    q: "Does this website host Abbey?",
    a: "No. This site orients and offers a signed-in console for field notes. The Abbey workspace, Quasar builder, and mobile vault on this site are in-browser orientations of local apps — they do not provision a hosted session.",
  },
  {
    q: "Is Quesar a chatbot?",
    a: "No. Quesar is infrastructure: ABI orchestration, WDBX memory, Abbey as the companion experience. Chat is one interface, not the product.",
  },
  {
    q: "Can it run privately?",
    a: "Yes. Default posture is operator-owned machines. VPC, on-premise, hybrid, and offline-first paths are the design. Remote providers are optional and credential-gated.",
  },
  {
    q: "Do you replace existing models?",
    a: "Usually no. Quesar sits around providers or self-hosted models: routing, retrieval, evaluation, and policy. Local template completion does not establish foundation-model quality.",
  },
  {
    q: "Where is the source?",
    a: "On this site. Product pages, /source/:name, docs, and research carry the public tree. GitHub is the backing store — you do not need to leave to read it.",
  },
  {
    q: "What do the status labels mean?",
    a: "Current, Partial, Experimental, In development, Planned, and Research are not interchangeable. Planned is never shipping. Research is not a Quesar product claim.",
  },
] as const;

export const wdbxSpecs = [
  { k: "Engine", v: "Layered HNSW" },
  { k: "Concurrency", v: "MVCC" },
  { k: "M", v: "16" },
  { k: "efConstruction", v: "40" },
  { k: "efSearch", v: "32" },
  { k: "Metric", v: "Cosine" },
  { k: "Addressing", v: "Content-addressed" },
  { k: "Sharding", v: "Not established" },
] as const;

export const wdbxCrates = [
  { name: "abi-wdbx", body: "Episodic store, HNSW graph, query path, and persistence contracts." },
  {
    name: "abi-compute",
    body: "CPU vector ops and optional macOS Metal DOT. CUDA/Vulkan not linked here.",
  },
  { name: "abi-foundation", body: "Shared primitives: identifiers, hashing, time, error types." },
  { name: "abi-core", body: "Episode types, witness encoding, causal DAG helpers." },
  {
    name: "abi-telemetry",
    body: "Local traces and capability reporting. Not a hosted metrics product.",
  },
] as const;

export const abiCrates = [
  { name: "abi-cli", body: "Operator surface. backends, scheduler, dashboard, plugin, wdbx." },
  { name: "abi-mcp", body: "JSON-RPC 2.0 over stdio, optional loopback HTTP with bearer auth." },
  {
    name: "abi-ai",
    body: "Exact model registry and template completion. Quality is not inferred.",
  },
  { name: "abi-sea", body: "Scheduler and execution adapter. Device selection is explicit." },
  {
    name: "abi-gpu",
    body: "Capability reporting. accelerated=false when native kernels are not linked.",
  },
] as const;

export const mcpTools = [
  { name: "ai_learn", body: "Ingest a record into the local store. Persistence can be disabled." },
  { name: "ai_complete", body: "Template completion against the exact registry model." },
  { name: "wdbx_query", body: "Nearest-neighbor retrieval with inspectable hits." },
  { name: "wdbx_stats", body: "Local store statistics. Not a cluster dashboard." },
  { name: "gpu_status", body: "Honest device report. Fallback is reported as fallback." },
  { name: "plugin_list", body: "Contract-covered plugins visible to this process." },
] as const;

export const abiCli = [
  {
    cmd: "abi backends",
    note: "List configured execution backends and what they actually report.",
  },
  { cmd: "abi scheduler status", note: "Scheduler health for this process. Not a fleet view." },
  { cmd: "abi dashboard --once --plain", note: "One-shot text dashboard. No hosted UI implied." },
  { cmd: "abi plugin list", note: "Plugins the current binary loaded under contract." },
  { cmd: "abi wdbx query", note: "Retrieve from the local store. Requires the sibling workspace." },
] as const;

export const abbeyCommands = [
  { cmd: "abbey claims", note: "Print the claims ledger. This is the source of status language." },
  { cmd: "abbey memory search", note: "Search local memory. Default store is SQLite." },
  { cmd: "abbey persona", note: "Show the active persona and the last routing reason." },
  { cmd: "abbey workflow", note: "Executable workflow ledger: goals, done, open, blocked." },
] as const;

export const abbeyLedger = {
  current: 18,
  partial: 11,
  proposed: 9,
  blocked: 4,
  outOfScope: 7,
  source: "abbey/src/claims.rs",
  schema: "claims-v1",
  digest: "reported from public tree — re-hash locally before citing",
  toolchain: "Rust nightly via repo wrappers",
  backends: ["SQLite (default)", "WDBX (opt-in feature flag)"],
} as const;

export const abbeyWorkflow = {
  goals: 12,
  done: 6,
  checked: 14,
  open: 8,
  inProgress: 3,
  proposed: 5,
  blocked: 2,
  source: "abbey workflow ledger",
} as const;

export const layers = [
  {
    id: "wdbx",
    name: "WDBX",
    layer: "Storage",
    href: "/wdbx",
    accent: "wdbx" as const,
    body: "Episodic substrate: durable records, vector retrieval, causal history, inspectable evidence.",
  },
  {
    id: "abi",
    name: "ABI",
    layer: "Compute",
    href: "/abi",
    accent: "abi" as const,
    body: "Orchestration: routing, context assembly, tools, honest capability reporting.",
  },
  {
    id: "abbey",
    name: "Abbey",
    layer: "Application",
    href: "/abbey",
    accent: "abbey" as const,
    body: "Companion experience: personas, claims ledger, local workspace.",
  },
  {
    id: "quesar",
    name: "Quesar",
    layer: "Product",
    href: "/quesar",
    accent: "accent" as const,
    body: "The envelope that makes the relationships obvious. Not a hosted brain.",
  },
] as const;

export const layerCopy: Record<ArchLayer, string> = {
  experience: "Experience — user, Quesar, output",
  runtime: "Runtime — ABI, tools, router, context",
  memory: "Memory — WDBX, episodes, embeddings, provenance",
  compute: "Compute — local or explicit remote",
};

export const architectureNodes: ArchNode[] = [
  {
    id: "user",
    name: "You",
    layer: "experience",
    status: "current",
    summary: "Operator on a machine you own.",
    detail:
      "A local workspace, CLI, companion, or this website issues a request. This site does not become the runtime.",
    implemented: ["Local orientation", "Signed-in field console", "In-browser app surfaces"],
    notClaimed: ["Hosted Abbey sessions", "Cloud-provisioned identity as the product"],
    href: "/apps",
  },
  {
    id: "quesar",
    name: "Quesar",
    layer: "experience",
    status: "partial",
    summary: "Product envelope around the stack.",
    detail:
      "Quesar names the relationships: Abbey on ABI on WDBX. Public orientation is current. Hosted assistants are not.",
    implemented: ["Public site", "Architecture map", "Status language"],
    notClaimed: ["A hosted Quesar HTTP API", "Client SDKs for third-party SaaS"],
    href: "/quesar",
  },
  {
    id: "abi",
    name: "ABI",
    layer: "runtime",
    status: "current",
    summary: "Nightly Rust orchestration.",
    detail:
      "Routes requests, assembles inspectable context, coordinates tools. Requires the sibling WDBX workspace.",
    implemented: ["CLI wrappers", "MCP stdio", "Exact model registry"],
    notClaimed: ["Foundation-model quality from template completion", "Zig tree (removed)"],
    href: "/abi",
  },
  {
    id: "tools",
    name: "Tools",
    layer: "runtime",
    status: "partial",
    summary: "Contract-covered plugins and MCP tools.",
    detail:
      "Twelve contract-covered MCP tools including wdbx_query and gpu_status. Persistent HTTP+SSE is not claimed.",
    implemented: ["stdio MCP", "Optional loopback HTTP with bearer auth"],
    notClaimed: ["A hosted plugin marketplace", "Unauthenticated internet exposure"],
    href: "/plugins",
  },
  {
    id: "router",
    name: "Model router",
    layer: "runtime",
    status: "partial",
    summary: "Exact registry, explicit device.",
    detail:
      "An exact registry model and device are selected. Routing is a trace event, not a guess.",
    implemented: ["Deterministic local routing", "Persona blend coefficient (design)"],
    notClaimed: ["A trained classifier as product evidence", "Guaranteed multi-provider SLA"],
    href: "/demo",
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
    href: "/abi",
  },
  {
    id: "wdbx",
    name: "WDBX",
    layer: "memory",
    status: "current",
    summary: "Episodic substrate.",
    detail:
      "Durable records, embeddings, provenance. Retrieval can return what happened and why a record is trusted.",
    implemented: ["Layered HNSW", "MVCC", "Content addressing"],
    notClaimed: ["Production sharding", "Evidence-weighted retrieval as current"],
    href: "/wdbx",
  },
  {
    id: "memory",
    name: "Episodes",
    layer: "memory",
    status: "current",
    summary: "Signed, content-addressed records.",
    detail:
      "WAL, causal DAGs, witness encoding. Persistence that did not happen is not reported as success.",
    implemented: ["Episode store", "CBOR witness encoder agreement on golden vectors"],
    notClaimed: ["Memory as sentience", "Automatic cross-device federation"],
    href: "/wdbx",
  },
  {
    id: "embed",
    name: "Embeddings",
    layer: "memory",
    status: "partial",
    summary: "Vectors with a contract.",
    detail:
      "Ordered vector search and hybrid ranking contracts exist. Collapsing every signal into one score is a documented limitation.",
    implemented: ["Cosine search", "Graph construction parameters as configuration"],
    notClaimed: ["A published recall/QPS scoreboard", "Cross-encoder rerank as current"],
    href: "/research",
  },
  {
    id: "provenance",
    name: "Provenance",
    layer: "memory",
    status: "partial",
    summary: "Why this record is trusted.",
    detail:
      "Signatures and causal history answer why a record is trusted. They do not make the record true.",
    implemented: ["Content addressing", "Causal history"],
    notClaimed: [
      "Federation evidence without separate authorization",
      "Truth of stored statements",
    ],
    href: "/research",
  },
  {
    id: "compute",
    name: "Compute",
    layer: "compute",
    status: "partial",
    summary: "Local unless you send it.",
    detail:
      "CPU vector ops and optional macOS Metal DOT. CUDA and Vulkan dispatch are not linked in this implementation.",
    implemented: ["CPU backends", "Honest gpu_status"],
    notClaimed: ["Blanket GPU acceleration", "A 295× figure as a measured result"],
    href: "/platform",
  },
  {
    id: "output",
    name: "Output",
    layer: "experience",
    status: "current",
    summary: "A response with a trace.",
    detail:
      "What you see is bound to a routing reason, a context pack, and whatever the ledger can prove.",
    implemented: ["Claims language", "Field notes console", "In-browser demos"],
    notClaimed: ["Ungrounded fluency as evidence", "Unlimited capability"],
  },
];

export const investor = {
  entity: "Delaware C-Corp · Machine Learning Advanced Innovations, Inc.",
  market: [
    {
      k: "TAM",
      v: "$48B",
      note: "On-device and private AI infrastructure. Category sizing, not a booking.",
      tag: "target" as Provenance,
    },
    {
      k: "SAM",
      v: "$12B",
      note: "Regulated software, research ops, and security-conscious product teams.",
      tag: "target" as Provenance,
    },
    {
      k: "SOM",
      v: "$1.2B",
      note: "Near-term reachable: SDK licensing plus integration services.",
      tag: "target" as Provenance,
    },
  ],
  raise: { round: "Seed", amount: "$4.5M" },
  funds: [
    { k: "Product", v: "50%", p: "ABI, WDBX, Abbey, Quesar" },
    { k: "Infrastructure", v: "30%", p: "Tooling, eval, private deploy paths" },
    { k: "GTM", v: "20%", p: "Services motion, not ads" },
  ],
  unit: [
    { k: "Gross margin", v: "82% target", tag: "target" as Provenance },
    { k: "CAC payback", v: "11 months target", tag: "target" as Provenance },
    { k: "LTV/CAC", v: "5.4× target", tag: "target" as Provenance },
    { k: "GPU 295×", v: "engineering target — not a result", tag: "target" as Provenance },
  ],
  arr: [
    { year: "Y1", v: "0.4" },
    { year: "Y2", v: "1.8" },
    { year: "Y3", v: "6.5" },
    { year: "Y4", v: "18" },
    { year: "Y5", v: "42" },
  ],
  founder: [
    {
      k: "Public source across ABI, WDBX, Abbey, Gama, and this site",
      tag: "measured" as Provenance,
    },
    { k: "Claims ledger in abbey/src/claims.rs", tag: "measured" as Provenance },
    { k: "Independent verification gates per app", tag: "measured" as Provenance },
    { k: "295× GPU figure", tag: "target" as Provenance },
  ],
} as const;

export const setups = [
  {
    title: "Website (this surface)",
    body: "From this repository root: formatting, types, lint, tests, and the server build. Publish the static site with a separate build.",
    code: "bun run check\nbun run build:static",
    href: "/docs/deployment",
  },
  {
    title: "Abbey workspace",
    body: "The browser workspace here is a preview. The separate local Abbey app has its own setup and verification in its source README.",
    code: null,
    href: "/workspace",
  },
  {
    title: "Quasar service",
    body: "A standalone Bun project under sidecars/. Its tests and typecheck do not run in the website gate. Generation needs Anthropic credentials.",
    code: "cd sidecars/quasar-service\nbun test\nbun run typecheck",
    href: "/quesar",
  },
  {
    title: "Mobile and native",
    body: "The web vault is a browser preview. The separate native shell has no root check script; Android sync and device validation are separate work.",
    code: null,
    href: "/mobile",
  },
  {
    title: "ABI + WDBX",
    body: "Clone both. Use ./tools/cargo.sh. Bare cargo is the wrong entry.",
    code: "./tools/check.sh",
    href: "/abi",
  },
] as const;

export type Repo = {
  owner: string;
  name: string;
  /** Local copy; shown when GitHub has no description or `pinnedSummary` is set. */
  summary: string;
  language: string;
  /** A site route, or an absolute URL that is linked as-is. */
  href: string;
  kind: RepoKind;
  /** Card label that overrides GitHub's own archived flag. */
  badge?: "archived" | "port source";
  /** Prefer `summary` over the live GitHub description. */
  pinnedSummary?: true;
};

export const repos: readonly Repo[] = [
  {
    owner: "donaldfilimon",
    name: "quesar.cloud",
    summary:
      "Current MLAI/Quesar website, public docs, browser previews, and local service clients.",
    language: "TypeScript",
    href: "https://github.com/donaldfilimon/quesar.cloud",
    kind: "core",
    pinnedSummary: true,
  },
  {
    owner: "donaldfilimon",
    name: "abi",
    summary: "Nightly Rust agent runtime. WDBX sibling required.",
    language: "Rust",
    href: "/abi",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "wdbx",
    summary: "Provenance-aware episodic substrate extracted from abi with history preserved.",
    language: "Rust",
    href: "/wdbx",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "abbey",
    summary: "CLI/TUI companion that will not claim what the ledger cannot prove.",
    language: "Rust",
    href: "/abbey",
    kind: "core",
  },
  {
    owner: "donaldfilimon",
    name: "abbey-bot",
    summary: "Companion bot surface for Abbey.",
    language: "Rust",
    href: "/abbey-bot",
    kind: "surface",
  },
  {
    owner: "donaldfilimon",
    name: "AbbeyCompanion",
    summary: "Native macOS SwiftUI companion for Abbey Bot.",
    language: "Swift",
    href: "/companion",
    kind: "surface",
  },
  {
    owner: "donaldfilimon",
    name: "mlai-website-app",
    summary: "Public website, Abbey workspace, developer console, customer portal.",
    language: "TypeScript",
    href: "/workspace",
    kind: "surface",
    badge: "archived",
  },
  {
    owner: "donaldfilimon",
    name: "MLAI-CORPORATION-WWW",
    summary: "Former MLAI site; retained as a port source after quesar.cloud superseded it.",
    language: "TypeScript",
    href: "https://github.com/donaldfilimon/MLAI-CORPORATION-WWW",
    kind: "related",
    badge: "port source",
    pinnedSummary: true,
  },
  {
    owner: "donaldfilimon",
    name: "skill-creator",
    summary: "Public agent skill for shipping this site without breaking integrity rules.",
    language: "Markdown",
    href: "/skill-creator",
    kind: "skill",
  },
  {
    owner: "donaldfilimon",
    name: "plugins",
    summary: "abi-mega: skills, assets, and scripts consumed by ABI sync.",
    language: "Python",
    href: "/plugins",
    kind: "skill",
  },
  {
    owner: "donaldfilimon",
    name: "gama",
    summary: "Declarative Swift UI framework. Founder-owned, not a Quesar product.",
    language: "Swift",
    href: "/gama",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "cell-lang",
    summary: "Systems language: Rust ownership, Swift ergonomics, Zig control, C ABI.",
    language: "Zig",
    href: "/source/cell-lang",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "cell-machine",
    summary: "Cellular-automaton experiment in Bun and TypeScript.",
    language: "TypeScript",
    href: "/source/cell-machine",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "NYON",
    summary: "Voxel-world experiment. Not a Quesar product surface.",
    language: "Rust",
    href: "/source/nyon",
    kind: "related",
  },
  {
    owner: "donaldfilimon",
    name: "mlai-site",
    summary: "Earlier marketing site. Current orientation lives here.",
    language: "JavaScript",
    href: "/quesar",
    kind: "surface",
  },
];

export const searchIndex = [
  {
    title: "Quesar",
    href: "/quesar",
    group: "Product",
    body: "Infrastructure for private persistent adaptive AI",
  },
  {
    title: "Platform",
    href: "/platform",
    group: "Product",
    body: "Three layers one chip WDBX ABI Abbey",
  },
  {
    title: "Architecture",
    href: "/architecture",
    group: "Developers",
    body: "Interactive stack diagram nodes current vs not claimed",
  },
  { title: "Abbey", href: "/abbey", group: "Product", body: "Companion claims ledger personas" },
  { title: "ABI", href: "/abi", group: "Product", body: "Rust orchestration MCP CLI" },
  { title: "WDBX", href: "/wdbx", group: "Product", body: "Episodic memory HNSW provenance" },
  { title: "Docs", href: "/docs", group: "Developers", body: "Getting started runtime MCP WDBX" },
  {
    title: "Research",
    href: "/research",
    group: "Developers",
    body: "Papers notes implementation limits",
  },
  { title: "Blog", href: "/blog", group: "Company", body: "Engineering notes and essays" },
  { title: "Team", href: "/team", group: "Company", body: "Donald Filimon founder" },
  {
    title: "Projects",
    href: "/projects",
    group: "Developers",
    body: "ABI WDBX Abbey Gama directory",
  },
  { title: "Products", href: "/products", group: "Product", body: "Product deep dives journeys" },
  { title: "Apps", href: "/apps", group: "Apps", body: "Workspace mobile vault builder bot" },
  { title: "Workspace", href: "/workspace", group: "Apps", body: "Abbey document workspace" },
  { title: "Mobile vault", href: "/mobile", group: "Apps", body: "Expo companion web vault" },
  { title: "Abbey bot", href: "/abbey-bot", group: "Apps", body: "Persona router companion chat" },
  { title: "Companion", href: "/companion", group: "Apps", body: "macOS SwiftUI companion" },
  {
    title: "Skill creator",
    href: "/skill-creator",
    group: "Apps",
    body: "Integrity skill builder",
  },
  { title: "Plugins", href: "/plugins", group: "Apps", body: "abi-mega skills scripts" },
  { title: "Gama", href: "/gama", group: "Related", body: "Swift UI framework" },
  { title: "Quasar studio", href: "/quesar", group: "Apps", body: "Local site builder preview" },
  { title: "Demo", href: "/demo", group: "Apps", body: "Persona router live demo" },
  { title: "Showcase", href: "/showcase", group: "Company", body: "Film trailer design lab mega" },
  { title: "Changelog", href: "/changelog", group: "Developers", body: "Release history" },
  {
    title: "Benchmarks",
    href: "/benchmarks",
    group: "Developers",
    body: "Workload notes not scoreboard",
  },
  { title: "Get started", href: "/get-started", group: "Developers", body: "Start journeys setup" },
  {
    title: "Investors",
    href: "/investors",
    group: "Company",
    body: "TAM SAM SOM ARR tagged targets not results",
  },
  { title: "Services", href: "/services", group: "Company", body: "Audit design build harden" },
  { title: "Security", href: "/security", group: "Company", body: "Trust posture fail closed" },
  { title: "Privacy", href: "/privacy", group: "Company", body: "Local by default" },
  { title: "Terms", href: "/terms", group: "Company", body: "Legal terms" },
  {
    title: "Contact",
    href: "/contact",
    group: "Company",
    body: "Inquiry without leaving the site",
  },
  {
    title: "Console",
    href: "/console",
    group: "Apps",
    body: "Signed-in field notes on architecture nodes",
  },
  {
    title: "Developers",
    href: "/developers",
    group: "Developers",
    body: "Live GitHub READMEs when GitHub answers",
  },
  {
    title: "Source catalog",
    href: "/source",
    group: "Developers",
    body: "Public repositories in-site",
  },
  {
    title: "Cell machine",
    href: "/source/cell-machine",
    group: "Apps",
    body: "Cellular automaton",
  },
  { title: "Links", href: "/links", group: "Company", body: "Internal directory" },
  {
    title: "Financial model",
    href: "/financial-model",
    group: "Company",
    body: "Unit economics model",
  },
  { title: "About", href: "/about", group: "Company", body: "Values principles entity" },
] as const;

export const homeStart = [
  {
    title: "Understand the architecture",
    body: "Inspect each layer, its source-backed behavior, and the limits named beside it.",
    href: "/architecture",
  },
  {
    title: "Explore the research",
    body: "Read the ideas, citations, and implementation limits behind the system.",
    href: "/research",
  },
  {
    title: "Compare the products",
    body: "See what each surface does, how to try it, and what remains in development.",
    href: "/products",
  },
  {
    title: "Read the source",
    body: "Open the public repositories and their local setup guides.",
    href: "/developers",
  },
] as const;

export const homePrivacy = [
  {
    title: "Local by default",
    body: "Workspaces, stores, and runtimes execute on operator-owned machines. This website does not host assistant sessions.",
  },
  {
    title: "Memory you can inspect",
    body: "WDBX records are content-addressed, signed, and recoverable. Persistence that did not happen is not reported as success.",
  },
  {
    title: "Explicit remote",
    body: "Cloud backends and live providers are optional and credential-gated. They are not the architecture's center.",
  },
  {
    title: "Honest limits",
    body: "We do not claim unhackable systems, military-grade anything, or 100% privacy. Security language tracks the source.",
  },
] as const;

export const quesarSurfaces = [
  {
    surface: "This website",
    role: "Product orientation and source setup links",
    status: "current" as StatusKind,
  },
  {
    surface: "Local site builder (Quasar)",
    role: "Prompt-to-Next.js on your machine (Bun + Expo, Anthropic credentials)",
    status: "experimental" as StatusKind,
  },
  {
    surface: "Abbey workspace",
    role: "Local document workspace with assistant context",
    status: "current" as StatusKind,
  },
  {
    surface: "Mobile companion",
    role: "Source-based Expo app; native CloudKit is distinct from web export",
    status: "partial" as StatusKind,
  },
  {
    surface: "Hosted Quesar cloud",
    role: "Managed sessions, generation, authentication",
    status: "planned" as StatusKind,
  },
] as const;

export const quesarWhat = [
  {
    title: "Who it is for",
    body: "Developers, technical organizations, and privacy-conscious operators who need AI systems that keep context, expose provenance, and run across local, edge, and optional remote compute.",
  },
  {
    title: "How it differs",
    body: "Conventional apps bolt memory onto a chat transcript. Quesar treats memory as a substrate (WDBX), orchestration as a runtime (ABI), and the assistant as an experience (Abbey) — with claim-honest status on every surface.",
  },
  {
    title: "What you can build",
    body: "Local assistant workflows with inspectable context. Retrieval over signed episodic records. Tools and plugins under ABI contracts. A local site-generation loop that writes a real Next.js project onto disk.",
  },
  {
    title: "What you cannot assume",
    body: "This website does not provision an assistant or generate sites. Sign-in opens a console for field notes, not an Abbey session. The local builder does not host, deploy, or bill. Production sharding is not established.",
  },
] as const;

export const architectureSteps = [
  {
    title: "User → Quesar",
    body: "A local workspace, CLI, or companion issues a request. Quesar is the product envelope, not a hosted brain.",
  },
  {
    title: "Quesar → ABI + tools",
    body: "ABI routes the request, assembles inspectable context, and may invoke contract-covered plugins.",
  },
  {
    title: "Model router + context",
    body: "An exact registry model and device are selected. Context is assembled before execution, not hidden after.",
  },
  {
    title: "WDBX",
    body: "Durable records, embeddings, and provenance live here. Retrieval can return what happened and why a record is trusted.",
  },
  {
    title: "Local / edge / remote compute",
    body: "CPU SIMD is the honest fallback. Remote providers are optional. Nothing on this website is a compute plane.",
  },
  {
    title: "Output",
    body: "A response, a plan, a tool result, or a refusal. Abbey will not claim what the ledger cannot prove.",
  },
] as const;

export const abiDuties: { title: string; body: string; status: StatusKind }[] = [
  {
    title: "Model routing",
    body: "Exact registry model IDs and explicit device choice. Optional live providers behind stored credentials.",
    status: "partial",
  },
  {
    title: "Context management",
    body: "Inspectable request context before a model or tool runs. Persistence records vectors and metadata only when the write succeeds.",
    status: "current",
  },
  {
    title: "Safety boundaries",
    body: "Claim-honest reporting, plugin parity guards, bounded workers with finite leases and replay resistance (contracts).",
    status: "partial",
  },
  {
    title: "Tool orchestration",
    body: "MCP tools in the public tree. Optional loopback HTTP is not a spec-conforming persistent SSE channel.",
    status: "current",
  },
  {
    title: "Reasoning coordination",
    body: "Scheduler-backed helpers with live task and memory observability where the tree implements them.",
    status: "partial",
  },
  {
    title: "Memory integration",
    body: "WDBX is a required sibling. Skipping persistence never fabricates a successful write.",
    status: "current",
  },
];

export const abiNotClaimed = [
  "A current Zig public tree",
  "Distributed production sharding",
  "AES/RBAC as a complete product",
  "Python/TensorFlow stacks",
  "Kubernetes or H100 deployments",
  "QPS, latency, or accuracy numbers",
  "Energy-efficiency comparisons",
  "Browser autonomy",
] as const;

export const wdbxCapabilities: { concern: string; what: string; status: StatusKind }[] = [
  {
    concern: "Blocks / segments",
    what: "On-disk segment format, CRC-framed WAL, checkpoint publication and salvage",
    status: "current",
  },
  {
    concern: "Embeddings / search",
    what: "Exact and layered HNSW, ordered vector search, 3-D spatial index",
    status: "current",
  },
  {
    concern: "Metadata",
    what: "Block metadata round-tripping, versioning, access and execution state in records",
    status: "current",
  },
  { concern: "Relationships", what: "Multi-parent causal audit DAG", status: "current" },
  {
    concern: "Provenance",
    what: "SHA-256 content addressing, Ed25519 signing, deterministic CBOR envelopes",
    status: "current",
  },
  {
    concern: "Retrieval",
    what: "Hybrid ranking contracts; score currently collapses several axes",
    status: "partial",
  },
  {
    concern: "Evidence-weighted rank",
    what: "Separate semantic, temporal, causal, and persona signals",
    status: "planned",
  },
  {
    concern: "Distributed operation",
    what: "Cluster replication with read repair in source; not production sharding",
    status: "experimental",
  },
  {
    concern: "Trust / federation",
    what: "Local deterministic replay tests. Not deployed federation evidence.",
    status: "research",
  },
  {
    concern: "Hosted service",
    what: "Nothing in the repository provides production authority",
    status: "planned",
  },
];

export const abbeyWorkspaceFacts = [
  "Node 24, Bun 1.4",
  "uv with Python 3.11–3.13",
  "Java 21+ and LibreOffice",
  "SQLite / Better Auth in the local app",
  "Private databases and uploaded documents are not part of the public import",
  "This site does not open a chat",
] as const;

export const researchTopics = [
  {
    title: "Memory architecture",
    status: "current" as StatusKind,
    applies: "WDBX, ABI",
    body: "Episodic records with WAL, MVCC, causal DAGs, and content addressing. Memory is a substrate, not a chat log with embeddings glued on.",
  },
  {
    title: "Retrieval",
    status: "partial" as StatusKind,
    applies: "WDBX",
    body: "Ordered vector search and hybrid ranking contracts exist. Collapsing semantic, temporal, causal, and persona signals into one score is a documented limitation.",
  },
  {
    title: "Distributed systems",
    status: "experimental" as StatusKind,
    applies: "WDBX",
    body: "Reference cluster replication and read repair are in source. They do not establish production sharding or hosted authority.",
  },
  {
    title: "Model orchestration",
    status: "partial" as StatusKind,
    applies: "ABI",
    body: "Scheduler, plugins, MCP, exact model registry. Routing is explicit. Quality is not inferred from a successful template completion.",
  },
  {
    title: "Privacy and local inference",
    status: "current" as StatusKind,
    applies: "Quesar, Abbey, ABI",
    body: "Default posture is operator-owned machines. Remote is optional. This website does not see your documents, weights, or generated output.",
  },
  {
    title: "Provenance and trust",
    status: "partial" as StatusKind,
    applies: "WDBX, Abbey",
    body: "Signatures and causal history answer why a record is trusted. They do not make the record true. Federation evidence is separately authorized.",
  },
  {
    title: "Synchronization",
    status: "planned" as StatusKind,
    applies: "Quesar, mobile",
    body: "Mobile CloudKit and encrypted-local fallback are distinct. Signed-device acceptance is not the same as a web export.",
  },
  {
    title: "Interoperability",
    status: "research" as StatusKind,
    applies: "Quesar",
    body: "Workspaces, crates, and apps share a type vocabulary for product, persona, and claim provenance. Semantic UI tokens remain app-local.",
  },
] as const;

export const researchSources = [
  {
    title: "ABI",
    href: "/abi",
    body: "Nightly Rust tree, wrappers, MCP, claim-honest GPU reporting.",
  },
  {
    title: "WDBX",
    href: "/wdbx",
    body: "Provenance-aware episodic substrate, crate map, evidence vs gaps.",
  },
  {
    title: "Abbey claims",
    href: "/abbey",
    body: "Companion interface with enumerated Current / Partial / Proposed / Blocked / Out of scope.",
  },
  {
    title: "Integration surfaces",
    href: "/developers",
    body: "Website, mobile, local builder, Abbey workspace, research export.",
  },
  {
    title: "Mobile companion",
    href: "/mobile",
    body: "Expo SDK 53. Native CloudKit is distinct from this web vault.",
  },
  {
    title: "Quasar builder",
    href: "/quesar",
    body: "v1 writes a Next.js project on disk. Unit suite is not a live generation.",
  },
  {
    title: "skill-creator",
    href: "/skill-creator",
    body: "Public skill for site integrity: Apple sentence, provenance tags, Apache-2.0, toolchain facts.",
  },
  { title: "Gama", href: "/gama", body: "Founder-owned Swift UI framework. Not a Quesar product." },
] as const;
