import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { recoveryForPathname, SUGGESTED_DESTINATIONS } from "@/lib/mlai/not-found";

/**
 * Root `notFoundComponent`. Ported from mlai `src/views/NotFound.tsx`: the
 * recovery copy is section-aware (`/docs/x` points back to the docs, and so
 * on). The path comes from the router location, which is the same on the
 * server and the client, so there is no hydration mismatch to paper over.
 */
export function NotFound() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const recovery = recoveryForPathname(pathname);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col justify-center px-4 py-24 text-center sm:px-6">
      <p className="text-xs text-accent">{recovery.eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">{recovery.title}</h1>
      <p className="mt-5 text-base leading-relaxed text-fg-muted sm:text-lg">{recovery.body}</p>
      <div className="mt-8 flex justify-center">
        <Link
          to={recovery.backTo as never}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-fg px-4 text-sm font-medium text-bg no-underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          {recovery.backLabel}
        </Link>
      </div>
      <div className="mt-12 border-t border-border pt-8">
        <p className="text-xs text-fg-subtle">Or jump to</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-3">
          {SUGGESTED_DESTINATIONS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-bg-elevated px-4 text-sm text-fg-muted no-underline shadow-border hover:text-fg"
              >
                {item.label}
                <ArrowRight
                  className="size-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
