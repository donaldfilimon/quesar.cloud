import { describe, expect, it } from "vitest";
import { confirmationMatches } from "./delete-account";

describe("confirmationMatches", () => {
  it("requires the account email, ignoring case and surrounding space", () => {
    expect(confirmationMatches(" Donald@Example.com ", "donald@example.com")).toBe(true);
    expect(confirmationMatches("donald@example.co", "donald@example.com")).toBe(false);
    expect(confirmationMatches("", "donald@example.com")).toBe(false);
  });
  it("never matches when the account has no email", () => {
    expect(confirmationMatches("", null)).toBe(false);
  });
});
