import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

/** Only surfaced in development: a production error message can carry server detail. */
function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

/**
 * Route error boundary (ported from mlai app/error.tsx). Renders inside the
 * site shell, so navigation still works. Retry re-runs the route's loaders
 * and re-renders it.
 */
export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    // Local debugging only; telemetry is event-allowlisted and never ships error payloads.
    console.error(error);
  }, [error]);
  return (
    <main
      role="alert"
      aria-labelledby="route-error-heading"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-24"
    >
      <p className="flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">
        <TriangleAlert className="size-3.5" aria-hidden="true" /> 500: something failed
      </p>
      <h1 id="route-error-heading" className="mt-3 font-display text-4xl tracking-tight">
        This page hit an unexpected error.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        The rest of the site is fine; this route failed to render. Retry it, or go back to solid ground.
      </p>
      {import.meta.env.DEV ? (
        <p className="mt-3 font-mono text-xs break-words text-fg-subtle">{errorMessage(error)}</p>
      ) : null}
      <p className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-fg px-4 font-medium text-bg"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Try again
        </button>
        <Link to="/" className="text-accent">
          Home
        </Link>
        <Link to="/contact" className="text-accent">
          Report it
        </Link>
      </p>
    </main>
  );
}

export function AppNotFoundComponent() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-24">
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">404</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">This page is not in the catalog.</h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        Every public surface lives on this site. If a name moved, start from docs, apps, or the source catalog.
      </p>
      <p className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/" className="text-accent">
          Home
        </Link>
        <Link to="/docs" className="text-fg-muted hover:text-fg">
          Docs
        </Link>
        <Link to="/apps" className="text-fg-muted hover:text-fg">
          Apps
        </Link>
        <Link to="/source" className="text-fg-muted hover:text-fg">
          Source
        </Link>
      </p>
    </main>
  );
}
