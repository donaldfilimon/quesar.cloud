import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { TrailerEditions } from "./trailer-editions";
import { trailerEditions } from "@/lib/trailer-editions";

it("shows one selected feature and all twenty-four choices without loading a video", () => {
  const html = renderToStaticMarkup(<TrailerEditions />);
  expect(html).not.toContain("<video");
  expect(html).not.toContain("<source");
  expect(html).not.toContain(".mp4");
  expect(html).toContain("Open player for Quesar architecture · 1 min");
  expect(html).toContain("Filter films by duration");
  expect(html).toContain("vision and roadmap");
  for (const film of trailerEditions) {
    expect(html).toContain(
      `Select ${film.title}, ${film.brand}, ${film.edition === "native30" ? "Native30 · Samantha narration" : "Neural performance"}`,
    );
    expect(film.video.endsWith(film.master)).toBe(true);
    const receipt = JSON.parse(readFileSync(film.proof, "utf8"));
    expect(receipt.status).toMatch(/full_decode_verified$/);
    const stream = receipt.probe.streams.find(
      (item: { codec_type: string }) => item.codec_type === "video",
    );
    expect(stream.avg_frame_rate).toBe("30/1");
    expect(Number(stream.nb_read_frames)).toBe(film.seconds * 30);
    expect(film.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(existsSync(`public${film.poster}`)).toBe(true);
    expect(readFileSync(`public${film.captions}`, "utf8")).toMatch(/^WEBVTT/);
    expect(readFileSync(`public${film.transcript}`, "utf8").length).toBeGreaterThan(100);
  }
  expect(trailerEditions).toHaveLength(24);
  for (const duration of [60, 120, 180, 600]) {
    expect(trailerEditions.filter((film) => film.seconds === duration)).toHaveLength(6);
  }
});

it("keeps the neural default and distinguishes the eight native30 editions", () => {
  const html = renderToStaticMarkup(<TrailerEditions />);
  expect(html).toContain("All 24 films");
  expect(html).toContain("24 shown");
  expect(html).toContain("macOS Samantha narration");
  expect(html).toContain("1 min · 6");
  expect(trailerEditions.filter((film) => film.edition === "native30")).toHaveLength(8);
  expect(new Set(trailerEditions.map((film) => film.id)).size).toBe(24);
  for (const film of trailerEditions.filter((film) => film.edition === "native30")) {
    expect(film.id).toMatch(/-native30$/);
    expect(film.video).toContain("/trailer-editions-2026-10-09/");
    expect(film.poster).toContain(`/${film.id}/`);
  }
  expect(html).toContain("Quesar / architecture / Neural performance");
});
