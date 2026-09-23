import { createFileRoute, Link } from "@tanstack/react-router";
import { safeInternalPath } from "@/lib/internal";
import { Button } from "@/components/ui/button";

/**
 * mlai `app/unauthorized.tsx` ("Sign in required."), given the site's layout.
 * Signed-out visitors to a protected surface are normally sent to /login by the
 * gates; this page is the explicit landing for anything that links here.
 */
export const Route = createFileRoute("/unauthorized")({
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" ? { next: safeInternalPath(search.next) } : {},
  head: () => ({
    meta: [
      { title: "Sign in required — Quesar" },
      { name: "description", content: "This part of Quesar needs a signed-in account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unauthorized,
});

function Unauthorized() {
  const { next } = Route.useSearch();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col justify-center px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-accent uppercase">401 — Sign in required</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Sign in required.</h1>
      <p className="mt-5 text-base leading-relaxed text-fg-muted sm:text-lg">
        That surface belongs to a signed-in account. Sign in with Google, Apple, X, a passkey, or email and
        password, then you will be sent back.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/login" search={{ next: next ?? "/console" }}>
            Sign in
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
