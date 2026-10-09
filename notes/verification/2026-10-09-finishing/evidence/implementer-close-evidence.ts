import type { SnapshotReceipt, CommandReceipt } from "./evidence-types.ts";
// Preserve the final owned diff and actual command exits, without private environment values.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
const root = "notes/verification/2026-10-09-finishing/evidence";
const load = async <T = SnapshotReceipt>(name: string): Promise<T> =>
  JSON.parse(await readFile(join(root, name), "utf8"));
const frozen = await load("implementer-freeze-hashes.json");
const final = await load("implementer-final-hashes.json");
const beforeNative = await load("implementer-pre-native-rerun-hashes.json");
assert.equal(final.docs.sha256, frozen.docs.sha256);
assert.equal(final.persistent.sha256, frozen.persistent.sha256);
assert.equal(final.native_binary_sha256, beforeNative.native_binary_sha256);
assert.deepEqual(final.installed, frozen.installed);
const sourceDelta = [...new Set([...Object.keys(frozen.source), ...Object.keys(final.source)])]
  .filter((name) => frozen.source[name] !== final.source[name])
  .sort();
assert.deepEqual(sourceDelta, [
  "e2e/film/capture.acceptance.ts",
  "e2e/film/playwright.config.ts",
  "e2e/film/vite.config.ts",
]);
const owned = [
  "e2e/backend/commerce.acceptance.ts",
  "e2e/backend/durable.acceptance.ts",
  "e2e/backend/persistent.acceptance.ts",
  "e2e/backend/persistent.config.ts",
  ...sourceDelta,
  "sidecars/quasar-service/src/job.test.ts",
  "sidecars/quasar-service/src/server.test.ts",
  "sidecars/quasar-service/src/server.ts",
  "src/components/site/trailer-editions.css",
  "src/routes/api/cron/audits-expire.ts",
  "src/routes/api/cron/-audits-expire.test.ts",
];
let diff = execFileSync("git", ["diff", "--binary", "--", ...owned], { encoding: "utf8" });
const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0"));
for (const path of owned.filter((name) => !tracked.has(name))) {
  const result = spawnSync("git", ["diff", "--no-index", "--binary", "--", "/dev/null", path], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  diff += result.stdout;
}
await writeFile(join(root, "implementer-owned-source.diff"), diff);
const receipts: Record<string, CommandReceipt> = {
  "implementer-persistent-build.log": { exit: 0 },
  "implementer-freeze.log": { exit: 0 },
  "implementer-persistent-acceptance.log": {
    exit: 1,
    superseded: "missing local PG username in scrubbed environment",
  },
  "implementer-persistent-acceptance-retry.log": {
    exit: 1,
    superseded: "audit button actionability timeout; unchanged rerun passed; cause unproven",
  },
  "implementer-persistent-acceptance-final.log": { exit: 0, passed: 1 },
  "implementer-durable.log": { exit: 0, passed: 1 },
  "implementer-consent.log": {
    exit: 1,
    superseded: "shared PG controller stopped its cluster mid-test",
  },
  "implementer-consent-retry.log": { exit: 0, passed: 1 },
  "implementer-commerce.log": { exit: 0, passed: 7, binary: frozen.native_binary_sha256 },
  "implementer-commerce-final.log": { exit: 0, passed: 7, binary: final.native_binary_sha256 },
  "implementer-film-capture.log": {
    exit: 1,
    passed: 22,
    failed: 1,
    superseded: "browser probe lost across reload",
  },
  "implementer-film-capture-final.log": {
    exit: 1,
    passed: 21,
    failed: 2,
    superseded: "execution context/probe lost across reload",
  },
  "implementer-film-capture-qualified.log": {
    exit: 1,
    passed: 22,
    failed: 1,
    superseded: "repeated frame mismatch during concurrent receipt changes",
  },
  "implementer-film-debug.log": { exit: 0, passed: 1 },
  "implementer-film-watch.log": { exit: 0, passed: 1 },
  "implementer-film-isolated.log": { exit: 0, passed: 24 },
  "implementer-film-guard.log": { exit: 0, passed: 1 },
  "implementer-check.log": { exit: 0, files: 97, passed: 791 },
  "implementer-sidecar.log": { exit: 0, files: 14, passed: 111, expectations: 470 },
  "implementer-static-check.log": { exit: 0, pages: 129 },
  "implementer-static-browser.log": { exit: 0, passed: 226 },
  "implementer-postgres-init.log": { exit: 0 },
  "implementer-postgres-stop.log": { exit: 0 },
};
for (const [name, record] of Object.entries(receipts))
  record.log_sha256 = createHash("sha256")
    .update(await readFile(join(root, name)))
    .digest("hex");
await writeFile(
  join(root, "implementer-receipts.json"),
  JSON.stringify(
    {
      observed_at_utc: new Date().toISOString(),
      provenance:
        "Exit values observed from executing commands in this implementer continuation, not inferred from a pipe or truncated log.",
      sourceDelta,
      unchanged_installed_manifests: true,
      unchanged_docs: true,
      unchanged_frozen_persistent: true,
      unchanged_native_through_final_commerce: true,
      receipts,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Final source delta: three film harness files only; dependency manifests, docs and frozen Node artifact unchanged; final native checksum stable; owned diff and receipt hashes preserved.",
);
