/**
 * Site identity, primary nav and the status vocabulary. Kept apart from
 * `@/lib/content` because the root route and header load on every page: importing
 * the full content catalog there would put all of it in the entry chunk.
 * `@/lib/content` re-exports these, so either import path works.
 */

export type StatusKind =
  "current" | "partial" | "experimental" | "development" | "planned" | "research";

export const site = {
  name: "Quesar",
  company: "MLAI",
  legal: "Machine Learning Advanced Innovations, Inc.",
  description:
    "Quesar is MLAI's infrastructure for persistent, adaptive AI — inspectable orchestration, provenance-aware memory, and compute that stays on machines you own.",
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
