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
    // Cross-fade between routes where the browser supports view transitions;
    // styles.css turns the animation off under prefers-reduced-motion.
    defaultViewTransition: true,
  });
}