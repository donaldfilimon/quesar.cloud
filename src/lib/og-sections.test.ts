import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OG_SECTIONS, ogImage } from "./og-sections";

describe("Open Graph section cards", () => {
  it("has a rendered card for every section (bun run og:images)", () => {
    for (const section of OG_SECTIONS)
      expect(existsSync(`public${ogImage(section.slug)}`), section.slug).toBe(true);
  });
});
