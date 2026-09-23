// fx-utils.ts — non-component helpers for the film FX primitives in fx.tsx.

// Deterministic fake hex (SHA-256 chain visuals).
export function hexOf(seed: number, n = 10): string {
  const ch = "0123456789abcdef";
  let s = "",
    x = (seed * 2654435761) >>> 0;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += ch[(x >>> 8) & 15];
  }
  return s;
}
