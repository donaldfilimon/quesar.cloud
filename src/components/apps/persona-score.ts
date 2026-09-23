/** Illustrative keyword-sentiment scoring behind the PersonaRouter demo. */

export type Scores = { abbey: number; aviva: number; abi: number; alpha: number };

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
