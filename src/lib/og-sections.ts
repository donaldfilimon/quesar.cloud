/**
 * Sections with their own Open Graph card (`public/og/<slug>.jpg`, rendered by
 * `bun run og:images`). Each line is the section's claim, in the site's own
 * words; no card states anything its page does not.
 */
export const OG_SECTIONS = [
  {
    slug: "quesar",
    path: "/quesar",
    title: "Quesar",
    line: "Infrastructure for persistent, adaptive AI on machines you own.",
  },
  {
    slug: "platform",
    path: "/platform",
    title: "Platform",
    line: "WDBX storage, ABI compute, Abbey on top. Three layers, one stack.",
  },
  {
    slug: "wdbx",
    path: "/wdbx",
    title: "WDBX",
    line: "A provenance-aware memory substrate: durable records, inspectable evidence.",
  },
  {
    slug: "abi",
    path: "/abi",
    title: "ABI",
    line: "Local orchestration that routes requests and reports capability honestly.",
  },
  {
    slug: "abbey",
    path: "/abbey",
    title: "Abbey",
    line: "An assistant that will not claim what the ledger cannot prove.",
  },
  {
    slug: "research",
    path: "/research",
    title: "Research",
    line: "Memory, retrieval and orchestration notes, with sources attached.",
  },
  {
    slug: "docs",
    path: "/docs",
    title: "Docs",
    line: "Start with the source: runtime, WDBX, MCP and evidence.",
  },
  {
    slug: "showcase",
    path: "/showcase",
    title: "Showcase",
    line: "Films drawn frame by frame in your browser. Orientation, not evidence.",
  },
] as const;

export type OgSection = (typeof OG_SECTIONS)[number]["slug"];
