/**
 * ABI/WDBX runtime facts: the MCP tools, the Rust crates, the WDBX spec rows
 * and capability tables. One source for /abi, /wdbx, /platform and the docs
 * hub, which previously each kept their own copy. `@/lib/content` and
 * `docsHub` in `../pages.ts` re-export or derive from these records.
 *
 * Several pages word the same tool or crate differently, one field per page.
 * The variants may differ in length but must state the same fact; where they
 * once contradicted each other, both now follow the pinned, dated research
 * records in `./research-records.ts` (reviewed 2026-09-06) and, for WDBX
 * storage, `notes/mlai/superpowers/specs/2026-09-22-single-app-merge-design.md`.
 *
 * Typed by `../schemas-runtime.ts` and parsed in `../abi-runtime.content.test.ts`;
 * no zod at runtime.
 */
import type { AbiModule, DocsWdbxCapability, McpTool, WdbxCapability } from "../schemas-runtime";
import { wdbxGraphConstants, wdbxGraphDefaults } from "../wdbx-facts";

/* ------------------------------------------------------------ MCP tools */

/**
 * The twelve contract-covered `abi-mcp` tools, in docs-hub order. The count
 * matches the architecture "tools" node and the research MCP track.
 */
export const mcpToolCatalog: readonly McpTool[] = [
  {
    name: "ai_learn",
    // The research MCP records only place ai_learn in the "learning" group and
    // treat learning as a side effect; neither earlier wording is sourced.
    docsBody:
      "Learning entry point with local side effects; ABI_WDBX_PERSIST=0 disables persistence.",
    abiBody: "Learning entry point with local side effects. Persistence can be disabled.",
  },
  { name: "scheduler_info", docsBody: "Compatibility alias for scheduler statistics." },
  {
    name: "ai_complete",
    // ai-overview: a keyword-routed profile renders a persona template; the
    // requested model id is metadata, not proof that the model ran.
    docsBody:
      "Local template completion through the routed persona profile; the requested model id is metadata, not proof it ran.",
    abiBody: "Local persona-template completion. The model id is metadata, not proof it ran.",
  },
  { name: "ai_run", docsBody: "Run completion with local profile routing." },
  { name: "ai_train", docsBody: "Train the selected local profile against WDBX." },
  {
    name: "wdbx_query",
    docsBody: "Vector / block retrieval against the WDBX store with ordered results.",
    abiBody: "Nearest-neighbor retrieval with inspectable hits.",
  },
  {
    name: "wdbx_stats",
    docsBody: "Report local WDBX store statistics; not a cluster dashboard.",
    abiBody: "Local store statistics. Not a cluster dashboard.",
  },
  {
    name: "gpu_status",
    docsBody: "Report GPU capability and backend, with deterministic CPU fallback.",
    abiBody: "Honest device report. Fallback is reported as fallback.",
  },
  { name: "scheduler_stats", docsBody: "Report scheduler task counts." },
  {
    name: "connector_test",
    docsBody: "Run local connector validation; does not prove live credentials work.",
  },
  {
    name: "plugin_list",
    docsBody: "Enumerate registered plugins and their target features.",
    abiBody: "Contract-covered plugins visible to this process.",
  },
  { name: "plugin_run", docsBody: "Invoke a registered plugin entry point." },
];

/** The /abi page shows this subset of the catalog, in this order. */
export const abiMcpToolOrder = [
  "ai_learn",
  "ai_complete",
  "wdbx_query",
  "wdbx_stats",
  "gpu_status",
  "plugin_list",
] as const;

/* --------------------------------------------------------------- Crates */

/** Crates of the ABI and WDBX Rust workspaces, with each page's wording. */
export const abiModules: readonly AbiModule[] = [
  {
    name: "abi-cli",
    abiBody: "Operator surface. backends, scheduler, dashboard, plugin, wdbx.",
    docsBody: "Commands, agent REPL, and diagnostics dashboard.",
  },
  {
    name: "abi-mcp",
    abiBody: "JSON-RPC 2.0 over stdio, optional loopback HTTP with bearer auth.",
    docsBody: "JSON-RPC tool handlers and stdio server.",
  },
  {
    name: "abi-ai",
    abiBody: "Exact model registry and template completion. Quality is not inferred.",
    docsBody: "Profile routing, completion, and governance helpers.",
  },
  {
    name: "abi-sea",
    // The research SEA track pins abi-sea's evidence.rs, scorer.rs and
    // learn_loop.rs: evidence selection, not a scheduler.
    abiBody: "Bounded evidence selection and scoring. The learning loop persists router weights.",
    docsBody: "Evidence selection, scoring, and learning loop.",
  },
  {
    name: "abi-gpu",
    abiBody: "Capability reporting. accelerated=false when native kernels are not linked.",
    docsBody: "Backend reporting, optional Metal DOT kernels, and CPU fallback.",
  },
  {
    name: "abi-wdbx",
    wdbxBody: "Episodic store, HNSW graph, query path, and persistence contracts.",
    docsBody: "Durable memory and retrieval from the sibling Rust substrate.",
  },
  {
    name: "abi-compute",
    wdbxBody: "CPU vector ops and optional macOS Metal DOT. CUDA/Vulkan not linked here.",
  },
  {
    name: "abi-foundation",
    wdbxBody: "Shared primitives: identifiers, hashing, time, error types.",
  },
  { name: "abi-core", wdbxBody: "Episode types, witness encoding, causal DAG helpers." },
  {
    name: "abi-telemetry",
    wdbxBody: "Local traces and capability reporting. Not a hosted metrics product.",
  },
];

export const abiCrateOrder = ["abi-cli", "abi-mcp", "abi-ai", "abi-sea", "abi-gpu"] as const;
export const wdbxCrateOrder = [
  "abi-wdbx",
  "abi-compute",
  "abi-foundation",
  "abi-core",
  "abi-telemetry",
] as const;
export const docsModuleOrder = [
  "abi-ai",
  "abi-sea",
  "abi-wdbx",
  "abi-gpu",
  "abi-mcp",
  "abi-cli",
] as const;

/** Picks `names` from `records` in order and reads one page's wording from each. */
function project<T extends { name: string }>(
  records: readonly T[],
  names: readonly string[],
  body: (record: T) => string | undefined,
): { name: string; body: string }[] {
  return names.map((name) => {
    const record = records.find((r) => r.name === name);
    const text = record ? body(record) : undefined;
    if (text === undefined) throw new Error(`abi-runtime: no wording for ${name}`);
    return { name, body: text };
  });
}

/** /abi MCP tools. */
export const mcpTools = project(mcpToolCatalog, abiMcpToolOrder, (t) => t.abiBody);
/** Docs hub MCP tools: the whole catalog. */
export const docsMcpTools = project(
  mcpToolCatalog,
  mcpToolCatalog.map((t) => t.name),
  (t) => t.docsBody,
);

/** /abi crates. */
export const abiCrates = project(abiModules, abiCrateOrder, (m) => m.abiBody);
/** /wdbx crates. */
export const wdbxCrates = project(abiModules, wdbxCrateOrder, (m) => m.wdbxBody);
/** Docs hub module map. */
export const docsModuleMap = project(abiModules, docsModuleOrder, (m) => m.docsBody);

/* ------------------------------------------------------------------ CLI */

/** Agrees with `frozenCli` in `@/lib/catalog` and the docs hub runtime commands. */
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

/* ------------------------------------------------------------ WDBX spec */

/** /wdbx and /platform spec rows. Graph values come from `wdbxGraphDefaults`. */
export const wdbxSpecs = [
  { k: "Engine", v: wdbxGraphDefaults.index },
  { k: "Concurrency", v: wdbxGraphDefaults.transactions },
  { k: "M", v: String(wdbxGraphDefaults.m) },
  { k: "efConstruction", v: String(wdbxGraphDefaults.efConstruction) },
  { k: "efSearch", v: String(wdbxGraphDefaults.efSearch) },
  { k: "Metric", v: "Cosine" },
  { k: "Addressing", v: "Content-addressed" },
  { k: "Sharding", v: "Not established" },
] as const;

/* ---------------------------------------------------- WDBX capabilities */

/** The /wdbx capability table. Every row carries its status. */
export const wdbxCapabilities: WdbxCapability[] = [
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

/**
 * The docs hub WDBX capability cards, badged like the /wdbx table rows they
 * summarize (Retrieval partial, Blocks / segments and Embeddings current).
 */
export const docsWdbxCapabilities: readonly DocsWdbxCapability[] = [
  {
    title: "Weighted backtrace paths",
    body: "Hybrid retrieval exposes its score components. The score still collapses several axes; separate evidence-weighted ranking is planned.",
    status: "partial",
  },
  {
    title: "HNSW vector search",
    body: `Cosine nearest-neighbor through the active Rust substrate's layered HNSW index (${wdbxGraphConstants}).`,
    status: "current",
  },
  {
    title: "Durable snapshots",
    body: "Snapshots with CRC-framed WAL recovery and checkpoints. Snapshot-chain and strict content verification are separate checks.",
    status: "current",
  },
  {
    // No repo record mentions store_result; the research guides and the docs
    // runtime page show persistence on by default and switched off by env.
    title: "Switchable persistence",
    body: "The local store defaults to $HOME/.abi/wdbx; ABI_WDBX_PERSIST=0 disables persistence for evaluation runs.",
    status: "current",
  },
];
