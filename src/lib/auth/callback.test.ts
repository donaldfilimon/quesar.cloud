import { expect, it } from "vitest";
import { signInErrorURL, signInFailure, signInFailureCopy } from "./callback";

it("retains a sanitized destination in provider failure callbacks", () => {
  const url = new URL(signInErrorURL("/profile?tab=sessions#devices"), "https://quesar.cloud");
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe("/profile?tab=sessions#devices");
  expect(
    new URL(signInErrorURL("/\t/attacker.example"), "https://quesar.cloud").searchParams.get(
      "next",
    ),
  ).toBe("/console");
});

it("maps callback errors to fixed safe messages without provider descriptions", () => {
  expect(signInFailure("access_denied")).toBe("cancelled");
  expect(signInFailure("provider_email_unverified")).toBe("unverified");
  expect(signInFailure("state_not_found")).toBe("expired");
  const raw = "<script>private-provider-description</script>";
  expect(signInFailure(raw)).toBe("failed");
  expect(signInFailureCopy[signInFailure(raw)!]).not.toContain(raw);
  for (const value of [undefined, null, {}, [], ""]) expect(signInFailure(value)).toBeUndefined();
});
