import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
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
        writeFileSync(
          join(folder, asset),
          asset === "captions.vtt" ? "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFixture" : "fixture",
        );
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

function upgradedFixture() {
  const root = mkdtempSync(join(tmpdir(), "trailer-upgrade-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "src/lib"), { recursive: true });
  writeFileSync(
    join(root, "scripts/sync-trailer-editions.py"),
    readFileSync("scripts/sync-trailer-editions.py"),
  );
  writeFileSync(join(root, "source.js"), "const film = true;\n");
  const sourceHash = createHash("sha256")
    .update(readFileSync(join(root, "source.js")))
    .digest("hex");
  const sources = { "source.js": sourceHash };
  const externalImports: string[] = [];
  const sourceDigest = createHash("sha256")
    .update(JSON.stringify({ sources, externalImports }))
    .digest("hex");
  const input = join(root, "notes/launch/upgrade/artifacts/abbey-neural-v6");
  const items: [string, number, "Quesar" | "MLAI"][] = [
    ...[60, 120, 180, 600].flatMap((duration) =>
      ["architecture", "studio"].map(
        (style) =>
          [`quesar-${style}-${duration}`, duration, "Quesar"] as [string, number, "Quesar"],
      ),
    ),
    ...[
      ["kinetic", 60],
      ["editorial", 60],
      ["technical", 120],
      ["design", 120],
      ["technical", 180],
      ["design", 180],
      ["technical", 600],
      ["design", 600],
    ].map(
      ([style, duration]) =>
        [`mlai-quesar-${style}-${duration}`, Number(duration), "MLAI"] as [string, number, "MLAI"],
    ),
  ];
  for (const [id, duration, brand] of items) {
    const folder = join(input, id);
    mkdirSync(folder, { recursive: true });
    const video = Buffer.from(`fixture video ${id}`);
    const sha256 = createHash("sha256").update(video).digest("hex");
    writeFileSync(join(folder, `${id}.mp4`), video);
    const poster = brand === "Quesar" ? `sample-${duration * 15}.jpg` : "middle.jpg";
    const sidecar = brand === "Quesar" ? "timeline.json" : "edit.json";
    for (const [name, content] of [
      [poster, "fixture poster"],
      ["captions.vtt", "WEBVTT\n\nFixture"],
      ["transcript.txt", "Fixture transcript"],
      [sidecar, "{}"],
    ])
      writeFileSync(join(folder, name), content);
    const fileHashes = Object.fromEntries(
      ["captions.vtt", "transcript.txt", sidecar].map((name) => [
        name,
        createHash("sha256")
          .update(readFileSync(join(folder, name)))
          .digest("hex"),
      ]),
    );
    const inheritedInput = brand === "MLAI" ? { "source.js": sourceHash } : null;
    const inputDigest = createHash("sha256")
      .update(JSON.stringify({ sourceDigest, id, version: "abbey-neural-v6", inheritedInput }))
      .digest("hex");
    writeFileSync(
      join(folder, "verification.json"),
      JSON.stringify({
        id,
        version: "abbey-neural-v6",
        status: brand === "Quesar" ? "full_decode_verified" : "encoded_and_full_decode_verified",
        sha256,
        sources,
        externalImports,
        inheritedInput,
        inputDigest,
        fileHashes,
        listeningReview: "pending",
        visualReview: "pending",
        listeningAccepted: false,
        visualReviewAccepted: false,
        renderSamplingFps: 30,
        outputFps: 30,
        browserErrors: [],
        probe: {
          streams: [
            {
              codec_type: "video",
              width: 1920,
              height: 1080,
              avg_frame_rate: "30/1",
              nb_read_frames: duration * 30,
              duration,
            },
            { codec_type: "audio" },
          ],
        },
      }),
    );
  }
  const run = () =>
    spawnSync(
      "python3",
      [
        join(root, "scripts/sync-trailer-editions.py"),
        "--input-dir",
        input,
        "--release-tag",
        "trailer-editions-2026-10-09-abbey-neural",
      ],
      { encoding: "utf8" },
    );
  return { root, input, run };
}

it("requires all 16 upgrade receipts before writing catalog or public assets", () => {
  const fixture = upgradedFixture();
  try {
    rmSync(join(fixture.input, "quesar-studio-600/verification.json"));
    const result = fixture.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("all 16 required");
    expect(existsSync(join(fixture.root, "src/lib/trailer-editions.generated.json"))).toBe(false);
    expect(existsSync(join(fixture.root, "public/media/editions"))).toBe(false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

it("accepts technically verified films with pending subjective review and stages exactly four per duration", () => {
  const fixture = upgradedFixture();
  try {
    const result = fixture.run();
    expect(result.status, result.stderr).toBe(0);
    const catalog = JSON.parse(
      readFileSync(join(fixture.root, "src/lib/trailer-editions.generated.json"), "utf8"),
    );
    expect(catalog).toHaveLength(16);
    for (const duration of [60, 120, 180, 600])
      expect(catalog.filter((film: { seconds: number }) => film.seconds === duration)).toHaveLength(
        4,
      );
    expect(
      catalog.every((film: { video: string }) =>
        film.video.includes("trailer-editions-2026-10-09-abbey-neural"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          fixture.root,
          "public/media/editions/quesar-architecture-60/quesar-architecture-60.mp4",
        ),
      ),
    ).toBe(false);
    const changed = join(fixture.input, "quesar-architecture-60/captions.vtt");
    writeFileSync(changed, "WEBVTT\nchanged");
    const rejected = fixture.run();
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("changed sidecar");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

it("rejects an unverified technical receipt before writing any output", () => {
  const fixture = upgradedFixture();
  try {
    const proof = join(fixture.input, "quesar-architecture-60/verification.json");
    const receipt = JSON.parse(readFileSync(proof, "utf8"));
    receipt.status = "rendered";
    writeFileSync(proof, JSON.stringify(receipt));
    const result = fixture.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("invalid status");
    expect(existsSync(join(fixture.root, "src/lib/trailer-editions.generated.json"))).toBe(false);
    expect(existsSync(join(fixture.root, "public/media/editions"))).toBe(false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

it("adds all native30 editions idempotently and validates every master before writing", () => {
  const result = execFileSync(
    "python3",
    [
      "-c",
      `
import importlib.util, tempfile, json
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("sync", "scripts/sync-trailer-editions.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    sync.ROOT = root
    sync.DEST = root / "catalog.json"
    existing = [{"id": "neural", "video": "unchanged"}]
    sync.DEST.write_text(json.dumps(existing))
    for candidate in sync.candidates(False, root):
        if candidate[1] != "Quesar":
            continue
        name, _, _, seconds, _, folder, filename, status = candidate
        folder.mkdir(parents=True)
        (folder / filename).write_bytes(b"verified master")
        (folder / f"sample-{seconds * 15}.jpg").write_bytes(b"poster")
        (folder / "captions.vtt").write_text("WEBVTT\\n")
        (folder / "transcript.txt").write_text("Samantha narration")
        receipt = dict(status=status, sha256=sync.digest(folder / filename), renderSamplingFps=30, outputFps=30, browserErrors=[], probe={"streams": [dict(codec_type="video", width=1920, height=1080, avg_frame_rate="30/1", nb_read_frames=seconds * 30, duration=seconds), dict(codec_type="audio")]})
        (folder / "verification.json").write_text(json.dumps(receipt))
    with patch("sys.argv", ["sync", "--native30"]):
        sync.main()
        first = sync.DEST.read_bytes()
        assert json.loads(first)[0] == existing[0]
        assert len(json.loads(first)) == 9
        sync.main()
        assert sync.DEST.read_bytes() == first
        assets = {str(p): p.read_bytes() for p in (root / "public").rglob("*") if p.is_file()}
        last = sync.candidates(False, root)[-1]
        master = last[5] / last[6]
        for failure in ("invalid", "missing"):
            if failure == "invalid":
                master.write_bytes(b"changed")
            else:
                master.unlink()
            try:
                sync.main()
                raise AssertionError("invalid master accepted")
            except ValueError:
                pass
            assert sync.DEST.read_bytes() == first
            assert {str(p): p.read_bytes() for p in (root / "public").rglob("*") if p.is_file()} == assets
print("additive sync and failure-before-write verified")
`,
    ],
    { encoding: "utf8" },
  );
  expect(result).toContain("additive sync and failure-before-write verified");
});
