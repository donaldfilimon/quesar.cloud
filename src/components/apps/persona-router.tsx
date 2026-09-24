import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { scoreMessage } from "./persona-score";

export function PersonaRouter({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState(
    "I'm stuck on the deploy target and also need the exact schema.",
  );
  const scores = useMemo(() => scoreMessage(text), [text]);
  const voice =
    scores.alpha > 0.8
      ? "Abbey — empathetic, scaffolded"
      : scores.alpha < 0.2
        ? "Aviva — concise, unfiltered"
        : "Blend — Aviva's facts, Abbey's voice, mixed by Abi";

  return (
    <div className="surface p-5 sm:p-6">
      <p className="text-xs text-accent">Persona router</p>
      <p className="mt-2 text-sm text-fg-muted">
        Illustrative keyword-sentiment heuristic. The inspected local router uses deterministic
        rules; this is not evidence of a learned classifier.
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Message</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 600))}
          rows={compact ? 3 : 4}
          className="min-h-24 w-full rounded-md bg-bg px-3 py-3 text-sm text-fg shadow-border outline-none"
        />
      </label>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Meter label="Abbey α" value={scores.alpha} tone="bg-persona-abbey" />
        <Meter label="Aviva 1−α" value={1 - scores.alpha} tone="bg-persona-aviva" />
        <Meter label="Abi blend" value={0.5} tone="bg-persona-abi" />
      </dl>
      <p className="mt-4 text-xs text-fg-subtle">{voice}</p>
      <p className="mt-2 font-display text-xl">α = {scores.alpha.toFixed(2)}</p>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{label}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-xs tabular text-fg">{value.toFixed(2)}</p>
    </div>
  );
}
