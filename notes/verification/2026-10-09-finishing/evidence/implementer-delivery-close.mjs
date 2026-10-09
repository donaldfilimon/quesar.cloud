// Final coherent delivery check, including concurrent source/media commits.
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = "notes/verification/2026-10-09-finishing/evidence";
const load = async (name) => JSON.parse(await readFile(`${root}/${name}`, "utf8"));
const frozen = await load("implementer-trailer-freeze-hashes.json");
const final = await load("implementer-trailer-final-hashes.json");
for (const field of ["source_sha256", "baseline"]) assert.equal(final[field], frozen[field]);
for (const field of ["docs", "public", "persistent"]) assert.equal(final[field].sha256, frozen[field].sha256);
assert.deepEqual(final.installed, frozen.installed);
const commerce = await readFile(`${root}/implementer-delivery-commerce.log`, "utf8");
assert.equal(final.native_binary_sha256, commerce.match(/installed native WDBX SHA256 ([a-f0-9]{64})/)[1]);
const backend = await load("implementer-current-runner-receipts.json");
assert(backend.every((row) => row.exit === 0));
const logs = {
  "implementer-trailer-check.log": { exit: 0, files: 97, passed: 792 },
  "implementer-sidecar.log": { exit: 0, passed: 111, expectations: 470 },
  "implementer-trailer-static-build.log": { exit: 0 },
  "implementer-trailer-static-check.log": { exit: 0, pages: 129 },
  "implementer-trailer-static-browser.log": { exit: 0, passed: 226 },
  "implementer-trailer-persistent-build.log": { exit: 0 },
  "implementer-trailer-freeze.log": { exit: 0 },
  "implementer-trailer-persistent-acceptance.log": { exit: 0, passed: 1 },
  "implementer-delivery-commerce.log": { exit: 0, passed: 7, native_sha256: final.native_binary_sha256 },
  "implementer-postgres-delivery-stop.log": { exit: 0 },
  "implementer-current-static-browser.log": { exit: null, signal: "SIGTERM", superseded: "tool deadline, incomplete run; not a passing gate" },
  "implementer-current-static-browser-final.log": { exit: 1, passed: 222, failed: 4, superseded: "mobile Play blocked by narrated teaser control bar; repaired and complete rerun passed" },
  "implementer-current-static-build.log": { exit: 0 },
  "implementer-current-static-check.log": { exit: 1, superseded: "mark.vtt differed after concurrent public media update; unchanged rebuild/check passed" },
};
for (const row of backend) if (!logs[row.path.split("/").at(-1)]) logs[row.path.split("/").at(-1)] = { exit: row.exit, started: row.started, ended: row.ended };
for (const [name, value] of Object.entries(logs)) value.sha256 = createHash("sha256").update(await readFile(`${root}/${name}`)).digest("hex");
const owned = ["e2e/backend/commerce.acceptance.ts", "e2e/backend/durable.acceptance.ts", "e2e/backend/persistent.acceptance.ts", "e2e/backend/persistent.config.ts", "e2e/film/capture.acceptance.ts", "e2e/film/playwright.config.ts", "e2e/film/vite.config.ts", "sidecars/quasar-service/src/job.test.ts", "sidecars/quasar-service/src/server.test.ts", "sidecars/quasar-service/src/server.ts", "src/components/site/trailer.tsx", "src/components/site/trailer-editions.css", "src/routes/api/cron/audits-expire.ts", "src/routes/api/cron/-audits-expire.test.ts"];
const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0"));
let patch = execFileSync("git", ["diff", "--binary", "--", ...owned], { encoding: "utf8" });
for (const name of owned.filter((path) => !tracked.has(path))) {
  const result = spawnSync("git", ["diff", "--no-index", "--binary", "--", "/dev/null", name], { encoding: "utf8" });
  assert.equal(result.status, 1);
  patch += result.stdout;
}
await writeFile(`${root}/implementer-delivery-owned-source.diff`, patch);
await writeFile(`${root}/implementer-delivery-receipts.json`, JSON.stringify({ observed_at_utc: new Date().toISOString(), baseline: final.baseline, source_sha256: final.source_sha256, docs_sha256: final.docs.sha256, persistent_sha256: final.persistent.sha256, native_sha256: final.native_binary_sha256, source_and_public_unchanged_through_final_acceptance: true, installed_manifests_unchanged: true, logs }, null, 2) + "\n");
console.log("Final source/public/docs/frozen-artifact identity stable; final native commerce matches current checksum; gate exits, superseded failures and complete owned patch retained.");
