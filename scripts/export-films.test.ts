import { expect, it } from "vitest";
import { Writable } from "node:stream";
import { captureURL, streamFilmFrames, type FilmFrameRenderer } from "./export-films";
it("rejects external/credentialed/unknown capture destinations", () => {
  expect(captureURL("http://127.0.0.1:4198", "design").href).toBe(
    "http://127.0.0.1:4198/showcase/design?capture=1",
  );
  expect(() => captureURL("https://quesar.cloud", "film")).toThrow();
  expect(() => captureURL("http://user:pass@localhost", "film")).toThrow();
  expect(() => captureURL("http://localhost", "../admin")).toThrow();
});
it("streams every frame once in order with bounded buffering and propagates encoder failures", async () => {
  let produced = 0,
    consumed = 0,
    maximumAhead = 0;
  const renderer: FilmFrameRenderer = {
    duration: 1,
    frameCount: 30,
    seed: 1,
    close: async () => {},
    render: async (frame) => {
      produced++;
      maximumAhead = Math.max(maximumAhead, produced - consumed);
      return {
        png: Buffer.alloc(256 * 1024, frame),
        receipt: { frame, time: frame / 30, board: null },
      };
    },
  };
  const received: number[] = [];
  await streamFilmFrames(
    renderer,
    new Writable({
      highWaterMark: 1,
      write(chunk, _encoding, done) {
        received.push(chunk[0]);
        consumed++;
        setTimeout(done, 1);
      },
    }),
  );
  expect(received).toEqual(Array.from({ length: 30 }, (_, i) => i));
  expect(maximumAhead).toBeLessThanOrEqual(2);
  produced = 0;
  await expect(
    streamFilmFrames(
      renderer,
      new Writable({
        write(_chunk, _encoding, done) {
          done(new Error("encoder failed"));
        },
      }),
    ),
  ).rejects.toThrow("encoder failed");
  expect(produced).toBeLessThan(30);
});
