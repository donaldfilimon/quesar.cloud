import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it.each([undefined, "", "f".repeat(63), "z".repeat(64), "0".repeat(64), "valid"])(
  "binds receipt digest %s to current bytes before staging",
  (digest) => {
    const root = mkdtempSync(join(tmpdir(), "trailer-receipt-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "src/lib"), { recursive: true });
      const script = join(root, "scripts/sync-trailer-editions.py");
      writeFileSync(script, readFileSync("scripts/sync-trailer-editions.py"));
      const folder = join(root, "notes/launch/trailer-editions-2026-10-09/artifacts/kinetic-60");
      mkdirSync(folder, { recursive: true });
      const media = Buffer.from("disposable media fixture; probe evidence is synthetic");
      const sha = createHash("sha256").update(media).digest("hex");
      writeFileSync(join(folder, "mlai-quesar-kinetic-60.mp4"), media);
      for (const asset of ["middle.jpg", "captions.vtt", "transcript.txt"])
        writeFileSync(join(folder, asset), "fixture");
      writeFileSync(
        join(folder, "verification.json"),
        JSON.stringify({
          status: "encoded_and_full_decode_verified",
          sha256: digest === "valid" ? sha : digest,
          probe: {
            streams: [
              {
                codec_type: "video",
                width: 1920,
                height: 1080,
                avg_frame_rate: "30/1",
                nb_read_frames: 1800,
                duration: 60,
              },
              { codec_type: "audio" },
            ],
          },
        }),
      );
      const result = spawnSync("python3", [script], { encoding: "utf8" });
      if (digest === "valid") {
        expect(result.status, result.stderr).toBe(0);
        const catalog = JSON.parse(
          readFileSync(join(root, "src/lib/trailer-editions.generated.json"), "utf8"),
        );
        expect(catalog[0].sha256).toBe(sha);
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr).toMatch(/checksum/);
        expect(
          spawnSync("test", ["-e", join(root, "public/media/editions/kinetic-60")]).status,
        ).toBe(1);
        expect(
          spawnSync("test", ["-e", join(root, "src/lib/trailer-editions.generated.json")]).status,
        ).toBe(1);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
