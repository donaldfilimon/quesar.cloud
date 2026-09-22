import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminInquiries, type InquiryRow } from "@/lib/console";
import { unexpected, when } from "../format";

/** Contact inquiries, newest first, 25 per page (mlai `inquiries` GET). */
export function InquiriesList() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InquiryRow[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (target: number) => {
    setError("");
    try {
      const result = await adminInquiries({ data: { page: target } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRows(result.inquiries);
      setHasMore(result.hasMore);
      setPage(result.page);
    } catch (cause) {
      setError(unexpected("Inquiries could not be loaded right now.", cause));
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="grid gap-4">
      {error ? (
        <p role="alert" className="text-sm text-status-partial">
          {error}
        </p>
      ) : null}
      {rows === null && !error ? <p className="text-sm text-fg-muted">Loading inquiries…</p> : null}
      {rows?.length === 0 ? (
        <p className="text-sm text-fg-muted">No inquiries on this page.</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-card p-4 shadow-[var(--shadow-border)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-fg">
                  {row.name}{" "}
                  <a className="text-accent" href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                </p>
                <p className="text-xs text-fg-subtle">{when(row.createdAt)}</p>
              </div>
              {row.company || row.projectType ? (
                <p className="mt-1 text-xs text-fg-subtle">
                  {[row.company, row.projectType].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{row.message}</p>
              {row.userId ? (
                <p className="mt-2 font-mono text-[10px] text-fg-subtle">
                  signed in as {row.userId}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => void load(page - 1)}
        >
          Newer
        </Button>
        <span className="font-mono text-xs text-fg-subtle">page {page}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasMore}
          onClick={() => void load(page + 1)}
        >
          Older
        </Button>
      </div>
    </div>
  );
}
