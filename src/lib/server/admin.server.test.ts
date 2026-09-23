import { describe, expect, it } from "vitest";
import { decideAdmin } from "./admin.server";

const allowlist = new Set(["donald@example.com"]);

describe("decideAdmin", () => {
  it("rejects an allowlisted email/password account (anyone can register that address)", () => {
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: false, providers: ["credential"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("rejects an allowlisted credential account even if emailVerified is set", () => {
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: true, providers: ["credential"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("accepts an allowlisted account with a linked Google or Apple identity, case-insensitively", () => {
    expect(
      decideAdmin(
        { email: "Donald@Example.com", emailVerified: true, providers: ["google"] },
        allowlist,
      ),
    ).toEqual({ admin: true });
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: false, providers: ["credential", "apple"] },
        allowlist,
      ),
    ).toEqual({ admin: true });
  });

  it("does not count X or a passkey as proof of the email address", () => {
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: true, providers: ["twitter"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "unverified_identity" });
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: true, providers: ["credential", "passkey"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("no longer honours the retired Grok broker provider ids", () => {
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: true, providers: ["grok-google", "grok-x"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "unverified_identity" });
  });

  it("rejects a verified account that is not on the allowlist", () => {
    expect(
      decideAdmin(
        { email: "someone@example.com", emailVerified: true, providers: ["google"] },
        allowlist,
      ),
    ).toEqual({ admin: false, reason: "not_allowlisted" });
  });

  it("grants nobody when the allowlist is empty", () => {
    expect(
      decideAdmin(
        { email: "donald@example.com", emailVerified: true, providers: ["google"] },
        new Set(),
      ),
    ).toEqual({ admin: false, reason: "no_allowlist" });
  });
});
