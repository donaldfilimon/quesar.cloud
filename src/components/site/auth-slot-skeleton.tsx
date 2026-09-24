/** Placeholder shown while the session resolves (and while the live slot loads). */
export function AuthSlotSkeleton() {
  return (
    <div className="h-11 w-16 animate-pulse rounded-md bg-bg-subtle sm:w-20" aria-hidden="true" />
  );
}
