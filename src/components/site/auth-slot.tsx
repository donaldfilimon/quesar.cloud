import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-24 animate-pulse rounded-md bg-bg-subtle" aria-hidden="true" />;
  }
  return (
    <>
      <SignedOut>
        <Link
          to="/login"
          className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-fg-muted no-underline hover:text-fg"
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
