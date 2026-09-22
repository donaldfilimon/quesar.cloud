import { describe, expect, it } from "vitest";
import { DEFAULT_RECOVERY, recoveryForPathname } from "./not-found";

// Ported from mlai src/__tests__/not-found-recovery.test.tsx. The render half
// is covered by the component reading the router location; this keeps the
// pure mapping.
const sections = [
  { pathname: "/docs/missing", heading: "Document not found", href: "/docs" },
  { pathname: "/blog/missing", heading: "Note not found", href: "/blog" },
  { pathname: "/research/missing", heading: "Paper not found", href: "/research" },
  { pathname: "/products/missing", heading: "Product not found", href: "/products" },
  { pathname: "/projects/missing", heading: "Project not found", href: "/projects" },
  { pathname: "/team/missing", heading: "Profile not found", href: "/team" },
] as const;

describe("not-found recovery", () => {
  it.each(sections)("offers section-specific recovery for $pathname", ({ pathname, heading, href }) => {
    const recovery = recoveryForPathname(pathname);
    expect(recovery.eyebrow).toContain(heading);
    expect(recovery.backTo).toBe(href);
  });

  it("keeps the generic recovery for an unrelated or inherited-property path", () => {
    for (const path of ["/", "/nope", "/toString/x", "/constructor"]) {
      expect(recoveryForPathname(path)).toBe(DEFAULT_RECOVERY);
    }
  });
});
