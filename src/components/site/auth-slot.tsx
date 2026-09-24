import { lazy, Suspense } from "react";
import { staticSite } from "@/lib/static-site";
import { AuthSlotSkeleton } from "./auth-slot-skeleton";

// Lazy so the Better Auth client (created at module load in `@/lib/auth/client`)
// stays off the main bundle; in the static build this import is dead code.
const LiveAuthSlot = lazy(() => import("./auth-slot-live"));

export function AuthSlot() {
  if (staticSite) {
    return (
      <span
        className="hidden h-11 items-center px-3 text-xs whitespace-nowrap text-fg-subtle sm:inline-flex"
        title="Static preview: sign-in runs on the server deployment"
      >
        Static preview
      </span>
    );
  }
  return (
    <Suspense fallback={<AuthSlotSkeleton />}>
      <LiveAuthSlot />
    </Suspense>
  );
}
