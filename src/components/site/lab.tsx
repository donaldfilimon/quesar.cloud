import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ProvTag, type Provenance } from "./prov-tag";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function PullQuote({ children, className }: { children: ReactNode; className?: string }) {
  return <blockquote className={cn("pull-quote text-fg", className)}>{children}</blockquote>;
}

export function Callout({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("surface accent-edge p-5 [--edge:var(--accent)]", className)}>
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>
    </aside>
  );
}

export function StepList({
  steps,
}: {
  steps: readonly { title: string; body: string }[];
}) {
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.title} className="surface flex gap-4 p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[0.7rem] text-accent shadow-[var(--shadow-border)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-display text-xl">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <Accordion type="multiple" className="divide-y divide-border overflow-hidden rounded-xl shadow-[var(--shadow-border)]">
      {items.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function NextUp({
  items,
}: {
  items: { to: string; label: string; body: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className="surface surface-hover p-5 no-underline">
          <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Next</p>
          <h3 className="mt-2 font-display text-xl text-fg">{item.label}</h3>
          <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
        </Link>
      ))}
    </div>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-bg-elevated shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
          {label ?? "source"}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] text-fg-muted hover:bg-bg-subtle hover:text-fg"
        >
          {copied ? <Check className="size-3.5" strokeWidth={1.75} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-5 font-mono text-[0.8rem] leading-7 text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function SpecList({
  rows,
}: {
  rows: readonly { k: string; v: string; tag?: Provenance }[];
}) {
  return (
    <dl className="surface divide-y divide-border overflow-hidden">
      {rows.map((row) => (
        <div key={row.k} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <dt className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase">{row.k}</dt>
          <dd className="flex items-center gap-2 font-mono text-sm text-fg tabular">
            <span>{row.v}</span>
            {row.tag ? <ProvTag tag={row.tag} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
