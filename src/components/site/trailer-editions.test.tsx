import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { TrailerEditions } from "./trailer-editions";
import { trailerEditions } from "@/lib/trailer-editions";

it("offers captioned high-resolution editions without fetching video before intent", () => {
  const html = renderToStaticMarkup(<TrailerEditions />);
  expect(html).not.toContain("<video");
  expect(html).not.toContain("<source");
  for (const film of trailerEditions) {
    expect(html).toContain(film.video);
    expect(html).toContain(film.brand);
    expect(film.video.endsWith(film.master)).toBe(true);
    const receipt = JSON.parse(readFileSync(film.proof, "utf8"));
    expect(receipt.status).toMatch(/full_decode_verified$/);
    const stream = receipt.probe.streams.find(
      (item: { codec_type: string }) => item.codec_type === "video",
    );
    expect(stream.avg_frame_rate).toBe("30/1");
    expect(Number(stream.nb_read_frames)).toBe(film.seconds * 30);
    expect(film.sha256).toMatch(/^[a-f0-9]{64}$/);
    if (film.brand === "Quesar") {
      expect(receipt.renderSamplingFps).toBe(30);
      expect(receipt.browserErrors).toEqual([]);
      expect(receipt.sha256).toBe(film.sha256);
    }
    expect(html).toContain(film.captions);
    expect(html).toContain(film.transcript);
    expect(html).toContain(`Open player for ${film.title}`);
    expect(existsSync(`public${film.poster}`)).toBe(true);
    expect(readFileSync(`public${film.captions}`, "utf8")).toMatch(/^WEBVTT/);
    expect(readFileSync(`public${film.transcript}`, "utf8").length).toBeGreaterThan(100);
  }
  expect(html).toContain("vision and roadmap");
  expect(html).toContain("Filter films by duration");
});

it("distinguishes the MLAI perspectives from native Quesar editorial films", () => {
  expect(new Set(trailerEditions.map((film) => film.brand))).toEqual(new Set(["MLAI", "Quesar"]));
  expect(
    trailerEditions.some((film) => film.brand === "Quesar" && film.style === "architecture"),
  ).toBe(true);
  expect(trailerEditions.some((film) => film.brand === "Quesar" && film.style === "studio")).toBe(
    true,
  );
});
