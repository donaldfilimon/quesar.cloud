import { site } from "@/lib/site-identity";

import type { About } from "../schemas";

/**
 * Brand and proposed business model, stated once. The historical `legalName`
 * field is retained for consumers; its value is a brand, not registration evidence.
 */
export const companyIdentity = {
  legalName: site.company,
  entity: "Founder-led AI engineering",
  model: "Proposed SDK licensing + integration services",
} as const;

export const about: About = {
  values: [
    {
      title: "Safety Before Scale",
      description:
        "Our proposed engineering approach starts with bounded execution, explicit approvals, and failure criteria before expanding capability or throughput.",
    },
    {
      title: "Observable Reasoning",
      description:
        "We aim to expose provenance, retrieval context, decision checkpoints, and the operator actions that changed state. Each implementation needs its own evidence.",
    },
    {
      title: "Performance With Proof",
      description:
        "Our evidence policy requires workload and environment notes for latency, recall, and GPU figures, and a reproduction record before calling them measured.",
    },
    {
      title: "Private Deployment Paths",
      description:
        "Proposed deployment work starts by agreeing the data boundary and evaluating on-premise, VPC, hybrid, or edge requirements.",
    },
    {
      title: "Human-Centered Control",
      description:
        "We propose visible escalation, review, and override flows, with acceptance criteria agreed by the people responsible for the system.",
    },
    {
      title: "Research-To-Runtime Discipline",
      description:
        "Research translation engagements propose integration notes, constraints, and operational guidance; a prototype needs separate release acceptance.",
    },
  ],
  operatingPrinciples: [
    "No autonomous write action without an observable policy boundary.",
    "No retrieval claim without a traceable source or confidence signal.",
    "No benchmark without environment notes, workload shape, and reproducibility context.",
    "No deployment plan that ignores rollback, incident review, and human escalation.",
  ],

  // Brand and source orientation. Registration and location require separate evidence.
  companyFacts: [
    { k: "Brand", v: companyIdentity.legalName },
    { k: "Focus", v: companyIdentity.entity },
    // Rust runtime (ABI, WDBX), Swift companions, TypeScript sites. Zig is
    // founder research only (integrityRules "Toolchain facts").
    { k: "Languages", v: "Rust, Swift, TypeScript" },
    { k: "Model", v: companyIdentity.model },
  ],

  // Proposed evaluation questions, not legal, device-adoption, or cost findings.
  investorThesis: [
    {
      title: "Define the data boundary",
      description:
        "Evaluate where a workload may run, which data may leave the operator's environment, and which obligations need separate legal review.",
    },
    {
      title: "Evaluate available hardware",
      description:
        "Inspect the target device, runtime support, and workload before proposing local inference or acceleration.",
    },
    {
      title: "Measure the full operating cost",
      description:
        "Compare hardware, energy, maintenance, and provider costs using an agreed workload; local execution alone does not establish unit economics.",
    },
  ],
};
