import { createServerFn } from "@tanstack/react-start";
import type { SignInMethods } from "./providers";

/**
 * The sign-in methods this deployment can actually complete, so the sign-in
 * page renders only working buttons. Credentials never leave the server; only
 * which providers are configured does.
 */
export const getSignInMethods = createServerFn({ method: "GET" }).handler(
  async (): Promise<SignInMethods> => {
    const { signInMethods } = await import("./methods.server");
    return signInMethods();
  },
);
