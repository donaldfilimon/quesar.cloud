import { Link } from "@tanstack/react-router";

/**
 * Shown in the static GitHub Pages build wherever a feature needs the server
 * deployment (sign-in, console, admin, profile, connectors, model calls).
 */
export function ServerOnlyNotice({
  feature,
  className = "",
  compact = false,
}: {
  feature: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={`rounded-lg border border-border bg-bg-elevated p-4 ${className}`}
        role="note"
      >
        <p className="text-xs text-accent">Static preview</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {feature} requires the server deployment, which is not live here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto max-w-2xl rounded-lg border border-border bg-bg-elevated p-6 ${className}`}
      role="note"
    >
      <p className="text-xs text-accent">Static preview</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">
        {feature} runs on the server deployment.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        This copy of quesar.cloud is a static site, so there is no sign-in, database, or model call
        behind it. Sign-in, the console, admin review, profile, workspace connectors and chat need
        the server deployment, which is not live yet. Everything public on this site works as-is.
      </p>
      <p className="mt-5 flex flex-wrap gap-4 text-sm">
        <Link to="/" className="text-accent">
          Home
        </Link>
        <Link to="/contact" className="text-accent">
          Contact
        </Link>
        <Link to="/docs" className="text-accent">
          Docs
        </Link>
      </p>
    </div>
  );
}
