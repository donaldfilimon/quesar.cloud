import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/site/lab";
import { Button } from "@/components/ui/button";
import type { SiteStatus } from "@/lib/quasar";
import { cn } from "@/lib/utils";
import { START_COMMANDS, errorText, useServiceOrigin } from "./util";

const navItems = [
  { to: "/quasar/sites", label: "Sites" },
  { to: "/quasar/new", label: "New site" },
  { to: "/quasar/settings", label: "Settings" },
] as const;

export function QuasarFrame({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const origin = useServiceOrigin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-fg sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-[66ch] text-base leading-7 text-fg-muted">{lede}</p>
        </div>
        <nav aria-label="Quasar" className="flex flex-wrap gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-fg-muted no-underline hover:bg-muted hover:text-fg"
              activeProps={{ className: "bg-muted text-fg", "aria-current": "page" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-3 text-xs text-fg-subtle">
        Service <span className="normal-case">{origin ?? "…"}</span> · reached from this browser
      </p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "warn" | "error";
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const edge =
    tone === "error"
      ? "[--edge:var(--destructive)]"
      : tone === "warn"
        ? "[--edge:var(--warn)]"
        : "[--edge:var(--accent)]";
  const label =
    tone === "error" ? "text-destructive" : tone === "warn" ? "text-warn" : "text-accent";
  return (
    <aside
      role={tone === "error" ? "alert" : undefined}
      className={cn("surface accent-edge p-5", edge, className)}
    >
      <p className={cn("text-xs", label)}>{title}</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-fg-muted">{children}</div>
    </aside>
  );
}

export function Command({ children }: { children: string }) {
  return (
    <code className="block overflow-x-auto rounded-md bg-bg-subtle px-3 py-2 font-mono text-[0.8rem] text-fg shadow-[var(--shadow-border)]">
      {children}
    </code>
  );
}

/** Shown when the service cannot be reached. Never replaced by sample data. */
export function ServiceUnreachable({
  origin,
  error,
  onRetry,
}: {
  origin: string | null;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <Notice tone="warn" title="Service not reachable">
      <p>
        This browser could not reach the Quasar service at{" "}
        <span className="font-mono text-fg">{origin ?? "the configured origin"}</span> (
        {errorText(error)}). Nothing below is cached or simulated: with no service there are no
        sites to show.
      </p>
      <p>
        Start it on the machine that should hold the sites. It needs Anthropic credentials, either{" "}
        <span className="font-mono">ANTHROPIC_API_KEY</span> in its environment or a prior{" "}
        <span className="font-mono">ant auth login</span>. It listens on port 4700 (
        <span className="font-mono">PORT</span> overrides) and keeps sites under{" "}
        <span className="font-mono">~/.quasar</span>.
      </p>
      <p>From the mlai checkout, today:</p>
      <Command>{START_COMMANDS.mlai}</Command>
      <p>From this repository, once the service moves into it:</p>
      <Command>{START_COMMANDS.sidecar}</Command>
      <p>
        If it runs on another machine, set its origin in{" "}
        <Link to="/quasar/settings" className="text-accent">
          Settings
        </Link>
        .
      </p>
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Notice>
  );
}

export function SecurityNote() {
  return (
    <Notice tone="warn" title="Run it locally, on a trusted network">
      <p>
        The Quasar service has no authentication, answers every origin with{" "}
        <span className="font-mono">Access-Control-Allow-Origin: *</span>, and binds to all
        interfaces. Any web page open in your browser, and any device on the same network, can list
        your sites, start generation jobs billed to your Anthropic credentials, and launch{" "}
        <span className="font-mono">next dev</span> preview servers.
      </p>
      <p>
        Run it only on a machine and network you trust, never expose port 4700 (or the 4710+ preview
        ports) to the internet, and stop it when you are done. This site calls it from your browser;
        quesar.cloud&apos;s servers never contact the service or see its credentials.
      </p>
    </Notice>
  );
}

const statusTone: Record<SiteStatus, string> = {
  idle: "text-status-current",
  generating: "text-status-partial",
  error: "text-destructive",
};

export function SiteStatusBadge({ status }: { status: SiteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        statusTone[status],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "generating" && "motion-safe:animate-pulse",
        )}
      />
      {status}
    </span>
  );
}
