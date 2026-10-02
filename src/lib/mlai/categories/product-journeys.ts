import type { StatusKind } from "@/lib/site-identity";
/**
 * Requirements for the browser document preview, shared with its surface facts.
 * Separate Abbey applications have their own source and acceptance boundaries.
 */
export const abbeyRequirements = ["A browser for this preview"] as const;

/**
 * `status` is the claim-discipline status of each journey (data only, not
 * rendered here). `src/lib/mlai/surfaces.content.test.ts` requires the surface
 * rows that link a journey to carry the same status.
 */
export const productJourneys = [
  {
    slug: "abi",
    name: "ABI",
    purpose:
      "Explore deterministic persona routing, template completion, and source-defined tools.",
    availability: "Local developer framework",
    status: "current" as StatusKind,
    prerequisites:
      "A source checkout, nightly Rust and the sibling workspaces required by the ABI README.",
    limitation:
      "Local deterministic routing and template completion do not establish foundation-model quality. External providers need separate configuration.",
    setupHref: "/docs/getting-started",
    researchSlugs: ["ai-overview", "mcp-overview", "sea-overview"],
  },
  {
    slug: "abbey",
    name: "Abbey",
    purpose:
      "Explore a browser document workspace and its optional configured server model-request path.",
    availability: "Browser document preview",
    status: "current" as StatusKind,
    prerequisites:
      "A browser. A configured server and model provider are required for model requests; the static preview cannot call a model.",
    limitation:
      "Documents are stored in this browser's localStorage. This preview does not establish setup or acceptance for a separate Abbey app.",
    setupHref: "/workspace",
    researchSlugs: ["ai-overview", "tui-overview"],
  },
  {
    slug: "wdbx",
    name: "WDBX",
    purpose: "Store durable records and retrieve vectors with inspectable provenance.",
    availability: "Implemented Rust components for local integration",
    status: "current" as StatusKind,
    prerequisites:
      "Read the WDBX source README and prepare its Rust workspace before integrating persistence or retrieval.",
    limitation:
      "Storage integrity does not prove the truth of stored statements. The reference cluster protocol does not establish production multi-host operation or sharding.",
    setupHref: "/wdbx",
    researchSlugs: [
      "wdbx-overview",
      "wdbx-weighted-backtrace-memory-store",
      "wdbx-graph-weights-traceable-retrieval",
      "sea-overview",
    ],
  },
  {
    slug: "quasar",
    name: "Quasar",
    purpose: "Generate a Next.js website and preview it on your own machine.",
    availability: "Experimental local website builder with a browser client",
    status: "experimental" as StatusKind,
    prerequisites:
      "Bun 1.4, this repository's Quasar sidecar, service-side Anthropic credentials, and a browser paired to the separately running service.",
    limitation:
      "The service defaults to loopback and requires pairing for API operations. Generated project code runs as the operator. Live provider generation remains unverified; remote exposure requires operator-managed HTTPS and network opt-in.",
    setupHref: "/quesar",
    researchSlugs: ["mcp-overview"],
  },
] as const;
export const startJourneys = [
  {
    id: "research",
    title: "Explore the research",
    description:
      "Read practical summaries, then inspect citations, attachments and implementation limits.",
    availability: "Public reading",
    prerequisites: "A browser; no account or local setup required.",
    href: "/research",
    label: "Browse research",
  },
  {
    id: "abbey",
    title: "Explore Abbey's workspace",
    description:
      "Try the browser document loop. Model requests use a separate configured server path; documents are stored in this browser's localStorage.",
    availability: "Browser document preview",
    prerequisites: productJourneys[1].prerequisites,
    href: "/workspace",
    label: "Open browser workspace",
  },
  {
    id: "mobile",
    title: "Explore the mobile companion",
    description:
      "Try the browser vault preview. This page stores notes in localStorage. The separate Capacitor CloudKit plugin exposes availability and account-status checks; signed-device sync remains unverified.",
    availability: "Browser vault preview; partial native shell source",
    status: "partial" as StatusKind,
    prerequisites:
      "A browser for the preview. Native shell work requires the separate native package and platform tooling; the copied native projects are not built or synced in the source receipt.",
    href: "/mobile",
    label: "Open the web vault",
  },
  {
    id: "quasar",
    title: "Build a site with Quasar",
    description: productJourneys[3].purpose + " " + productJourneys[3].limitation,
    availability: productJourneys[3].availability,
    prerequisites: productJourneys[3].prerequisites,
    href: "/quesar",
    label: "Open Quasar studio",
  },
] as const;
