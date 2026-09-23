import type { ReactNode } from "react";
import { AppLink } from "./app-link";
import { CodeBlock } from "./lab";
import { Surface } from "./section";

type Section = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  math?: string[];
  code?: { lang?: string; file?: string; code: string }[];
  note?: string;
};

export function ArticleBody({
  sections,
  children,
}: {
  sections: readonly Section[];
  children?: ReactNode;
}) {
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
            <p
              key={p.slice(0, 48)}
              className="mt-4 max-w-[66ch] text-[1.0625rem] leading-8 text-fg"
            >
              {p}
            </p>
          ))}
          {section.list?.length ? (
            <ul className="mt-5 max-w-[66ch] space-y-3">
              {section.list.map((item) => (
                <li key={item} className="flex gap-3 text-[1.0625rem] leading-8 text-fg">
                  <span
                    className="mt-3 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {section.math?.map((tex) => (
            <pre
              key={tex}
              className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted px-4 py-3 font-mono text-[0.8rem] leading-7 text-foreground"
            >
              {tex}
            </pre>
          ))}
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

export function SourceChips({
  sources,
}: {
  sources: readonly { title: string; url: string; scope?: string }[];
}) {
  if (!sources.length) return null;
  return (
    <ul className="mt-8 space-y-3">
      {sources.map((source) => (
        <li key={source.title} className="surface p-4">
          <AppLink
            to={source.url}
            className="text-sm font-medium text-accent no-underline hover:underline"
          >
            {source.title}
          </AppLink>
          {source.scope ? <p className="mt-1 text-xs text-fg-muted">{source.scope}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Equation({ tex, note }: { tex: string; note?: string }) {
  return (
    <Surface className="mt-4">
      <pre className="overflow-x-auto font-mono text-[0.85rem] leading-7 text-fg">{tex}</pre>
      {note ? <p className="mt-3 text-sm leading-relaxed text-fg-muted">{note}</p> : null}
    </Surface>
  );
}
