import type { ResearchContextTopic } from "./research-context";
import type { ResearchSources, ResearchTopics } from "../schemas-research-topics";

/**
 * Sentences that appear both in the /research topic list and in the
 * architecture map (`architectureNodes` in `@/lib/content`). Both build their
 * copy from these so the shared wording cannot drift apart.
 */
export const sharedResearchCopy = {
  retrieval: "Ordered vector search and hybrid ranking contracts exist.",
  provenance:
    "Signatures and causal history answer why a record is trusted. They do not make the record true.",
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
    body: `${sharedResearchCopy.retrieval} Collapsing semantic, temporal, causal, and persona signals into one score is a documented limitation.`,
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
    body: "Scheduler, plugins, MCP, exact model registry. Routing is explicit. Quality is not inferred from a successful template completion.",
    trackIds: ["ai"],
  },
  {
    title: "Privacy and local inference",
    status: "current",
    applies: "Quesar, Abbey, ABI",
    body: "Default posture is operator-owned machines. Remote is optional. This website does not see your documents, weights, or generated output.",
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
    body: "Mobile CloudKit and encrypted-local fallback are distinct. Signed-device acceptance is not the same as a web export.",
    trackIds: [],
  },
  {
    title: "Interoperability",
    status: "research",
    applies: "Quesar",
    body: "Workspaces, crates, and apps share a type vocabulary for product, persona, and claim provenance. Semantic UI tokens remain app-local.",
    trackIds: [],
  },
];

export const researchSources: ResearchSources = [
  {
    title: "ABI",
    href: "/abi",
    body: "Nightly Rust tree, wrappers, MCP, claim-honest GPU reporting.",
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
    body: "Companion interface with enumerated Current / Partial / Proposed / Blocked / Out of scope.",
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
    body: "Expo SDK 53. Native CloudKit is distinct from this web vault.",
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
    body: "Public skill for site integrity: Apple sentence, provenance tags, Apache-2.0, toolchain facts.",
    subject: "skill-creator",
  },
  {
    title: "Gama",
    href: "/gama",
    body: "Founder-owned Swift UI framework. Not a Quesar product.",
    subject: "gama",
  },
];
