import { describe, expect, it } from "vitest";
import { decideAdmin } from "./admin.server";

const allowlist = new Set(["donald@example.com"]);

describe("decideAdmin", () => {
  it("rejects an allowlisted email/password account (anyone can register that address)", () => {
    expect(
      decideAdmin({ email: "donald@example.com", emailVerified: false, providers: ["credential"] }, allowlist),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("rejects an allowlisted credential account even if emailVerified is set", () => {
    expect(
      decideAdmin({ email: "donald@example.com", emailVerified: true, providers: ["credential"] }, allowlist),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("accepts an allowlisted broker-verified account, case-insensitively", () => {
    expect(
      decideAdmin({ email: "Donald@Example.com", emailVerified: true, providers: ["grok-google"] }, allowlist),
    ).toEqual({ admin: true });
    expect(
      decideAdmin({ email: "donald@example.com", emailVerified: false, providers: ["credential", "grok-x"] }, allowlist),
    ).toEqual({ admin: true });
  });

  it("rejects a verified account that is not on the allowlist", () => {
    expect(
      decideAdmin({ email: "someone@example.com", emailVerified: true, providers: ["grok-google"] }, allowlist),
    ).toEqual({ admin: false, reason: "not_allowlisted" });
  });

  it("grants nobody when the allowlist is empty", () => {
    expect(
      decideAdmin({ email: "donald@example.com", emailVerified: true, providers: ["grok-google"] }, new Set()),
    ).toEqual({ admin: false, reason: "no_allowlist" });
  });
});
