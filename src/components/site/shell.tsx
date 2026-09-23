import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";
import { AppToaster } from "./toaster";

/**
 * Site chrome. Route changes animate through the router's view transitions
 * (`defaultViewTransition` in `src/router.tsx`, skipped under reduced motion)
 * and scroll position is the router's `scrollRestoration`; the route tree is
 * never remounted here.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <AppToaster />
      </div>
    </TooltipProvider>
  );
}
