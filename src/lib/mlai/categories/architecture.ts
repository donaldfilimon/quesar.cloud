import type { StatusKind } from "@/lib/site-identity";
import { sharedResearchCopy } from "@/lib/mlai/categories/research-topics";

/** The /architecture diagram: layers, nodes (each with its status, what is implemented and what is not claimed) and the walkthrough steps. */

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
    body: "The large model that trains and improves Abbey, Aviva, and the other assistants. Not hosted on this website.",
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
    summary: "The large model behind the assistants.",
    detail:
      "Quesar is the large model that trains and improves Abbey, Aviva, and the other assistants. Public orientation is current. This site does not host the model or an assistant session.",
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
      "Twelve contract-covered MCP tools including wdbx_query and gpu_status. The optional loopback listener serves MCP 2024-11-05 HTTP+SSE sessions, not Streamable HTTP.",
    implemented: ["stdio MCP", "Optional loopback HTTP+SSE with bearer auth"],
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

export const architectureSteps = [
  {
    title: "User → Quesar",
    body: "A local workspace, CLI, or companion issues a request. Quesar is the large model that trains and improves the assistants. This website does not host that model.",
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
