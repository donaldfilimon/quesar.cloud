import { describe, expect, it } from "vitest";
import { LLMS_EXCLUDED, buildLlmsTxt } from "./llms-txt";
import { site } from "./site-identity";

const text = buildLlmsTxt();
const lines = text.split("\n");
const links = lines.filter((l) => l.startsWith("- ["));

describe("buildLlmsTxt", () => {
  it("starts with the site name and carries the description quote", () => {
    expect(lines[0]).toBe(`# ${site.name}`);
    expect(lines).toContain(`> ${site.description}`);
  });

  it("orders the section headings", () => {
    const headings = lines.filter((l) => l.startsWith("## "));
    const order = ["Site", "Docs", "Research", "Projects", "More"].map((h) => `## ${h}`);
    const idx = headings.map((h) => order.indexOf(h));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(headings[0]).toBe("## Site");
  });

  it("links only to absolute pages on the canonical origin, without duplicates", () => {
    expect(links.length).toBeGreaterThan(20);
    const urls = links.map((l) => /\]\((.*?)\)/.exec(l)?.[1] ?? "");
    for (const url of urls) expect(url.startsWith("https://quesar.cloud/")).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps every body within 160 characters", () => {
    for (const l of links) {
      const body = l.slice(l.indexOf("): ") + 3);
      expect(body.length).toBeGreaterThan(0);
      expect(body.length).toBeLessThanOrEqual(160);
    }
  });

  it("never lists private or noindex routes", () => {
    const paths = links.map(
      (l) => (/\]\(https:\/\/quesar\.cloud(.*?)\)/.exec(l)?.[1] ?? "").split("#")[0],
    );
    for (const path of paths)
      for (const prefix of LLMS_EXCLUDED)
        expect(path === prefix || path.startsWith(`${prefix}/`), path).toBe(false);
  });

  it("does not repeat the description as the mission paragraph", () => {
    const same = lines.filter((l) => l.replace(/^> /, "") === site.description);
    expect(same).toHaveLength(1);
  });
});
