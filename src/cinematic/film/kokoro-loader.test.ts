import { expect, it } from "vitest";
import { isBenignOrtAssignmentNotice } from "./kokoro-loader";

it("only filters the known benign execution-provider placement notice", () => {
  expect(
    isBenignOrtAssignmentNotice(
      "Some nodes were not assigned to the preferred execution providers which may or may not have an negative impact on performance",
    ),
  ).toBe(true);
  expect(isBenignOrtAssignmentNotice("onnxruntime: model load failed")).toBe(false);
  expect(isBenignOrtAssignmentNotice("VerifyEachNodeIsAssignedToAnEp failed: invalid device")).toBe(
    false,
  );
  expect(isBenignOrtAssignmentNotice(new Error("onnxruntime failure"))).toBe(false);
});
