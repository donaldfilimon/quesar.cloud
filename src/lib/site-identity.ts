/**
 * Site identity, primary nav and the status vocabulary. Kept tiny because the
 * root route and header load on every page: anything imported here lands in
 * the entry chunk. Status labels live in `@/lib/status-copy`.
 */

export type StatusKind =
  "current" | "partial" | "experimental" | "development" | "planned" | "research";

export const site = {
  name: "Quesar",
  company: "MLAI",
  legal: "Machine Learning Advanced Innovations, Inc.",
  description:
    "Quesar is the large model that trains and improves Abbey, Aviva, and the other assistants. This website does not host the model, run training, or host assistant sessions.",
  mission:
    "Build assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries.",
  origin:
    "Three voices, not one: Abbey for care, Aviva for clarity, Abi for competence. One substrate. Yours alone.",
  apple:
    "MLAI software is independent and is not affiliated with, endorsed by, or sponsored by Apple Inc.",
} as const;

export const nav = [
  { to: "/quesar", label: "Quesar" },
  { to: "/platform", label: "Platform" },
  { to: "/docs", label: "Docs" },
  { to: "/apps", label: "Apps" },
  { to: "/company", label: "Company" },
] as const;
