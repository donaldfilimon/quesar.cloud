import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { staticSite } from "@/lib/static-site";

export function AuthSlot() {
  const { isPending } = useCurrentUserState();
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
  if (isPending) {
    return (
      <div className="h-11 w-16 animate-pulse rounded-md bg-bg-subtle sm:w-20" aria-hidden="true" />
    );
  }
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
