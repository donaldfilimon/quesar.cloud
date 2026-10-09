import { expect, it } from "vitest";
import { pronounce } from "./pronunciation";
import { chunkText } from "@/lib/trailer-engine/audio";

it("keeps technical identifiers in one spoken sentence while leaving display text untouched", () => {
  const original = "The local service copies a Next.js template into its sites directory.";
  const spoken = pronounce(original);
  expect(spoken).toBe("The local service copies a Next jay ess template into its sites directory.");
  expect(chunkText(spoken)).toHaveLength(1);
  expect(original).toContain("Next.js");
  expect(pronounce("quesar.cloud")).toBe("Quasar dot cloud");
  expect(pronounce("Quesar by MLAI")).toBe("Quasar by M‑L‑A‑I");
});
