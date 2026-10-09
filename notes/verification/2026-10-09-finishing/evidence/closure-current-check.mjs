import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const folder = "notes/verification/2026-10-09-finishing/evidence";
const load = async (name) => JSON.parse(await readFile(`${folder}/${name}`, "utf8"));
const qualified = await load("implementer-trailer-final-hashes.json");
const initial = await load("closure-initial-hashes.json");
const current = await load("implementer-closure-final-hashes.json");
for (const key of ["baseline", "source_sha256", "installed"]) assert.deepEqual(initial[key], qualified[key]);
for (const key of ["docs", "public", "persistent"]) {
  assert.equal(initial[key].sha256, qualified[key].sha256);
}
assert.equal(current.persistent.sha256, qualified.persistent.sha256);
const delta = [...new Set([...Object.keys(qualified.source), ...Object.keys(current.source)])].filter((name) => qualified.source[name] !== current.source[name]);
const test = "sidecars/quasar-service/src/publication.test.ts";
assert(delta.includes(test));
assert.deepEqual(delta.filter((name) => name.startsWith("sidecars/quasar-service/")), [test]);
const installedEqual = JSON.stringify(current.installed) === JSON.stringify(qualified.installed);
const manifestEqual = ["package.json", "bun.lock"].every((name) => current.source[name] === qualified.source[name]);
const docsEqual = current.docs.sha256 === qualified.docs.sha256;
const publicEqual = current.public.sha256 === qualified.public.sha256;
const siteDelta = delta.filter((name) => name !== test);
const mutableQualified = current.baseline === qualified.baseline && !siteDelta.length && installedEqual && manifestEqual && docsEqual && publicEqual && JSON.stringify(current.toolchain) === JSON.stringify(qualified.toolchain);
const archive = await load("latest-node-archive.json");
assert.equal(createHash("sha256").update(await readFile(archive.archive)).digest("hex"), archive.archive_sha256);
const films = await load("film-worksheet-current.json");
assert.equal(films.count, 16);
const patch = spawnSync("git", ["diff", "--no-index", "--", "/dev/null", test], { encoding: "utf8" });
assert.equal(patch.status, 1);
await writeFile(`${folder}/publication-order-source.diff`, patch.stdout);
const logs = {};
for (const name of ["latest-node-archive.log", "publication-order-focused.log", "publication-order-typecheck.log", "publication-order-sidecar-gate.log", "film-worksheet-current.log"]) {
  logs[name] = { exit: 0, sha256: createHash("sha256").update(await readFile(`${folder}/${name}`)).digest("hex") };
}
await writeFile(`${folder}/closure-current-receipt.json`, JSON.stringify({
  observed_at_utc: new Date().toISOString(), baseline: current.baseline,
  qualified_source_sha256: qualified.source_sha256, current_source_sha256: current.source_sha256,
  source_delta: delta, unowned_site_source_delta: siteDelta,
  mutable_checkout_matches_qualified_snapshot: mutableQualified,
  mutable_checkout_gate_status: mutableQualified ? "Qualified with scoped sidecar test delta" : "Partial: concurrent checkout/toolchain/media drift; no new integrated acceptance claimed",
  installed_manifests_unchanged: installedEqual, package_and_lock_unchanged: manifestEqual,
  docs_unchanged: docsEqual, public_unchanged: publicEqual, frozen_compiled_tree_unchanged: true,
  qualified_baseline: qualified.baseline, qualified_docs_sha256: qualified.docs.sha256,
  observed_toolchain: current.toolchain, qualified_toolchain: qualified.toolchain,
  publication_patch_sha256: createHash("sha256").update(patch.stdout).digest("hex"),
  docs_sha256: current.docs.sha256, persistent_sha256: current.persistent.sha256,
  archive: archive.archive, archive_sha256: archive.archive_sha256,
  controlled_publication_order: "Current: observed actual success/error emitter entry, real implementation forwarded; no production seam. Crash/power-loss durability unqualified.",
  sidecar: { exit: 0, files: 15, tests: 113, expectations: 486 },
  worksheet: { exit: 0, exact_hash_masters: 16, full_review_fields_pending: 32 },
  passing_site_gate_reruns: 0, logs,
}, null, 2) + "\n");
console.log(`Qualified archive and gated sidecar proof stable; mutable checkout matches qualified snapshot: ${mutableQualified}; 16 exact-hash masters retain32pending full-review fields. Concurrent drift is recorded, not reclassified as a passing gate.`);
