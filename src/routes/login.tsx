import { ServerOnlyNotice } from "@/components/site/server-only-notice";
import { staticSite } from "@/lib/static-site";
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";
import { authEnabled } from "@/lib/auth/client";
import { getSignInMethods } from "@/lib/auth/methods";
import type { SignInMethods } from "@/lib/auth/providers";
import { safeInternalPath } from "@/lib/internal";
import { pageHead } from "@/lib/seo";

type LoginSearch = { next?: string };

// Always return the key: the root route's raw search is merged into this
// route's result, so an omitted key would let a non-string `next` through
// unsanitized (the router JSON-parses query values).
function parseNext(search: Record<string, unknown>): LoginSearch {
  return { next: typeof search.next === "string" ? safeInternalPath(search.next) : undefined };
}

const NO_METHODS: SignInMethods = { email: false, passkey: false, social: [] };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => parseNext(search),
  // The static build has no server to ask; the page shows ServerOnlyNotice there.
  loader: async () => (staticSite || !authEnabled ? NO_METHODS : getSignInMethods()),
  head: () =>
    pageHead("Sign in — Quesar", "Sign in to the desk for Abbey, Aviva, Abi, Quesar, and WDBX."),
  component: Login,
});

function Login() {
  // Static GitHub Pages build: there is no auth server to sign in against.
  if (staticSite) return <ServerOnlyNotice feature="Sign-in" className="my-24" />;
  return <LoginForm />;
}
