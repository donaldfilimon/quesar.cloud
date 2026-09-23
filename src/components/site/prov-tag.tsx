import { cn } from "@/lib/utils";

export type Provenance = "measured" | "target" | "reported";

const PROVENANCE = {
  measured: {
    glyph: "●",
    label: "Measured",
    description: "Present in source, reproduced locally, or a configuration fact.",
    chip: "border-abbey/30 bg-abbey/8 text-abbey",
  },
  target: {
    glyph: "○",
    label: "Target",
    description: "Engineering goal. Never a result.",
    chip: "border-warn/35 bg-warn/8 text-warn",
  },
  reported: {
    glyph: "◆",
    label: "Reported",
    description: "Cited from a named source. Not re-measured here.",
    chip: "border-abi/30 bg-abi/8 text-abi",
  },
} as const;

export function ProvTag({ tag, className }: { tag: Provenance; className?: string }) {
  const { glyph, label, chip } = PROVENANCE[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        chip,
        className,
      )}
    >
      <span aria-hidden="true">{glyph}</span>
      {label}
    </span>
  );
}

export function ProvLegend({ className }: { className?: string }) {
  return (
    <dl
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted", className)}
      aria-label="How figures on this site are labeled"
    >
      {(Object.keys(PROVENANCE) as Provenance[]).map((tag) => (
        <div key={tag} className="flex items-center gap-2">
          <dt>
            <ProvTag tag={tag} />
          </dt>
          <dd>{PROVENANCE[tag].description}</dd>
        </div>
      ))}
    </dl>
  );
}
