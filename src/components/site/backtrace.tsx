import { cn } from "@/lib/utils";
import { Instrument } from "./instrument";

type TraceRow = {
  src: string;
  weight: string;
  width: string;
  excerpt: string;
  id: string;
  parent: string;
  persona: "Aviva" | "Abi" | "Abbey";
  node: string;
  bar: string;
  label: string;
};

const rows: TraceRow[] = [
  {
    src: "runbook/retention-policy.md",
    weight: "0.94",
    width: "94%",
    excerpt: "EU records stay in-region; no cross-border egress.",
    id: "blk_8f21c4",
    parent: "a17d…",
    persona: "Aviva",
    node: "bg-persona-aviva",
    bar: "bg-persona-aviva",
    label: "text-persona-aviva",
  },
  {
    src: "contracts/dpa-2026.pdf",
    weight: "0.71",
    width: "71%",
    excerpt: "Processor may not sub-process without written notice.",
    id: "blk_8f21b0",
    parent: "6c02…",
    persona: "Abi",
    node: "bg-persona-abi",
    bar: "bg-persona-abi",
    label: "text-persona-abi",
  },
  {
    src: "thread/eng-platform#412",
    weight: "0.38",
    width: "38%",
    excerpt: "Earlier draft — superseded, retained for audit.",
    id: "blk_8f2196",
    parent: "3e9f…",
    persona: "Abbey",
    node: "bg-persona-abbey",
    bar: "bg-persona-abbey",
    label: "text-persona-abbey",
  },
];

/** Signature Lab element: a weighted, hash-chained backtrace. Illustrative. */
export function Backtrace({ className }: { className?: string }) {
  return (
    <Instrument
      serial="wdbx · backtrace"
      status="chain verified"
      caption="Illustrative trace. Meter width is the weight — never a live scoreboard."
      className={className}
    >
      <div className="px-5 pt-5 pb-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase">Answer</p>
        <p className="mt-2 font-display text-xl leading-snug italic sm:text-[1.35rem]">
          “Keep the German customer records in-region.”
        </p>
      </div>
      <div className="relative px-5 pb-5 pt-2">
        <div
          className="absolute top-5 bottom-12 left-[1.55rem] w-px bg-gradient-to-b from-accent/80 to-border"
          aria-hidden="true"
        />
        <ol className="relative space-y-2.5">
          {rows.map((row) => (
            <li key={row.id} className="flex gap-3">
              <span
                className={cn(
                  "relative z-1 mt-3.5 size-2.5 shrink-0 rounded-full ring-4 ring-bg-elevated",
                  row.node,
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 rounded-[10px] bg-bg p-3.5 shadow-[var(--shadow-border)]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-[11px] text-fg-muted">{row.src}</span>
                  <span className={cn("font-mono text-[11px] tabular-nums", row.label)}>{row.weight}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-fg">{row.excerpt}</p>
                <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-fg/10">
                  <i className={cn("block h-full rounded-full opacity-70", row.bar)} style={{ width: row.width }} />
                </div>
                <div className="mt-2 flex gap-3 font-mono text-[10px] text-fg-subtle">
                  <span>{row.id}</span>
                  <span>← parent {row.parent}</span>
                  <span className={cn("ml-auto", row.label)}>{row.persona}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Instrument>
  );
}
