import { lazy, Suspense, type ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";

// sonner (and its injected CSS) stays out of the main bundle: the toaster
// renders nothing until a toast exists, and every toast() call comes from a
// user action after hydration, by which time this chunk has loaded.
const AppToaster = lazy(() => import("./toaster").then((m) => ({ default: m.AppToaster })));

/**
 * Site chrome. Scroll position is the router's `scrollRestoration`; the route
 * tree is never remounted here, so state and focus survive navigation.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {hydrated ? (
        <Suspense fallback={null}>
          <AppToaster />
        </Suspense>
      ) : null}
    </div>
  );
}
