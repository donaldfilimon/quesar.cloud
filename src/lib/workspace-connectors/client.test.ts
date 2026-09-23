import { describe, expect, it } from "vitest";
import { describeCallbackError } from "./client";

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
