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

it("spells initialisms the six films speak that the table left intact", () => {
  expect(pronounce("MCP owns the store-facing completion persistence tail.")).toBe(
    "M‑C‑P owns the store-facing completion persistence tail.",
  );
  expect(pronounce("WAL frames checksum JSON bytes. Bad checksums report corruption.")).toBe(
    "wall frames checksum J‑S‑O‑N bytes. Bad checksums report corruption.",
  );
  expect(pronounce("ABI separates its pure AI core from storage I/O.")).toBe(
    "A‑B‑I separates its pure A.I. core from storage I‑O.",
  );
  expect(chunkText(pronounce("Recovery can report corruption or I/O failure."))).toEqual([
    "Recovery can report corruption or I‑O failure.",
  ]);
});
