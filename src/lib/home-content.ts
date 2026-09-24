/**
 * Home-page copy. Kept apart from `@/lib/content` so the home route does not
 * preload the full content catalog. Import from here, not `@/lib/content`.
 */

export const homeStart = [
  {
    title: "Understand the architecture",
    body: "Inspect each layer, its source-backed behavior, and the limits named beside it.",
    href: "/architecture",
  },
  {
    title: "Explore the research",
    body: "Read the ideas, citations, and implementation limits behind the system.",
    href: "/research",
  },
  {
    title: "Compare the products",
    body: "See what each surface does, how to try it, and what remains in development.",
    href: "/products",
  },
  {
    title: "Read the source",
    body: "Open the public repositories and their local setup guides.",
    href: "/developers",
  },
] as const;

export const homePrivacy = [
  {
    title: "Local by default",
    body: "Workspaces, stores, and runtimes execute on operator-owned machines. This website does not host assistant sessions.",
  },
  {
    title: "Memory you can inspect",
    body: "WDBX records are content-addressed, signed, and recoverable. Persistence that did not happen is not reported as success.",
  },
  {
    title: "Explicit remote",
    body: "Cloud backends and live providers are optional and credential-gated. They are not the architecture's center.",
  },
  {
    title: "Honest limits",
    body: "We do not claim unhackable systems, military-grade anything, or 100% privacy. Security language tracks the source.",
  },
] as const;
