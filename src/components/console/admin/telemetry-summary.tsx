import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminTelemetry, type TelemetrySummary } from "@/lib/console";
import { unexpected } from "../format";

/** Counts of anonymous telemetry events plus the inquiry open→success conversion (mlai `telemetry/summary`). */
export function TelemetrySummaryPanel() {
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await adminTelemetry();
      if (!result.ok) setError(result.message);
      else setSummary(result.summary);
    } catch (cause) {
      setError(unexpected("Couldn't load usage data. Refresh to retry.", cause));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = summary ? Object.entries(summary.events) : [];
  return (
    <div className="grid gap-6">
      <p className="max-w-3xl text-sm text-fg-muted">
        Raw counts from the <code className="font-mono text-xs">telemetry_events</code> table since
        it was created. No user id and no IP address are stored. These are site-usage counts, not a
        benchmark.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-status-partial">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : null}
      {!summary && !error ? <p className="text-sm text-fg-muted">Loading usage data…</p> : null}
      {summary ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Inquiry opens", String(summary.conversion.opens)],
              ["Inquiry successes", String(summary.conversion.successes)],
              [
                "Conversion",
                summary.conversion.rate === null
                  ? "no opens yet"
                  : `${(summary.conversion.rate * 100).toFixed(2)}%`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-card p-4 shadow-[var(--shadow-border)]">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                  {label}
                </dt>
                <dd className="mt-2 font-display text-2xl text-fg tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {entries.length === 0 ? (
            <p className="text-sm text-fg-muted">No telemetry events recorded yet.</p>
          ) : (
            <table className="w-full max-w-xl text-sm">
              <caption className="sr-only">Events by name</caption>
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                  <th scope="col" className="py-2">
                    Event
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([event, count]) => (
                  <tr key={event} className="border-b border-border/60">
                    <td className="py-2 font-mono text-xs text-fg">{event}</td>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button variant="secondary" className="w-fit" onClick={() => void load()}>
            Refresh
          </Button>
        </>
      ) : null}
    </div>
  );
}
