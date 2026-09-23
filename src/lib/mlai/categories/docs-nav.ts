/**
 * Documentation section navigation and local-search index.
 *
 * Single source for the /docs sidebar, mobile contents, and ⌘K search.
 * Descriptions are short orientation blurbs aligned with the existing Docs
 * view — not a parallel research/product corpus.
 */

export interface DocNavItem {
  id: string;
  label: string;
  /** Short description for search results and empty-state orientation. */
  description: string;
  /** Extra tokens indexed for search (module names, existing section keywords). */
  body: string;
}

export interface DocNavGroup {
  group: string;
  items: readonly DocNavItem[];
}

export const docNav: readonly DocNavGroup[] = [
  {
    group: "Start",
    items: [
      {
        id: "intro",
        label: "Introduction",
        description:
          "Build private, traceable AI workflows on the ABI runtime with retrieval provenance, policy-gated agents, and audit trails.",
        body: "MLAI developer platform documentation introduction overview",
      },
      {
        id: "architecture",
        label: "Roles",
        description:
          "Separate runtime, storage, interface, and application framework responsibilities.",
        body: "architecture roles ABI WDBX Abbey Gama",
      },
      {
        id: "runtime",
        label: "ABI Runtime",
        description:
          "Rust framework for local AI orchestration, semantic vector storage, and GPU capability reporting.",
        body: "abi-cli abi-mcp abi-ai abi-sea abi-wdbx abi-gpu tools/cargo.sh tools/check.sh backends dashboard",
      },
    ],
  },
  {
    group: "Security & trust",
    items: [
      {
        id: "trust",
        label: "Security & trust",
        description:
          "WorkOS AuthKit sessions, rate-limited public inquiries, and evaluation gates before autonomous write or external tool calls.",
        body: "authentication WorkOS AuthKit rate limit evaluation gates fail closed",
      },
      {
        id: "evidence",
        label: "Evidence",
        description:
          "Documented behavior, reported testing, measured results, and targets stay separate.",
        body: "evidence claims measured reported target",
      },
    ],
  },
  {
    group: "Systems",
    items: [
      {
        id: "identity",
        label: "Identity",
        description: "Abbey, Aviva, and ABI without confusing identity with implementation.",
        body: "companion identity Abbey Aviva ABI",
      },
      {
        id: "gama",
        label: "Gama",
        description: "A source-based introduction to Gama’s Swift scene and rendering model.",
        body: "Gama Swift scene rendering",
      },
    ],
  },
  {
    group: "Architecture",
    items: [
      {
        id: "personas",
        label: "Persona Routing",
        description:
          "Abbey, Aviva, and Abi as distinct interaction roles with policy-weighted routing — not three separately deployed commercial services.",
        body: "Abbey Aviva Abi persona routing governance empathy expert",
      },
      {
        id: "wdbx",
        label: "WDBX Retrieval",
        description:
          "Inspectable nearest-neighbor retrieval from the active Rust substrate (layered HNSW, MVCC).",
        body: "WDBX HNSW MVCC cosine SIMD vector search backtrace provenance abi-wdbx",
      },
      {
        id: "wdbx-v2",
        label: "WDBX V2 Docs",
        description:
          "Frozen Zig-era documentation mirror retained for historical reference — not the current Rust implementation guide.",
        body: "historical Zig mirror protocols documentation attachment PDF",
      },
      {
        id: "mcp",
        label: "MCP Server",
        description:
          "JSON-RPC 2.0 over stdio with an optional loopback HTTP listener for local tool handlers.",
        body: "MCP JSON-RPC stdio ai_learn ai_complete wdbx_query gpu_status plugin_list",
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        id: "deployment",
        label: "Deployment",
        description:
          "Checklist for packaging orchestration, retrieval, audit logs, and controls across deployment targets.",
        body: "deployment cloud VPC on-premise offline-first private runtime",
      },
    ],
  },
  {
    group: "Reference",
    items: [
      {
        id: "api",
        label: "Protected API",
        description:
          "Console and API surfaces that require an invited organization session and fail closed without credentials.",
        body: "console API session ADMIN_EMAILS protected routes",
      },
    ],
  },
] as const;

export function flattenDocNav(): DocNavItem[] {
  return docNav.flatMap((g) => g.items.map((item) => ({ ...item /* group carried via lookup */ })));
}

export function docNavGroupFor(id: string): string | undefined {
  for (const g of docNav) {
    if (g.items.some((item) => item.id === id)) return g.group;
  }
  return undefined;
}
