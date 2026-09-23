import { zodResolver } from "@hookform/resolvers/zod";
import { ServerOnlyNotice } from "@/components/site/server-only-notice";
import { staticSite } from "@/lib/static-site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SOCIAL_PROVIDERS,
  authClient,
  authEnabled,
  signInWithPasskey,
  signInWithProvider,
} from "@/lib/auth/client";
import { getSignInMethods } from "@/lib/auth/methods";
import type { SignInMethods, SocialProviderId } from "@/lib/auth/providers";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
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

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

function Login() {
  // Static GitHub Pages build: there is no auth server to sign in against.
  if (staticSite) return <ServerOnlyNotice feature="Sign-in" className="my-24" />;
  return <LoginForm />;
}

function LoginForm() {
  const { user, isPending } = useCurrentUserState();
  const { next = "/dashboard" } = Route.useSearch();
  const methods = Route.useLoaderData();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState<SocialProviderId | "passkey" | null>(null);
  const offeredProviders = SOCIAL_PROVIDERS.filter((provider) =>
    methods.social.includes(provider.id),
  );

  async function continueWith(provider: SocialProviderId) {
    setPending(provider);
    try {
      await signInWithProvider(provider, { callbackURL: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(null);
    }
  }

  async function continueWithPasskey() {
    setPending("passkey");
    try {
      await signInWithPasskey();
      window.location.assign(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Passkey sign-in failed.");
      setPending(null);
    }
  }
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              email: values.email,
              password: values.password,
              name: values.name || values.email.split("@")[0],
            })
          : await authClient.signIn.email({ email: values.email, password: values.password });
      if (result.error) {
        const message = result.error.message ?? "Sign-in failed.";
        form.setError("root", { message });
        toast.error(message);
        return;
      }
      toast.success(mode === "signup" ? "Account created." : "Signed in.");
      window.location.assign(next);
    } catch {
      form.setError("root", { message: "Sign-in failed. Try again." });
      toast.error("Sign-in failed. Try again.");
    }
  }

  useEffect(() => {
    if (!isPending && user) window.location.assign(next);
  }, [isPending, user, next]);

  if (!isPending && user) {
    return (
      <p className="mx-auto max-w-md px-4 py-16 text-sm text-fg-muted">
        Continuing to field notes…
      </p>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-16">
      <aside className="order-2 lg:order-1">
        <p className="text-xs text-primary">
          After sign-in
        </p>
        <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
          One desk. Five systems.
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          {[
            ["Abbey", "Care first"],
            ["Aviva", "Clarity always"],
            ["Abi", "Competence"],
            ["Quesar", "Inspect the stack"],
            ["WDBX", "Retrieve, then cite"],
          ].map(([title, line]) => (
            <li key={title} className="rounded-xl border border-border bg-card p-4">
              <p className="font-display text-lg">{title}</p>
              <p className="mt-1 text-sm leading-6 text-fg">{line}</p>
            </li>
          ))}
        </ul>
      </aside>
      <div className="order-1 grid gap-8 lg:order-2">
        <header>
          <p className="text-xs text-accent">
            Quesar desk
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">
            {mode === "signup" ? "Create an account" : "Sign in"}
          </h1>
          <p className="mt-3 max-w-[66ch] text-base leading-7 text-fg">
            The desk calls Abbey, Aviva, Abi, Quesar, and WDBX through the site API. Field notes
            stay on the same account.
          </p>
        </header>

        {!authEnabled ? (
          <p className="text-sm text-fg-muted">Sign-in is disabled.</p>
        ) : (
          <>
            {methods.passkey || offeredProviders.length > 0 ? (
              <>
                <div className="flex flex-col gap-2">
                  {methods.passkey && mode === "signin" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending !== null}
                      onClick={() => void continueWithPasskey()}
                    >
                      {pending === "passkey"
                        ? "Waiting for your passkey…"
                        : "Sign in with a passkey"}
                    </Button>
                  ) : null}
                  {offeredProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      type="button"
                      variant="secondary"
                      disabled={pending !== null}
                      onClick={() => void continueWith(provider.id)}
                    >
                      {pending === provider.id
                        ? `Opening ${provider.label}…`
                        : `Continue with ${provider.label}`}
                    </Button>
                  ))}
                </div>

                <p className="text-center text-xs text-fg-subtle">
                  or email
                </p>
              </>
            ) : null}

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
              {mode === "signup" ? (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    className="mt-1"
                    {...form.register("name")}
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="username webauthn"
                  className="mt-1"
                  aria-invalid={form.formState.errors.email ? true : undefined}
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p id="email-error" className="mt-1 text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-fg-subtle hover:text-fg"
                    aria-controls="password"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="mt-1"
                  aria-invalid={form.formState.errors.password ? true : undefined}
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p id="password-error" className="mt-1 text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : mode === "signup" ? (
                  <p className="mt-1 text-xs text-fg-subtle">
                    At least 8 characters. Stored as a hash, not the password itself.
                  </p>
                ) : null}
              </div>
              {form.formState.errors.root ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Working…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in with email"}
              </Button>
            </form>

            <button
              type="button"
              className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                form.clearErrors();
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </button>
          </>
        )}

        <p className="text-sm leading-6 text-fg">
          After sign-in you land on the desk. Field notes stay at{" "}
          <Link to="/console" className="text-primary">
            the console
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
