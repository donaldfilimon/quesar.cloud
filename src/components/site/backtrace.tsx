import { cn } from "@/lib/utils";

type TraceRow = {
  src: string;
  weight: number;
  excerpt: string;
  id: string;
  parent: string;
  persona: "Aviva" | "Abi" | "Abbey";
  dot: string;
  text: string;
};

const rows: TraceRow[] = [
  {
    src: "runbook/retention-policy.md",
    weight: 0.94,
    excerpt: "EU records stay in-region; no cross-border egress.",
    id: "blk_8f21c4",
    parent: "a17d",
    persona: "Aviva",
    dot: "bg-persona-aviva",
    text: "text-persona-aviva",
  },
  {
    src: "contracts/dpa-2026.pdf",
    weight: 0.71,
    excerpt: "Processor may not sub-process without written notice.",
    id: "blk_8f21b0",
    parent: "6c02",
    persona: "Abi",
    dot: "bg-persona-abi",
    text: "text-persona-abi",
  },
  {
    src: "thread/eng-platform#412",
    weight: 0.38,
    excerpt: "Earlier draft, superseded and kept for audit.",
    id: "blk_8f2196",
    parent: "3e9f",
    persona: "Abbey",
    dot: "bg-persona-abbey",
    text: "text-persona-abbey",
  },
];

/**
 * The home page's one memorable object: an answer with the weighted,
 * hash-chained sources that produced it (a WDBX backtrace). Illustrative data;
 * the bar length is the retrieval weight, never a live score. The chain rule
 * draws in once on load (`.chain-draw`, off under reduced motion).
 */
export function Backtrace({ className }: { className?: string }) {
  return (
    <figure className={cn("rounded-lg bg-bg-elevated shadow-[var(--shadow-border)]", className)}>
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-sm text-fg-muted">Answer</p>
        <p className="mt-1.5 font-display text-xl leading-snug tracking-tight sm:text-2xl">
          Keep the German customer records in-region.
        </p>
      </div>
      <div className="relative px-5 py-5 sm:px-6">
        <span
          className="chain-draw absolute top-7 bottom-9 left-[1.6rem] w-0.5 bg-accent sm:left-[1.85rem]"
          aria-hidden="true"
        />
        <p className="pl-7 text-sm text-fg-muted">Because of, strongest first</p>
        <ol className="relative mt-3 grid gap-4">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5">
              <span
                className={cn(
                  "relative mt-1.5 size-2.5 justify-self-center rounded-full ring-4 ring-bg-elevated",
                  row.dot,
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-xs text-fg-muted">{row.src}</span>
                  <span className={cn("font-mono text-xs tabular-nums", row.text)}>
                    {row.weight.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[0.9375rem] leading-snug text-fg">{row.excerpt}</p>
                <div className="mt-2 h-1 rounded-full bg-muted" aria-hidden="true">
                  <i
                    className={cn("block h-full rounded-full", row.dot)}
                    style={{ width: `${row.weight * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-2xs text-fg-subtle">
                  {row.id} <span aria-hidden="true">←</span>
                  <span className="sr-only">parent</span> {row.parent}{" "}
                  <span className="sr-only">, via {row.persona}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="border-t border-border px-5 py-3 text-xs text-fg-subtle sm:px-6">
        Illustrative trace. Bar length is the retrieval weight; each block names its parent hash.
      </figcaption>
    </figure>
  );
}
