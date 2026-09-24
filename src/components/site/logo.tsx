import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Weighted-graph “M” — the Lab mark. Mirrors WDBX’s directed backtrace. */
export function Mark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]",
        mono ? "text-current" : "bg-bg-elevated text-accent shadow-border",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-[21px]" fill="none">
        <path
          d="M8 23 L8 10 L16 16 L24 10 L24 23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="23" r="2.6" fill="currentColor" />
        <circle cx="8" cy="10" r="2.2" fill="currentColor" />
        <circle cx="16" cy="16" r="1.9" fill="currentColor" />
        <circle cx="24" cy="10" r="2.2" fill="currentColor" />
        <circle cx="24" cy="23" r="2.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 text-fg no-underline"
      aria-label="Quesar by MLAI — home"
    >
      <Mark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-bold tracking-tight">Quesar</span>
        {!compact ? <span className="mt-1 text-xs font-medium text-fg-subtle">by MLAI</span> : null}
      </span>
    </Link>
  );
}
