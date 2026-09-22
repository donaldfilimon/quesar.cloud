/**
 * Section-aware recovery copy for the root not-found page. Ported from mlai
 * `src/views/NotFound.tsx` (`recoveryForPathname`) as a pure function, so the
 * component can derive it from the router location during SSR instead of
 * reading `window` in an effect.
 */

export type Recovery = {
  eyebrow: string;
  title: string;
  body: string;
  backTo: string;
  backLabel: string;
};

export const SECTION_RECOVERY = {
  docs: {
    eyebrow: "404 — Document not found",
    title: "That document doesn't exist.",
    body: "It may have been renamed or retired. Browse the documentation instead.",
    backTo: "/docs",
    backLabel: "All documentation",
  },
  blog: {
    eyebrow: "404 — Note not found",
    title: "That lab note doesn't exist.",
    body: "It may have been renamed or retired. Browse the latest notes instead.",
    backTo: "/blog",
    backLabel: "All notes",
  },
  research: {
    eyebrow: "404 — Paper not found",
    title: "That research note doesn't exist.",
    body: "It may have been renamed or retired. Browse the research archive instead.",
    backTo: "/research",
    backLabel: "Research archive",
  },
  products: {
    eyebrow: "404 — Product not found",
    title: "That product doesn't exist.",
    body: "It may have been renamed or retired. Browse the current products instead.",
    backTo: "/products",
    backLabel: "All products",
  },
  projects: {
    eyebrow: "404 — Project not found",
    title: "That project doesn't exist.",
    body: "It may have been renamed or retired. Browse the projects directory instead.",
    backTo: "/projects",
    backLabel: "All projects",
  },
  team: {
    eyebrow: "404 — Profile not found",
    title: "That profile doesn't exist.",
    body: "The profile may have moved. Return to the team directory instead.",
    backTo: "/team",
    backLabel: "Back to the team",
  },
} as const satisfies Record<string, Recovery>;

export const DEFAULT_RECOVERY: Recovery = {
  eyebrow: "404 — Page not found",
  title: "This path doesn't resolve.",
  body: "The page you're looking for may have been moved, renamed, or never existed. That path is not part of the public Quesar site.",
  backTo: "/",
  backLabel: "Back to home",
};

export const SUGGESTED_DESTINATIONS = [
  { to: "/architecture", label: "Architecture" },
  { to: "/research", label: "Research" },
  { to: "/docs", label: "Docs" },
  { to: "/benchmarks", label: "Benchmarks" },
  { to: "/blog", label: "Lab notes" },
] as const;

export function recoveryForPathname(pathname: string): Recovery {
  const section = pathname.split("/")[1] ?? "";
  return Object.hasOwn(SECTION_RECOVERY, section)
    ? SECTION_RECOVERY[section as keyof typeof SECTION_RECOVERY]
    : DEFAULT_RECOVERY;
}
