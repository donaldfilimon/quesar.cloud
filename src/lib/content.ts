import { sharedResearchCopy } from "@/lib/mlai/categories/research-topics";
import type { StatusKind } from "@/lib/site-identity";

// Site identity, nav and StatusKind live in a small module so the entry chunk
// (root route, header) does not pull in this whole catalog.
export { nav, site, type StatusKind } from "@/lib/site-identity";
export { homePrivacy, homeStart } from "@/lib/home-content";
export {
  abbeyWorkspaceFacts,
  quesarSurfaces,
  quesarWhat,
  setups,
} from "@/lib/mlai/categories/surfaces";

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

// ABI/WDBX runtime facts (crates, MCP tools, CLI, spec rows, capabilities)
// have one source shared with the docs hub.
export {
  abiCli,
  abiCrates,
  mcpTools,
  wdbxCapabilities,
  wdbxCrates,
  wdbxSpecs,
} from "@/lib/mlai/categories/abi-runtime";

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
    detail: `${sharedResearchCopy.retrieval} Collapsing every signal into one score is a documented limitation.`,
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
    detail: sharedResearchCopy.provenance,
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

// Investor notes live in the typed content layer (src/lib/mlai/categories/investor.ts);
// re-exported so importers keep using `@/lib/content`.
export { investor } from "@/lib/mlai/categories/investor";

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

// The /research topic and source lists live with the research records so their
// track links can be checked against `researchRecords.tracks`.
export { researchSources, researchTopics } from "@/lib/mlai/categories/research-topics";
