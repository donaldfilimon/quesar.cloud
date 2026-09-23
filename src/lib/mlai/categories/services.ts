import type { Refusals } from "../schemas";

/**
 * "What we say no to" — the refusal copy, ported verbatim from the design
 * handoff (design-sources/handoffs/design_handoff_mlai_site Services page).
 * Rendered as `site/Callout` asides on the Services view; `accent` is the
 * product accent axis the handoff assigned each callout.
 */
export const refusals = [
  {
    label: "Scope discipline",
    accent: "abbey",
    body: "We don't take work that puts your data in our hands. If the engagement requires your corpus to leave your hardware, the engagement is designed wrong — and we'll say so.",
  },
  {
    label: "Claims discipline",
    accent: "wdbx",
    body: "Deliverables ship with provenance-tagged numbers. Targets are framed as targets; nothing is reported as measured until it reproduces on your hardware.",
  },
] as const satisfies readonly Refusals[number][];

/**
 * The nine engagements rendered on /services. Single source since the
 * content.ts copy was removed: this is the text the page rendered (the
 * trimmed wording, without the earlier port's "at scale" / "GPU kernels"
 * phrasing). Validated by `ServicesSchema` in the content tests.
 */
export const services = [
  {
    title: "Autonomy Readiness Audit",
    description:
      "Map workflows, prompt surfaces, data paths, and approval gates to determine which tasks are safe to automate.",
    outcomes: ["Risk register", "Control-map", "90-day rollout plan"],
  },
  {
    title: "WDBX Retrieval Architecture",
    description:
      "Design weighted backtrace retrieval pipelines that preserve source context and support inspectable vector search.",
    outcomes: ["Index strategy", "Recall benchmarks", "Trace schema"],
  },
  {
    title: "Multi-Agent Orchestration",
    description:
      "Implement agent roles, tool permissions, task handoffs, and conflict-resolution policies.",
    outcomes: ["Agent graph", "Tool policy", "Evaluation harness"],
  },
  {
    title: "Model & Runtime Optimization",
    description:
      "Profile inference paths, memory pressure, batching, and edge constraints for real-world latency.",
    outcomes: ["Latency profile", "Optimization backlog", "Capacity model"],
  },
  {
    title: "Safety & Compliance Layering",
    description:
      "Embed policy checks, audit trails, and red-team scenarios into high-trust systems.",
    outcomes: ["Policy matrix", "Audit events", "Red-team scripts"],
  },
  {
    title: "Private AI Deployment",
    description: "Package workflows for VPC, on-premise, offline, and hybrid environments.",
    outcomes: ["Deployment topology", "Runbook", "Rollback plan"],
  },
  {
    title: "Research Translation",
    description:
      "Turn papers and notebooks into constrained, documented services engineers can maintain.",
    outcomes: ["Prototype hardening", "API contract", "Test plan"],
  },
  {
    title: "Executive & Engineering Workshops",
    description:
      "Align leadership, security, product, and engineering around autonomy strategy and risk boundaries.",
    outcomes: ["Decision memo", "Team training", "Architecture review"],
  },
  {
    title: "Continuous Evaluation Systems",
    description:
      "Build suites for tool use, retrieval faithfulness, safety behavior, and regression drift.",
    outcomes: ["Eval suite", "Scorecards", "Release gates"],
  },
] as const;

/** The four engagement phases on /services ("How an engagement runs"). */
export const engagement = [
  {
    title: "Audit",
    body: "Inventory workflows, data, tools, and failure modes. Ends with a risk register the next phase is not allowed to ignore.",
  },
  {
    title: "Design",
    body: "Bounded architecture: retrieval, policy, personas, deployment topology. Ends with a harness, not a slide.",
  },
  {
    title: "Build",
    body: "Implement against the harness on hardware you own. Ends with a baseline you can re-run.",
  },
  {
    title: "Harden",
    body: "Red-team, rollback, observability, and operator training. Ends with a gate, not a demo day.",
  },
] as const;
