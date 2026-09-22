import { describe, expect, it } from "vitest";
import { researchContext } from "./categories/research-context";

/**
 * Provenance links must resolve. Every MLAI-CORPORATION-WWW path below was
 * checked with `git cat-file -e 73721db…:<path>`, and the recorded sha256
 * values match the file contents at that revision (checked 2026-09-22).
 * `apps/quasar-web/` did not exist then; the web app lived at `apps/web/`.
 */
const VERIFIED_MLAI_PATHS = new Set([
  "apps/mobile/__tests__/cloud.test.ts",
  "apps/mobile/lib/cloud.ts",
  "apps/mobile/modules/mlai-cloudkit/ios/MlaiCloudKitModule.swift",
  "apps/web/docs/research-inventory.md",
  "apps/web/scripts/export-research.tsx",
  "apps/web/src/data/categories/platform.ts",
  "apps/web/src/lib/research-export.ts",
  "apps/quasar/README.md",
  "apps/quasar/packages/service/src/engine.ts",
  "apps/quasar/packages/service/src/paths.ts",
]);

function mlaiPaths(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const match = value.match(/MLAI-CORPORATION-WWW\/blob\/[0-9a-f]{40}\/(.+)$/);
    if (match) out.push(match[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) mlaiPaths(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) mlaiPaths(item, out);
  }
  return out;
}

describe("research-context provenance", () => {
  it("links only MLAI paths verified to exist at the pinned revision", () => {
    const paths = mlaiPaths(researchContext);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(VERIFIED_MLAI_PATHS.has(path), path).toBe(true);
  });
});
