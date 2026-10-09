import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { SignInMethods } from "@/lib/auth/providers";

const state = vi.hoisted(() => ({
  staticSite: false,
  mode: "signin" as "signin" | "signup",
  submitting: false,
  error: undefined as import("@/lib/auth/callback").SignInFailure | undefined,
  submit: undefined as
    ((values: { name?: string; email: string; password: string }) => Promise<void>) | undefined,
  clicks: {} as Record<string, () => void>,
  formSubmit: undefined as ((event: import("react").FormEvent) => void) | undefined,
  signIn: vi.fn(),
  signUp: vi.fn(),
  provider: vi.fn(),
  passkey: vi.fn(),
  navigate: vi.fn(),
  methods: { email: true, passkey: true, social: [] } as SignInMethods,
}));
vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();
  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      if (args[0] === "form") {
        state.formSubmit = (args[1] as { onSubmit: typeof state.formSubmit }).onSubmit;
      }
      if (args[0] === "button") {
        const props = args[1] as import("react").ComponentProps<"button">;
        if (typeof props.children === "string" && props.onClick) {
          state.clicks[props.children] = () =>
            props.onClick!({} as import("react").MouseEvent<HTMLButtonElement>);
        }
      }
      return actual.jsxDEV(...args);
    },
  };
});
vi.mock("@/lib/auth/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/client")>()),
  authClient: { signIn: { email: state.signIn }, signUp: { email: state.signUp } },
  signInWithProvider: state.provider,
  signInWithPasskey: state.passkey,
}));
vi.mock("@/lib/static-site", () => ({
  get staticSite() {
    return state.staticSite;
  },
}));
vi.mock("@/lib/auth/methods", () => ({ getSignInMethods: vi.fn() }));
vi.mock("@/lib/auth/use-current-user", () => ({
  useCurrentUserState: () => ({ user: null, isPending: false }),
}));
vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    useForm: (options: Parameters<typeof actual.useForm>[0]) => {
      const form = actual.useForm(options);
      return {
        ...form,
        formState: { errors: form.formState.errors, isSubmitting: state.submitting },
        handleSubmit: (onValid: Parameters<typeof form.handleSubmit>[0]) => {
          state.submit = async (values) => {
            await onValid(values);
          };
          return (event: import("react").FormEvent) => event.preventDefault();
        },
      };
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  getRouteApi: () => ({
    useSearch: () => ({ mode: state.mode, error: state.error }),
    useLoaderData: () => state.methods,
    useNavigate: () => state.navigate,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Navigate: ({ to, search }: { to: string; search: Record<string, string> }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>Continue</a>
  ),
}));

import { LoginForm } from "@/components/auth/login-form";
import { Route as LoginRoute } from "./login";
import { Route as SignupRoute } from "./signup";

afterEach(() => {
  state.staticSite = false;
  state.mode = "signin";
  state.submitting = false;
  state.methods.social = [];
  state.error = undefined;
  state.clicks = {};
  state.formSubmit = undefined;
  state.submit = undefined;
  vi.clearAllMocks();
});

it("validates the account-creation mode and sanitizes the redirect", () => {
  const parse = LoginRoute.options.validateSearch!;
  expect(typeof parse).toBe("function");
  if (typeof parse !== "function") throw new Error("Expected login search validator");
  expect(parse({ mode: "signup", next: "/profile" })).toEqual({
    mode: "signup",
    next: "/profile",
    error: undefined,
  });
  for (const mode of [undefined, "invalid", {}, ["signup"]]) {
    expect(parse({ mode, next: "https://example.invalid" })).toEqual({
      mode: "signin",
      next: "/console",
      error: undefined,
    });
  }
});

it("reports a safe provider callback failure", () => {
  state.error = "cancelled";
  const form = renderToStaticMarkup(<LoginForm />);
  expect(form).toContain('role="alert"');
  expect(form).toContain("Provider sign-in was cancelled or denied");
});

it("guards all auth handler entries synchronously and permits retry after failure", async () => {
  state.methods.social = ["google"];
  let release!: (value: { error: { message: string } }) => void;
  state.signIn.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  renderToStaticMarkup(<LoginForm />);
  state.formSubmit!({ preventDefault: vi.fn() } as unknown as import("react").FormEvent);
  const values = { email: "fixture@example.invalid", password: "synthetic-password" };
  const first = state.submit!(values);
  await state.submit!(values);
  state.clicks["Continue with Google"]();
  state.clicks["Sign in with a passkey"]();
  state.clicks["Need an account? Create one"]();
  expect(state.signIn).toHaveBeenCalledOnce();
  expect(state.provider).not.toHaveBeenCalled();
  expect(state.passkey).not.toHaveBeenCalled();
  expect(state.navigate).not.toHaveBeenCalled();
  release({ error: { message: "Synthetic failure" } });
  await first;
  state.signIn.mockResolvedValueOnce({ error: { message: "Retry allowed" } });
  await state.submit!(values);
  expect(state.signIn).toHaveBeenCalledTimes(2);
});

it("routes /signup straight into account creation, not the sign-in form", () => {
  const html = renderToStaticMarkup(createElement(SignupRoute.options.component!));
  expect(html).toContain('href="/login?next=%2Fconsole&amp;mode=signup"');
  state.mode = "signup";
  const form = renderToStaticMarkup(<LoginForm />);
  expect(form).toContain("Create an account");
  expect(form).toContain('id="name"');
  expect(form).toContain('autoComplete="new-password"');
  expect(form).not.toContain("Sign in with a passkey");
});

it("keeps ordinary login in sign-in mode without unconfigured social buttons", () => {
  const form = renderToStaticMarkup(<LoginForm />);
  expect(form).toContain("Sign in with email");
  expect(form).toContain("Sign in with a passkey");
  expect(form).toContain('autoComplete="current-password"');
  expect(form).not.toContain('id="name"');
  expect(form).not.toContain("Continue with Google");
  expect(form).not.toContain("Continue with Apple");
  expect(form).not.toContain("Continue with X");
});

it("disables competing methods and mode changes while email auth is submitting", () => {
  state.submitting = true;
  state.methods.social = ["google"];
  const form = renderToStaticMarkup(<LoginForm />);
  for (const label of [
    "Sign in with a passkey",
    "Continue with Google",
    "Working…",
    "Need an account? Create one",
  ]) {
    expect(form).toMatch(
      new RegExp(`<button[^>]*disabled=""[^>]*>${label.replace("?", "\\?")}</button>`),
    );
  }
});

it("keeps both static auth routes as notices rather than forms or redirects", () => {
  state.staticSite = true;
  for (const route of [LoginRoute, SignupRoute]) {
    const html = renderToStaticMarkup(createElement(route.options.component!));
    expect(html).toContain("data-server-only-page");
    expect(html).not.toContain("<form");
    expect(html).not.toContain('href="/login?');
  }
});
