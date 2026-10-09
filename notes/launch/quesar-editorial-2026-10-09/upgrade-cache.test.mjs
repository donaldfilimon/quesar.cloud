import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateCachedPCM } from "./upgrade-cache.mjs";
const expected = {
  key: "key",
  sourceDigest: "source",
  text: "Original display text.",
  model: "model",
  voice: "voice",
  speed: 1,
};
const bytes = Buffer.from(new Float32Array(2400).fill(0.5).buffer);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const record = () => ({
  ...expected,
  persona: "abbey",
  pcmSHA256: hash(bytes),
  receipt: {
    sampleRate: 24000,
    seconds: 0.1,
    model: "model",
    device: "wasm",
    voice: "voice",
    speed: 1,
  },
});
test("accepts the exact finite measured performance", () => {
  const result = validateCachedPCM(bytes, record(), expected);
  assert.equal(result.samples.length, 2400);
  assert.equal(result.receipt.seconds, 0.1);
});
for (const seconds of [undefined, null, "0.1", "not a duration", NaN, Infinity, -1, 0, 0.2])
  test(`refuses missing, nonnumeric, nonfinite or mismatched duration ${String(seconds)}`, () => {
    const r = record();
    r.receipt.seconds = seconds;
    assert.throws(() => validateCachedPCM(bytes, r, expected), /length/);
  });
test("rejects changed waveform hash and source identity", () => {
  const changed = Buffer.from(bytes);
  changed[0] = 1;
  assert.throws(() => validateCachedPCM(changed, record(), expected), /provenance/);
  const r = record();
  r.sourceDigest = "different";
  assert.throws(() => validateCachedPCM(bytes, r, expected), /provenance/);
});
test("rejects invalid waveform even with a matching hash", () => {
  const bad = Buffer.from(new Float32Array(2400).fill(NaN).buffer),
    r = record();
  r.pcmSHA256 = hash(bad);
  assert.throws(() => validateCachedPCM(bad, r, expected), /Invalid cached PCM/);
});
test("rejects absent receipt, wrong rate and silent waveform", () => {
  assert.throws(() => validateCachedPCM(bytes, {}, expected), /provenance/);
  const r = record();
  r.receipt.sampleRate = 48000;
  assert.throws(() => validateCachedPCM(bytes, r, expected), /provenance/);
  const silent = Buffer.from(new Float32Array(2400).buffer),
    s = record();
  s.pcmSHA256 = hash(silent);
  assert.throws(() => validateCachedPCM(silent, s, expected), /Silent/);
});
