import type { ReactNode } from "react";
import { BlockMath } from "@/components/math/math";
import { CodeBlock } from "./lab";

type Section = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  math?: string[];
  code?: { lang?: string; file?: string; code: string }[];
  note?: string;
};

/**
 * `ArticleBody` with KaTeX equations. mlai's article, DocPage and research
 * renderers typeset `section.math` through `BlockMath`; the shared
 * `ArticleBody` shows raw TeX in a `<pre>`. Markup and ids otherwise match
 * `ArticleBody`, so `DocOutline` anchors keep working.
 */
export function MathArticleBody({ sections, children }: { sections: readonly Section[]; children?: ReactNode }) {
  return (
    <div className="max-w-3xl space-y-10">
      {sections.map((section, index) => (
        <article key={`${section.heading ?? "block"}-${index}`}>
          {section.heading ? (
            <h2
              id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              className="scroll-mt-24 font-display text-[1.65rem] leading-tight tracking-tight text-fg"
            >
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs?.map((p) => (
            <p key={p.slice(0, 48)} className="mt-4 max-w-[66ch] text-[1.0625rem] leading-8 text-fg">
              {p}
            </p>
          ))}
          {section.list?.length ? (
            <ul className="mt-5 max-w-[66ch] space-y-3">
              {section.list.map((item) => (
                <li key={item} className="flex gap-3 text-[1.0625rem] leading-8 text-fg">
                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {section.math?.length ? (
            <div className="mt-4 space-y-3 overflow-x-auto rounded-lg border border-border bg-muted/50 px-4 py-3 text-fg">
              {section.math.map((tex) => (
                <BlockMath key={tex} tex={tex} />
              ))}
            </div>
          ) : null}
          {section.code?.map((block, i) => (
            <div key={`${block.file ?? block.lang ?? "code"}-${i}`} className="mt-4">
              <CodeBlock code={block.code} label={block.file ?? block.lang ?? "source"} />
            </div>
          ))}
          {section.note ? (
            <p className="mt-5 max-w-[66ch] border-l-2 border-primary/50 bg-muted/50 px-4 py-3 text-base leading-7 text-fg">
              {section.note}
            </p>
          ) : null}
        </article>
      ))}
      {children}
    </div>
  );
}
