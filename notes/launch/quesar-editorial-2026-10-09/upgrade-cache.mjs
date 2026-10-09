import { createHash } from "node:crypto";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Reject corrupt, mismatched or incomplete cached performances before placement. */
export function validateCachedPCM(bytes, record, { key, sourceDigest, text, model, voice, speed }) {
  if (
    !record ||
    !record.receipt ||
    record.key !== key ||
    record.sourceDigest !== sourceDigest ||
    record.text !== text ||
    record.persona !== "abbey" ||
    record.pcmSHA256 !== sha(bytes) ||
    record.receipt.sampleRate !== 24000 ||
    record.receipt.model !== model ||
    !["wasm", "webgpu"].includes(record.receipt.device) ||
    record.receipt.voice !== voice ||
    record.receipt.speed !== speed ||
    bytes.length % 4
  )
    throw Error("Invalid cached neural provenance");
  const samples = new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  if (
    !samples.length ||
    !Number.isFinite(record.receipt.seconds) ||
    record.receipt.seconds <= 0 ||
    samples.length > 90 * 24000 ||
    Math.abs(samples.length / 24000 - record.receipt.seconds) > 1e-8
  )
    throw Error("Invalid cached neural length");
  let peak = 0;
  for (const value of samples) {
    if (!Number.isFinite(value) || Math.abs(value) > 1) throw Error("Invalid cached PCM");
    peak = Math.max(peak, Math.abs(value));
  }
  if (!peak) throw Error("Silent cached PCM");
  return { samples, receipt: record.receipt, pcmSHA256: record.pcmSHA256 };
}
