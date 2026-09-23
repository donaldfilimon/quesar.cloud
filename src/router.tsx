import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent, AppNotFoundComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: AppNotFoundComponent,
    defaultPreload: "intent",
    scrollRestoration: true,
    // No defaultViewTransition: the router leaves the "Transition was skipped"
    // rejection unhandled whenever navigations overlap or the tab is hidden,
    // which floods the console. Route changes are instant by design.
  });
}