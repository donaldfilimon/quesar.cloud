import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, readThemeTokens, relativeLuminance } from "./color-contrast";

describe("color-contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777", "#fff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#767676", "#fff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#fff", "#777")).toBeCloseTo(contrastRatio("#777", "#fff"), 10);
  });

  it("computes relative luminance at the extremes", () => {
    expect(relativeLuminance(parseColor("#ffffff"))).toBeCloseTo(1, 6);
    expect(relativeLuminance(parseColor("#000000"))).toBe(0);
  });

  it("converts oklch to sRGB", () => {
    for (const v of parseColor("oklch(1 0 0)")) expect(v).toBeCloseTo(1, 3);
    for (const v of parseColor("oklch(0% 0 0)")) expect(v).toBeCloseTo(0, 6);
    // oklch(0.62796 0.25768 29.2339) is sRGB red.
    const [r, g, b] = parseColor("oklch(0.62796 0.25768 29.2339)");
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    // #777 is oklch(0.5693 0 0): L is the cube root of its luminance 0.1845.
    expect(contrastRatio("oklch(56.93% 0 0)", "#fff")).toBeCloseTo(4.48, 1);
  });

  it("rejects unsupported colors", () => {
    expect(() => parseColor("red")).toThrow();
    expect(() => parseColor("#12")).toThrow();
    expect(() => parseColor("oklch(nope)")).toThrow();
  });

  it("reads and resolves tokens from a CSS block", () => {
    const css = `/* c */\n:root,\n[data-theme="light"] {\n  --a: #fff;\n  --b: var(--a);\n}\n[data-theme="dark"] { --a: #000; }`;
    expect(readThemeTokens(css, `:root, [data-theme="light"]`)).toEqual({
      "--a": "#fff",
      "--b": "#fff",
    });
    expect(readThemeTokens(css, `[data-theme="dark"]`)["--a"]).toBe("#000");
    expect(() => readThemeTokens(css, ".missing")).toThrow();
  });
});
