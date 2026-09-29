import type { StatusKind } from "@/lib/site-identity";

/** Labels and meanings for the site-wide claim-discipline status (`StatusKind`), rendered by `StatusBadge` and the legend on /company. */

export const statusCopy: Record<StatusKind, { mark: string; label: string; meaning: string }> = {
  current: {
    mark: "●",
    label: "Current",
    meaning: "Present in public source and used as described.",
  },
  partial: {
    mark: "◐",
    label: "Partial",
    meaning: "Implemented in part. Scope is named on the page.",
  },
  experimental: {
    mark: "◌",
    label: "Experimental",
    meaning: "Runnable or inspectable, not a product claim.",
  },
  development: {
    mark: "◦",
    label: "In development",
    meaning: "Actively changing. Do not treat as stable.",
  },
  planned: { mark: "○", label: "Planned", meaning: "Intent. Never presented as shipping." },
  research: {
    mark: "◆",
    label: "Research",
    meaning: "Founder or lab work. Not a Quesar product surface.",
  },
};
