import { useEffect, useState } from "react";
// The stylesheet lays out the visible HTML and visually hides the MathML copy
// that screen readers read. It rides with this component, so any page that
// renders an equation gets it.
import "katex/dist/katex.min.css";
import { renderTex, type Katex } from "./render-tex";

/** Renders a display-mode (block) LaTeX equation via KaTeX.
 *
 *  Ported from mlai `src/components/Math.tsx` (b6f3686). KaTeX (~250 kB parsed)
 *  is loaded on demand the first time an equation mounts, instead of riding in
 *  every article page's first-load bundle. While it loads (and during SSR), the
 *  raw TeX shows in mono as a stable-height placeholder. Errors render in place
 *  (throwOnError: false) instead of crashing the page.
 */

let katexModule: Katex | null = null;
let katexPromise: Promise<Katex> | null = null;

function loadKatex(): Promise<Katex> {
  if (!katexPromise) {
    katexPromise = import("katex").then((mod) => {
      katexModule = (mod as unknown as { default?: Katex }).default ?? (mod as unknown as Katex);
      return katexModule;
    });
  }
  return katexPromise;
}

export function BlockMath({ tex }: { tex: string }) {
  const [katex, setKatex] = useState<Katex | null>(katexModule);

  useEffect(() => {
    if (!katex) {
      let alive = true;
      loadKatex().then((k) => {
        if (alive) setKatex(() => k);
      });
      return () => {
        alive = false;
      };
    }
  }, [katex]);

  if (!katex) {
    return (
      // tabIndex: a wide equation scrolls inside this box, so keyboard users
      // need to be able to focus it to scroll (WCAG 2.1.1, axe scrollable-region-focusable).
      <div
        tabIndex={0}
        className="my-1 overflow-x-auto rounded-lg border border-border bg-bg-subtle px-5 py-4 font-mono text-xs text-fg-subtle"
      >
        {tex}
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      className="my-1 overflow-x-auto rounded-lg border border-border bg-bg-subtle px-5 py-4 text-[0.95em] text-fg"
      // KaTeX output generated from trusted in-repo LaTeX strings, rendered
      // with output:"htmlAndMathml" and throwOnError:false. No user input reaches this.
      dangerouslySetInnerHTML={{ __html: renderTex(katex, tex) }}
    />
  );
}
