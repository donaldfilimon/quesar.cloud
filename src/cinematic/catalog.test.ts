import { describe, expect, it } from "vitest";
import { filmCollection, type FilmRecord } from "@/lib/mlai/categories/film-collection";
import {
  designShots,
  filmCaptions,
  filmRecord,
  filmScript,
  filmTimeline,
  validateFilmCollection,
} from "./catalog";

function fixture(): FilmRecord {
  return structuredClone(filmCollection[0]);
}

describe("canonical cinematic catalog", () => {
  it("preserves six durations and the planned, unmeasured export boundary", () => {
    expect(() => validateFilmCollection(filmCollection)).not.toThrow();
    expect(filmCollection.map((film) => film.duration)).toEqual([69, 62, 38, 132, 282, 80]);
    for (const film of filmCollection) {
      expect(filmRecord(film.id)).toBe(film);
      expect(film.export.status).toBe("planned");
      expect(film.export.narrationTiming).toBe("unmeasured");
      expect(film.export.captionSource).toBe("cues.text");
      expect(film.export.transcriptSource).toBe("cues.text");
    }
  });

  it("uses exact cue text, persona and windows for narration, captions and transcripts", () => {
    for (const film of filmCollection) {
      const narration = filmScript(film.id);
      const captions = filmCaptions(film.id);
      expect(narration.map((line) => line.text)).toEqual(film.cues.map((cue) => cue.text));
      expect(captions.map((line) => line.text)).toEqual(narration.map((line) => line.text));
      for (const [index, cue] of film.cues.entries()) {
        expect(narration[index]).toEqual({
          id: cue.id,
          t: cue.start,
          who: cue.narrator,
          text: cue.text,
          dur: cue.end - cue.start,
        });
        expect(captions[index]).toEqual({
          id: cue.id,
          start: cue.start,
          end: cue.end,
          who: cue.narrator,
          text: cue.text,
        });
      }
      expect(Object.values(filmTimeline(film.id))).toEqual(
        film.chapters.map((chapter) => [chapter.start, chapter.end]),
      );
    }
  });

  it("exposes eight ordered ten-second design shots with readiness, scroll and Explore", () => {
    expect(designShots.map((chapter) => chapter.shot.board)).toEqual([
      "brand",
      "system",
      "showcase",
      "hero",
      "lab",
      "marketing",
      "console",
      "docs",
    ]);
    for (const [index, chapter] of designShots.entries()) {
      expect([chapter.start, chapter.end]).toEqual([index * 10, (index + 1) * 10]);
      expect(chapter.shot.scroll).toEqual({ from: 0, to: 0.65, startOffset: 2, endOffset: 8 });
      expect(chapter.shot.readiness).toContain("stable content");
      expect(chapter.shot.exploreHref).toBe("/showcase/design");
    }
  });

  it.each([
    ["unknown film", (film: FilmRecord) => ({ ...film, id: "unknown" }), "Invalid film ID"],
    [
      "nonfinite duration",
      (film: FilmRecord) => ({ ...film, duration: Infinity }),
      "Invalid duration",
    ],
    [
      "malformed ID",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, id: "bad id" }] }),
      "Invalid or duplicate ID",
    ],
    [
      "duplicate ID",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, id: film.chapters[0]!.id }] }),
      "Invalid or duplicate ID",
    ],
    [
      "negative time",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, start: -1 }] }),
      "Invalid interval",
    ],
    [
      "nonfinite time",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, end: NaN }] }),
      "Invalid interval",
    ],
    [
      "zero window",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, end: film.cues[0]!.start }] }),
      "Invalid interval",
    ],
    [
      "duration overrun",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, end: film.duration + 1 }] }),
      "Invalid interval",
    ],
    [
      "overlapping cues",
      (film: FilmRecord) => ({ ...film, cues: [film.cues[0]!, { ...film.cues[1]!, start: 4 }] }),
      "Cue order or overlap",
    ],
    [
      "out-of-order cues",
      (film: FilmRecord) => ({ ...film, cues: [film.cues[1]!, film.cues[0]!] }),
      "Cue order or overlap",
    ],
    [
      "chapter gap",
      (film: FilmRecord) => ({
        ...film,
        chapters: film.chapters.map((chapter, index) =>
          index === 1 ? { ...chapter, start: 10 } : chapter,
        ),
      }),
      "Chapter order or coverage",
    ],
    [
      "chapter overlap",
      (film: FilmRecord) => ({
        ...film,
        chapters: film.chapters.map((chapter, index) =>
          index === 1 ? { ...chapter, start: 8 } : chapter,
        ),
      }),
      "Chapter order or coverage",
    ],
    [
      "chapter order",
      (film: FilmRecord) => ({
        ...film,
        chapters: [film.chapters[1]!, film.chapters[0]!, ...film.chapters.slice(2)],
      }),
      "Chapter order or coverage",
    ],
    [
      "chapter missing",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, chapterId: "absent" }] }),
      "Cue outside chapter",
    ],
    [
      "chapter overrun",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, end: 10 }] }),
      "Cue outside chapter",
    ],
    [
      "unknown source",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, sources: ["unknown"] }] }),
      "Unknown source",
    ],
    [
      "empty text",
      (film: FilmRecord) => ({ ...film, cues: [{ ...film.cues[0]!, text: " " }] }),
      "Invalid narration",
    ],
  ])("rejects %s authored data", (_name, mutate, message) => {
    expect(() => validateFilmCollection([mutate(fixture()) as FilmRecord])).toThrow(message);
  });

  it("rejects duplicate films, IDs across films and invalid design scroll budgets", () => {
    expect(() => validateFilmCollection([fixture(), fixture()])).toThrow("Invalid film ID");
    const second = {
      ...structuredClone(filmCollection[1]),
      cues: [{ ...filmCollection[1].cues[0], id: filmCollection[0].cues[0].id }],
    };
    expect(() => validateFilmCollection([fixture(), second])).toThrow("Invalid or duplicate ID");
    const design = structuredClone(filmCollection[5]);
    const chapter = design.chapters[0];
    expect(() =>
      validateFilmCollection([
        {
          ...design,
          chapters: [
            {
              ...chapter,
              shot: { ...chapter.shot, scroll: { ...chapter.shot.scroll, endOffset: 11 } },
            },
            ...design.chapters.slice(1),
          ],
        },
      ]),
    ).toThrow("Invalid interval");
  });
});
