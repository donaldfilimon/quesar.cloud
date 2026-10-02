import type { ResearchContextTopic } from "./research-context";
import type { ResearchSources, ResearchTopics } from "../schemas-research-topics";

/**
 * Sentences that appear both in the /research topic list and in the
 * architecture map (`architectureNodes` in `./architecture.ts`). Both build their
 * copy from these so the shared wording cannot drift apart.
 */
export const sharedResearchCopy = {
  retrieval:
    "WDBX implements exact and layered-HNSW retrieval with a pluggable scoring seam; evidence-weighted retrieval remains unimplemented.",
  provenance:
    "Content addressing, signatures, and causal history expose record commitments and relationships. They do not establish the truth or evidential reliability of a record.",
} as const;

/**
 * Research tracks (`researchRecords.tracks`) that no topic below restates. The
 * content test fails when a track is neither referenced by a topic's `trackIds`
 * nor listed here, so a new track has to be placed deliberately.
 */
export const untopicedTracks: readonly ResearchContextTopic[] = ["sea", "gpu", "mcp", "tui"];

export const researchTopics: ResearchTopics = [
  {
    title: "Memory architecture",
    status: "current",
    applies: "WDBX, ABI",
    body: "Episodic records with WAL, MVCC, causal DAGs, and content addressing. Memory is a substrate, not a chat log with embeddings glued on.",
    trackIds: ["wdbx"],
  },
  {
    title: "Retrieval",
    status: "partial",
    applies: "WDBX",
    body: sharedResearchCopy.retrieval,
    trackIds: ["wdbx"],
  },
  {
    title: "Distributed systems",
    status: "experimental",
    applies: "WDBX",
    body: "Reference cluster replication and read repair are in source. They do not establish production sharding or hosted authority.",
    trackIds: ["wdbx"],
  },
  {
    title: "Model orchestration",
    status: "partial",
    applies: "ABI",
    body: "Deterministic persona routing, template completion, and source-defined MCP tools. Model execution and quality require separate evidence from the selected runtime path.",
    trackIds: ["ai"],
  },
  {
    title: "Privacy and provider boundaries",
    status: "partial",
    applies: "Quesar, Abbey, ABI",
    body: "Browser workspace documents and vault notes use localStorage. Configured website model requests and Quasar generation have separate provider and data boundaries.",
    trackIds: [],
  },
  {
    title: "Provenance and trust",
    status: "partial",
    applies: "WDBX, Abbey",
    body: `${sharedResearchCopy.provenance} Federation evidence is separately authorized.`,
    trackIds: [],
  },
  {
    title: "Synchronization",
    status: "planned",
    applies: "Quesar, mobile",
    body: "Synchronization requires separate implementation and signed-device qualification. The browser vault uses localStorage; the native CloudKit availability plugin does not implement vault synchronization.",
    trackIds: [],
  },
  {
    title: "Interoperability",
    status: "research",
    applies: "Quesar",
    body: "Research scope: consistent product, persona, and claim-provenance vocabularies across integrations, with implementation and UI semantics evaluated separately.",
    trackIds: [],
  },
];

export const researchSources: ResearchSources = [
  {
    title: "ABI",
    href: "/abi",
    body: "Nightly Rust source, CLI wrappers, deterministic persona routing, and MCP tools.",
    subject: "abi",
  },
  {
    title: "WDBX",
    href: "/wdbx",
    body: "Provenance-aware episodic substrate, crate map, evidence vs gaps.",
    subject: "wdbx",
  },
  {
    title: "Abbey claims",
    href: "/abbey",
    body: "Source capability ledger with enumerated Current / Partial / Proposed / Blocked / Out of scope states.",
    subject: "abbey",
  },
  {
    title: "Integration surfaces",
    href: "/developers",
    body: "Website, mobile, local builder, Abbey workspace, research export.",
  },
  {
    title: "Mobile companion",
    href: "/mobile",
    body: "Browser vault preview and separate Capacitor source with CloudKit availability checks.",
    subject: "mobile",
  },
  {
    title: "Quasar builder",
    href: "/quesar",
    body: "v1 writes a Next.js project on disk. Unit suite is not a live generation.",
    subject: "quasar",
  },
  {
    title: "skill-creator",
    href: "/skill-creator",
    body: "Browser SKILL.md composer and this site's integrity rules.",
    subject: "skill-creator",
  },
  {
    title: "Gama",
    href: "/gama",
    body: "Founder-owned Swift UI framework. Not a Quesar product.",
    subject: "gama",
  },
];
