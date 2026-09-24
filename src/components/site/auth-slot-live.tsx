import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthSlotSkeleton } from "./auth-slot-skeleton";

/**
 * The server-deployment half of the header's auth slot. Loaded lazily from
 * `auth-slot.tsx` so the Better Auth browser client stays out of the main
 * bundle (and out of the static build entirely).
 */
export default function LiveAuthSlot() {
  const { isPending } = useCurrentUserState();
  if (isPending) return <AuthSlotSkeleton />;
  return (
    <>
      <SignedOut>
        <Link
          to="/login"
          className="inline-flex h-11 items-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-fg-muted no-underline hover:text-fg"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
}
