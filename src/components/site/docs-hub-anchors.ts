/**
 * The docs hub reference sections, as data (split out of docs-hub.tsx so that
 * module exports only components for fast refresh). Each section is keyed by
 * the slug of the article it belongs to: the /docs hub renders all of them
 * under `ref-<slug>` anchors, and `/docs/<slug>` renders its own one below the
 * article body, so the two never carry separate copies of the same material.
 */
export const DOCS_HUB_SECTIONS = [
  {
    slug: "runtime",
    label: "Runtime build",
    group: "Start",
    title: "ABI runtime",
    lede: "ABI is a Rust framework for local AI orchestration, semantic vector storage, and GPU capability reporting. Build the CLI and MCP server with the repository's pinned toolchain and the ./tools/cargo.sh wrapper.",
  },
  {
    slug: "personas",
    label: "Persona routing",
    group: "Architecture",
    title: "How a profile is selected",
    lede: "An explicit leading persona address takes precedence. Otherwise, token-prefix signals adjust a prior and the runtime normalizes the resulting weights before selecting the largest. The distribution describes routing preference, not model quality, authorization, or a parallel-execution strategy.",
  },
  {
    slug: "wdbx",
    label: "WDBX retrieval",
    group: "Architecture",
    title: "WDBX retrieval",
    lede: "WDBX is the Weighted Directed Backtrace eXecution store. It keeps context as weighted paths so retrieval can be inspected, not just ranked: key-value, vector, and block surfaces, with snapshot persistence guarded by SHA-256 integrity checks.",
  },
  {
    slug: "wdbx-v2",
    label: "WDBX V2 downloads",
    group: "Architecture",
    title: "WDBX V2 documentation snapshot",
    lede: "A frozen June 2026 snapshot of the earlier single-crate Abbey WDBX project (Rust 2024, stable toolchain). It is retained for reference and is not the guide to the current abi-extracted substrate; claims in it require revalidation there.",
  },
  {
    slug: "mcp",
    label: "MCP tools",
    group: "Architecture",
    title: "MCP server",
    lede: "The abi-mcp server speaks JSON-RPC 2.0 over stdio. Its optional loopback HTTP compatibility listener serves persistent MCP 2024-11-05 HTTP+SSE sessions; it is not Streamable HTTP. Tool names and transport facts are from the ABI README.",
  },
  {
    slug: "deployment",
    label: "Configuring this site",
    group: "Operations",
    title: "Configuring this site",
    lede: 'For quesar.cloud itself. Each missing value produces a clear "not configured" state, never a crash.',
  },
  {
    slug: "api",
    label: "Site surfaces",
    group: "Reference",
    title: "What this site exposes",
    lede: "Protected surfaces require a Better Auth session and fail closed. There is no public hosted assistant API.",
  },
] as const;

export type DocsHubSection = (typeof DOCS_HUB_SECTIONS)[number];

/** In-page anchors of the /docs hub, for its section nav and site search. */
export const DOCS_HUB_ANCHORS = DOCS_HUB_SECTIONS.map((s) => ({
  id: `ref-${s.slug}`,
  label: s.label,
}));

export function docsHubSection(slug: string): DocsHubSection | undefined {
  return DOCS_HUB_SECTIONS.find((s) => s.slug === slug);
}
