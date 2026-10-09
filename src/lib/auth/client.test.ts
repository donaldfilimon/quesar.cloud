import { afterEach, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ signOut: vi.fn(), social: vi.fn() }));
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({ signOut: client.signOut, signIn: { social: client.social } }),
}));

import { signInWithProvider, signOut } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("does not navigate or claim signout when the server rejects it", async () => {
  const location = { href: "/profile" };
  vi.stubGlobal("window", { location });
  client.signOut.mockResolvedValueOnce({ error: { message: "Synthetic unavailable" } });
  await expect(signOut()).rejects.toThrow("Synthetic unavailable");
  expect(location.href).toBe("/profile");
  client.signOut.mockResolvedValueOnce({ error: null });
  await signOut();
  expect(location.href).toBe("/");
});

it("passes sanitized success and recovery destinations to the provider", async () => {
  const location = { href: "/login" };
  vi.stubGlobal("window", { location });
  client.social.mockResolvedValueOnce({
    data: { url: "https://provider.example.invalid/authorize" },
    error: null,
  });
  await signInWithProvider("google", { callbackURL: "/docs/../profile?tab=sessions" });
  expect(client.social).toHaveBeenCalledWith({
    provider: "google",
    callbackURL: "/profile?tab=sessions",
    errorCallbackURL: "/login?next=%2Fprofile%3Ftab%3Dsessions",
  });
  expect(location.href).toBe("https://provider.example.invalid/authorize");
});

it("reports a provider start failure instead of leaving the caller busy indefinitely", async () => {
  client.social.mockResolvedValueOnce({ data: null, error: null });
  await expect(signInWithProvider("google")).rejects.toThrow("Sign-in did not start");
});
