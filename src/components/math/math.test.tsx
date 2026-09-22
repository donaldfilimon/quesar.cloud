import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import katex from "katex";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockMath, renderTex } from "./math";

// Source guards ported from mlai `src/__tests__/{a11y-source,reflow}.test.ts`
// (b6f3686), pointed at this file.
const src = readFileSync(resolve(__dirname, "math.tsx"), "utf8");

describe("BlockMath source guards", () => {
  it("emits MathML for screen readers, with the stylesheet that hides it visually", () => {
    expect(src).toContain('output: "htmlAndMathml"');
    expect(src).not.toContain('output: "html",');
    expect(src).toContain('import "katex/dist/katex.min.css";');
  });

  it("keeps both scrollable boxes keyboard-focusable", () => {
    expect(src.match(/tabIndex=\{0\}/g)?.length).toBe(2);
  });

  it("scrolls wide equations within its own box", () => {
    expect(src.match(/overflow-x-auto/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("loads KaTeX only through a dynamic import", () => {
    expect(src).toContain('import("katex")');
    expect(src).not.toMatch(/^import[^;]*from\s+["']katex["']/m);
  });
});

describe("renderTex", () => {
  it("renders an accessible MathML copy beside the visible HTML", () => {
    const html = renderTex(katex, String.raw`\sum_{i=1}^{n} x_i`);
    expect(html).toContain("katex-mathml");
    expect(html).toContain("<math");
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders bad TeX in place instead of throwing", () => {
    expect(() => renderTex(katex, String.raw`\frac{1}{`)).not.toThrow();
  });
});

describe("BlockMath server render", () => {
  it("renders the raw TeX placeholder before KaTeX loads", () => {
    const html = renderToString(<BlockMath tex="E = mc^2" />);
    expect(html).toContain("E = mc^2");
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("katex-mathml");
  });
});
