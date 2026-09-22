import { Outlet, useChildMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Parent file routes also match their children. Render the child, not the index, when one is active. */
export function RouteFrame({ children }: { children: ReactNode }) {
  const nested = useChildMatches().length > 0;
  if (nested) return <Outlet />;
  return children;
}
