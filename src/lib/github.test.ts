import { describe, expect, it } from "vitest";
import { excerptMarkdown } from "./github";

describe("excerptMarkdown", () => {
  it("returns an empty string for empty or blank input", () => {
    expect(excerptMarkdown("")).toBe("");
    expect(excerptMarkdown("\n\n   \n")).toBe("");
  });

  it("drops ATX heading lines and keeps the prose", () => {
    expect(excerptMarkdown("# Title\n\n## Sub\n\nBody text.")).toBe("Body text.");
  });

  it("drops setext heading underlines", () => {
    expect(excerptMarkdown("Intro line\n===\n\nBody text.")).toBe("Intro line Body text.");
    expect(excerptMarkdown("Intro line\n---\n\nBody text.")).toBe("Intro line Body text.");
  });

  it("keeps link text and removes the URL", () => {
    expect(excerptMarkdown("See [the docs](https://example.com/docs) for more.")).toBe(
      "See the docs for more.",
    );
  });

  it("removes images, including linked badges", () => {
    expect(excerptMarkdown("![logo](logo.png) Hello")).toBe("Hello");
    expect(
      excerptMarkdown("[![build](https://img.shields.io/x.svg)](https://ci.example) Ready."),
    ).toBe("Ready.");
  });

  it("removes fenced code blocks", () => {
    const md = "Before.\n\n```bash\nnpm install secret-thing\n```\n\nAfter.";
    expect(excerptMarkdown(md)).toBe("Before. After.");
  });

  it("strips HTML tags, tables, rules and task/TOC list items", () => {
    const md = [
      '<p align="center"><img src="x.png"></p>',
      "| a | b |",
      "***",
      "- [Install](#install)",
      "* [Usage](#usage)",
      "Real <b>content</b> here.",
    ].join("\n");
    expect(excerptMarkdown(md)).toBe("Real content here.");
  });

  it("uses at most the first four kept lines", () => {
    expect(excerptMarkdown("one\ntwo\nthree\nfour\nfive")).toBe("one two three four");
  });

  it("does not count badge-only lines toward the four-line limit", () => {
    const md = "[![ci](https://img.shields.io/ci.svg)](https://ci.example)\none\ntwo\nthree\nfour";
    expect(excerptMarkdown(md)).toBe("one two three four");
  });

  it("returns text of exactly 420 characters untouched", () => {
    const text = "a".repeat(420);
    expect(excerptMarkdown(text)).toBe(text);
  });

  it("truncates long text on a word boundary with an ellipsis", () => {
    const text = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ");
    const out = excerptMarkdown(text);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(418);
    const body = out.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    expect(text[body.length]).toBe(" ");
  });

  it("hard-cuts a single unbroken token longer than the limit", () => {
    expect(excerptMarkdown("x".repeat(1000))).toBe(`${"x".repeat(417)}…`);
  });
});
