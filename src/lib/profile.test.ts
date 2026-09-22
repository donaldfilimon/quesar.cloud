import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, providerLabel, validateDisplayName } from "./profile";

describe("validateDisplayName", () => {
  it("keeps mlai's 80-character name cap", () => {
    expect(DISPLAY_NAME_MAX).toBe(80);
  });

  it("trims and accepts a normal name", () => {
    expect(validateDisplayName("  Ada Lovelace  ")).toEqual({ ok: true, name: "Ada Lovelace" });
  });

  it("accepts exactly 80 characters and rejects 81 instead of truncating", () => {
    expect(validateDisplayName("a".repeat(80))).toEqual({ ok: true, name: "a".repeat(80) });
    const result = validateDisplayName("a".repeat(81));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/80 characters/);
  });

  it("counts code points, not UTF-16 units", () => {
    expect(validateDisplayName("😀".repeat(80)).ok).toBe(true);
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(validateDisplayName("")).toEqual({ ok: false, error: "Enter a display name." });
    expect(validateDisplayName("   ").ok).toBe(false);
  });
});

describe("providerLabel", () => {
  it("names the sign-in methods this app supports", () => {
    expect(providerLabel("grok-google")).toBe("Google");
    expect(providerLabel("grok-x")).toBe("X");
    expect(providerLabel("credential")).toBe("Email and password");
  });

  it("falls back to the raw provider id", () => {
    expect(providerLabel("something-else")).toBe("something-else");
  });
});
