import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {errorMessage(error)}
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
