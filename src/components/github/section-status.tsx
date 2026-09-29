import { RotateCw } from "lucide-react";
import type { Freshness } from "@/lib/github";

export function GithubSectionStatus({
  status,
  loading,
  label,
  retry,
}: {
  status?: Freshness;
  loading: boolean;
  label: string;
  retry: () => Promise<void>;
}) {
  const state = status?.state ?? "unavailable";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
      <p role="status">
        {loading
          ? `Loading ${label}...`
          : state === "fresh"
            ? `Live ${label} from donaldfilimon`
            : state === "stale"
              ? `Cached ${label}; GitHub refresh incomplete.`
              : state === "snapshot"
                ? `GitHub did not answer. Showing ${label} captured when this site was built.`
                : `Live ${label} unavailable. Curated content remains available.`}
        {!loading && status?.fetchedAt ? (
          <>
            {" "}
            <time dateTime={status.fetchedAt}>
              {state === "snapshot" ? "Captured" : "Fetched"}{" "}
              {new Date(status.fetchedAt).toLocaleString()}
            </time>
          </>
        ) : null}
      </p>
      {!loading && state !== "fresh" ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 text-primary"
          onClick={() => void retry()}
          aria-label={`Retry ${label}`}
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
