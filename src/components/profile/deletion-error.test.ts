import { expect, it } from "vitest";
import { deletionError } from "./delete-account";
it("describes partial progress without exposing arbitrary server text", () => {
  const message = deletionError("INTERNAL_SERVER_ERROR", "synthetic-private-driver-error");
  expect(message).toContain("Some data or connections may already have been removed");
  expect(message).not.toContain("synthetic-private-driver-error");
  expect(deletionError("INVALID_PASSWORD", "driver text")).toBe("That password is not correct.");
});
