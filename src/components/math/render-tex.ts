// Split out of math.tsx so that module exports only components (fast refresh).
// Type-only reference to katex: the module itself is loaded on demand in math.tsx.
export type Katex = Pick<typeof import("katex"), "renderToString">;

/** KaTeX options shared by every equation: MathML for assistive tech, never throw. */
export function renderTex(katex: Katex, tex: string): string {
  // htmlAndMathml: the visible HTML is aria-hidden and screen readers get the
  // MathML copy, which katex.min.css hides visually. Plain "html" gave
  // assistive tech nothing but glyph soup.
  return katex.renderToString(tex, {
    displayMode: true,
    throwOnError: false,
    output: "htmlAndMathml",
  });
}
