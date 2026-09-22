import { describe, expect, it, vi } from "vitest";

// The Better Auth browser client is irrelevant here; keep it out of the node run.
vi.mock("@/lib/auth/client", () => ({ getBearerToken: () => null }));

const { describeCallbackError } = await import("./client");

describe("describeCallbackError", () => {
  it("maps known callback codes", () => {
    expect(describeCallbackError("invalid_state")).toMatch(/could not be verified/);
    expect(describeCallbackError("encryption_not_configured")).toMatch(/APP_ENCRYPTION_KEY/);
  });

  /* `?error=` is attacker-chosen. Indexing a plain object with `__proto__` or
     `constructor` returns a non-string and crashed the panel's render. */
  it("never resolves prototype keys, and never echoes an unknown code", () => {
    for (const code of ["__proto__", "constructor", "toString", "hasOwnProperty", "<script>"]) {
      const text = describeCallbackError(code);
      expect(typeof text).toBe("string");
      expect(text).toBe("The provider reported an error.");
    }
  });
});
