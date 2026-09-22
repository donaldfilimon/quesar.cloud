import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Scores = { abbey: number; aviva: number; abi: number; alpha: number };

const ABBEY_WORDS = ["feel", "help", "stuck", "please", "sorry", "confused", "learn", "teach", "why", "worried", "together"];
const AVIVA_WORDS = ["fix", "error", "benchmark", "latency", "code", "api", "schema", "proof", "number", "diff", "ship"];

export function scoreMessage(text: string): Scores {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let abbey = 0.28;
  let aviva = 0.28;
  for (const token of tokens) {
    if (ABBEY_WORDS.includes(token)) abbey += 0.12;
    if (AVIVA_WORDS.includes(token)) aviva += 0.12;
  }
  const punct = (text.match(/[?!]/g) ?? []).length;
  if (punct) abbey += 0.08;
  if (/\b(fn|const|let|select|cargo|rust)\b/i.test(text)) aviva += 0.14;
  const sum = abbey + aviva;
  abbey = abbey / sum;
  aviva = 1 - abbey;
  const alpha = Math.min(0.96, Math.max(0.04, abbey));
  return { abbey, aviva, abi: 0.5, alpha };
}

export function PersonaRouter({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState("I'm stuck on the deploy target and also need the exact schema.");
  const scores = useMemo(() => scoreMessage(text), [text]);
  const voice =
    scores.alpha > 0.8 ? "Abbey — empathetic, scaffolded" : scores.alpha < 0.2 ? "Aviva — concise, unfiltered" : "Blend — Aviva's facts, Abbey's voice, mixed by Abi";

  return (
    <div className="surface p-5 sm:p-6">
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Persona router</p>
      <p className="mt-2 text-sm text-fg-muted">
        Illustrative keyword-sentiment heuristic. The inspected local router uses deterministic rules; this is not evidence of a learned classifier.
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Message</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 600))}
          rows={compact ? 3 : 4}
          className="min-h-24 w-full rounded-md bg-bg px-3 py-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none"
        />
      </label>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Meter label="Abbey α" value={scores.alpha} tone="bg-persona-abbey" />
        <Meter label="Aviva 1−α" value={1 - scores.alpha} tone="bg-persona-aviva" />
        <Meter label="Abi blend" value={0.5} tone="bg-persona-abi" />
      </dl>
      <p className="mt-4 font-mono text-[11px] tracking-wide text-fg-subtle uppercase">{voice}</p>
      <p className="mt-2 font-display text-xl">α = {scores.alpha.toFixed(2)}</p>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-wide text-fg-subtle uppercase">{label}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <p className="mt-1 font-mono text-xs tabular text-fg">{value.toFixed(2)}</p>
    </div>
  );
}
