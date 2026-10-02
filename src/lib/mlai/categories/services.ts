import type { Refusals } from "../schemas";

/**
 * "What we say no to" — proposed engagement boundaries from the design
 * handoff (design-sources/handoffs/design_handoff_mlai_site Services page).
 * Rendered as `site/Callout` asides on the Services view; `accent` is the
 * product accent axis the handoff assigned each callout.
 */
export const refusals = [
  {
    label: "Scope discipline",
    accent: "abbey",
    body: "Proposed engagement boundary: agree who may access the corpus, where it may move, and which provider calls require approval before implementation.",
  },
  {
    label: "Claims discipline",
    accent: "wdbx",
    body: "Proposed evidence requirement: deliverables should tag figures as targets, source reports, or measurements. Measurements require an agreed workload, environment, and reproduction record.",
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
      "Proposed scope: map workflows, prompt surfaces, data paths, and approval gates to identify automation candidates and the evidence needed to evaluate their risks.",
    outcomes: ["Risk register", "Control-map", "90-day rollout plan"],
  },
  {
    title: "WDBX Retrieval Architecture",
    description:
      "Proposed scope: design retrieval pipelines with source context and inspectable vector search; evaluate weighted backtrace approaches separately.",
    outcomes: ["Index strategy", "Recall benchmarks", "Trace schema"],
  },
  {
    title: "Multi-Agent Orchestration",
    description:
      "Proposed scope: define and implement agent roles, tool permissions, task handoffs, and conflict-resolution policies against agreed acceptance criteria.",
    outcomes: ["Agent graph", "Tool policy", "Evaluation harness"],
  },
  {
    title: "Model & Runtime Optimization",
    description:
      "Proposed scope: profile inference paths, memory pressure, batching, and edge constraints on an agreed workload and environment.",
    outcomes: ["Latency profile", "Optimization backlog", "Capacity model"],
  },
  {
    title: "Safety & Compliance Layering",
    description:
      "Proposed scope: develop policy checks, audit trails, and red-team scenarios for an agreed system boundary. Legal or compliance acceptance requires separate review.",
    outcomes: ["Policy matrix", "Audit events", "Red-team scripts"],
  },
  {
    title: "Private AI Deployment",
    description:
      "Proposed scope: assess and package workflows for an agreed VPC, on-premise, offline, or hybrid deployment boundary.",
    outcomes: ["Deployment topology", "Runbook", "Rollback plan"],
  },
  {
    title: "Research Translation",
    description:
      "Proposed scope: translate papers and notebooks into a constrained prototype, API contract, and test plan.",
    outcomes: ["Prototype hardening", "API contract", "Test plan"],
  },
  {
    title: "Executive & Engineering Workshops",
    description:
      "Proposed scope: run workshops with leadership, security, product, and engineering to document autonomy decisions and risk boundaries.",
    outcomes: ["Decision memo", "Team training", "Architecture review"],
  },
  {
    title: "Continuous Evaluation Systems",
    description:
      "Proposed scope: build evaluation suites for tool use, retrieval faithfulness, policy behavior, and regression drift against agreed criteria.",
    outcomes: ["Eval suite", "Scorecards", "Release gates"],
  },
] as const;

/** Proposed phases; scope, deliverables, and acceptance must be agreed per project. */
export const engagement = [
  {
    title: "Audit",
    body: "Proposed deliverable: an inventory of workflows, data, tools, and failure modes, with a risk register for review before design.",
  },
  {
    title: "Design",
    body: "Proposed deliverables: a bounded architecture for retrieval, permissions, personas, and deployment, plus an agreed evaluation harness.",
  },
  {
    title: "Build",
    body: "Proposed deliverables: an implementation on agreed operator-owned hardware and a baseline the team can rerun against the harness.",
  },
  {
    title: "Harden",
    body: "Proposed deliverables: red-team checks, rollback guidance, observability, operator training, and a release gate with explicit acceptance criteria.",
  },
] as const;
