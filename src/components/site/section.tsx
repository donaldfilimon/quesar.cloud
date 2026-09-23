import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./lab";

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28",
        id && !className?.includes("scroll-mt") && "scroll-mt-20",
        className,
      )}
    >
      {eyebrow || title || lede ? (
        <header className="mb-12 max-w-3xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? <h2 className="section-title mt-4 text-fg">{title}</h2> : null}
          {lede ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">{lede}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Page opener for inner pages: label, title and lede on the plain page ground. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="border-b border-border">
      <div className={compact ? "mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" : "mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20"}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          className={
            compact
              ? "mt-3 max-w-4xl font-display text-3xl leading-tight tracking-tight text-fg sm:text-4xl"
              : "mt-5 max-w-4xl font-display text-4xl leading-[1.02] tracking-tight text-fg sm:text-5xl lg:text-6xl"
          }
        >
          {title}
        </h1>
        <p className={compact ? "mt-4 max-w-[66ch] text-base leading-7 text-fg-muted" : "mt-6 max-w-[62ch] text-lg leading-8 text-fg-muted"}>
          {lede}
        </p>
        {children}
      </div>
    </div>
  );
}

export function Surface({
  className,
  accent,
  hover = false,
  children,
}: {
  className?: string;
  accent?: "accent" | "abi" | "wdbx" | "abbey" | "aviva";
  hover?: boolean;
  children: ReactNode;
}) {
  const edge =
    accent === "abi"
      ? "[--edge:var(--abi)]"
      : accent === "wdbx"
        ? "[--edge:var(--wdbx)]"
        : accent === "abbey"
          ? "[--edge:var(--abbey)]"
          : accent === "aviva"
            ? "[--edge:var(--aviva)]"
            : "[--edge:var(--accent)]";
  return (
    <article className={cn("surface accent-edge p-6", hover && "surface-hover", accent && edge, className)}>
      {children}
    </article>
  );
}
