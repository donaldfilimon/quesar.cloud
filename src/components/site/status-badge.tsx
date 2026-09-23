import { statusCopy, type StatusKind } from "@/lib/content";
import { cn } from "@/lib/utils";

const tone: Record<StatusKind, string> = {
  current: "text-status-current",
  partial: "text-status-partial",
  experimental: "text-status-partial",
  development: "text-status-partial",
  planned: "text-status-planned",
  research: "text-status-planned",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKind;
  className?: string;
}) {
  const copy = statusCopy[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone[status],
        className,
      )}
      title={copy.meaning}
    >
      <span aria-hidden="true">{copy.mark}</span>
      {copy.label}
    </span>
  );
}
