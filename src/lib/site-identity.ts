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
  legal: "MLAI",
  contact: {
    email: "cbkshadow@icloud.com",
    phone: "813-755-0156",
    phoneInternational: "+18137550156",
  },
  description:
    "Build assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries.",
  mission:
    "Build assistant workflows, memory systems, and developer tools with inspectable sources and explicit implementation boundaries.",
  origin:
    "Three voices, not one: Abbey for care, Aviva for clarity, Abi for competence. One substrate. Yours alone.",
  apple:
    "MLAI software is independent and is not affiliated with, endorsed by, or sponsored by Apple Inc.",
} as const;

export const nav = [
  { to: "/products", label: "Products" },
  { to: "/platform", label: "Platform" },
  { to: "/developers", label: "Developers" },
  { to: "/research", label: "Research" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
] as const;
