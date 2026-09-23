import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CORPUS } from "./wdbx-demo-corpus";
import { WdbxEngine, type Block, type Hit, type QueryStats } from "./wdbx-demo";

const PRESETS = [
  "neural backtracking drift",
  "gpu acceleration apple silicon",
  "empathetic persona routing",
  "lock free concurrency snapshots",
  "encryption right to erasure",
];

/** The in-browser WDBX miniature: type a query, watch real cosine search over
 *  a local corpus with modeled partition labels, an MVCC snapshot counter and
 *  a hash-chained query log. Everything is simulated in this tab: it is not the
 *  Rust engine and reads no WDBX store. Ported from mlai
 *  `src/components/demos/WdbxLiveDemo.tsx` (b6f3686). */
export function WdbxLiveDemo() {
  const engine = useMemo(() => new WdbxEngine(CORPUS), []);
  const [query, setQuery] = useState(PRESETS[0] ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [stats, setStats] = useState<QueryStats | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const run = (q: string) => {
    const text = q.trim();
    if (!text) return;
    const { hits: h, stats: s } = engine.search(text, 5);
    setHits(h);
    setStats(s);
    setBlocks([...engine.blocks].slice(-5));
  };

  // Seed the demo with the first preset once, on the client only (the query
  // stats carry timings and timestamps, so the server render stays empty).
  // The search mutates the engine's query log, so it runs in the effect, never
  // during render; its result is committed on the next microtask. Mount-only
  // on purpose: re-running would clobber whatever the visitor typed.
  useEffect(() => {
    let cancelled = false;
    const seed = (PRESETS[0] ?? "").trim();
    if (!seed) return;
    const { hits: h, stats: s } = engine.search(seed, 5);
    const recent = [...engine.blocks].slice(-5);
    queueMicrotask(() => {
      if (cancelled) return;
      setHits(h);
      setStats(s);
      setBlocks(recent);
    });
    return () => {
      cancelled = true;
    };
  }, [engine]);

  const topScore = hits.length ? Math.max(hits[0]?.score ?? 1e-6, 1e-6) : 1;

  return (
    <div className="surface overflow-hidden">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/70" aria-hidden="true" />
        <span className="ml-2 font-mono text-[11px] text-fg-muted">
          wdbx · live query — simulated in-browser · {engine.size} vectors · ℝ^{stats?.dim ?? 256}
        </span>
      </div>

      <div className="p-5 md:p-6">
        {/* input row */}
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm text-fg placeholder:text-fg-subtle outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(query)}
            placeholder="semantic query — try: persona blending weights"
            spellCheck={false}
            aria-label="Semantic query"
          />
          <Button type="button" onClick={() => run(query)} className="shrink-0">
            Query →
          </Button>
        </div>

        {/* presets */}
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setQuery(p);
                run(p);
              }}
              className="rounded-full border border-border px-3 py-1 font-mono text-[11px] text-fg-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              {p}
            </button>
          ))}
        </div>

        {/* results + stats */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_180px]">
          <div className="space-y-3" aria-live="polite">
            {hits.map((h) => (
              <div key={h.doc.id} className="rounded-xl border border-border bg-bg-subtle p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-semibold text-fg">{h.doc.title}</div>
                  <div className="font-mono text-xs text-accent tabular">{h.score.toFixed(4)}</div>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{h.doc.text}</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(4, (h.score / topScore) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-fg-subtle">
                  <span>modeled partition {h.partition}</span>
                  <span>{h.doc.tag}</span>
                  <span>cosine</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:content-start">
            {[
              { v: stats ? stats.ms.toFixed(2) + "ms" : "—", k: "scan latency · measured in this tab" },
              { v: String(stats?.scanned ?? "—"), k: "vectors scanned" },
              { v: `${stats?.partitionsHit ?? "—"}/4`, k: "modeled partitions" },
              { v: `#${stats?.snapshot ?? "—"}`, k: "mvcc snapshot" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-bg-subtle p-3.5">
                <div className="font-mono text-lg font-semibold text-fg tabular">{s.v}</div>
                <div className="mt-1 text-xs text-fg-subtle">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* block chain */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 text-xs text-fg-subtle">
            query block chain — each block hashes its parent
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {blocks.map((b, i) => (
              <span key={b.height} className="contents">
                {i > 0 && (
                  <span className="font-mono text-[10px] text-accent/60" aria-hidden="true">
                    ─⛓─
                  </span>
                )}
                <span className="rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-1.5">
                  <span className="block font-mono text-[10px] text-accent">
                    #{b.height} · 0x{b.hash}
                  </span>
                  <span className="block max-w-40 truncate font-mono text-[10px] text-fg-subtle">{b.query}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
