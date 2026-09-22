import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";
import { ScrollProgress } from "./scroll-progress";
import { AppToaster } from "./toaster";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <div className="site-grain" aria-hidden="true" />
        <ScrollProgress />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
        <SiteFooter />
        <AppToaster />
      </div>
    </TooltipProvider>
  );
}