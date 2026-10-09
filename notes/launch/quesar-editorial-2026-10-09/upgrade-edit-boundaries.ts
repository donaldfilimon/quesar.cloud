// Accommodate arithmetic roundoff from retiming, not editorial/sample tolerance.
// At 600 seconds this is ~4.3e-12 seconds, far below one PCM sample.
const tolerance = (...values: number[]) =>
  32 * Number.EPSILON * Math.max(1, ...values.map(Math.abs));
const near = (a: number, b: number) => Math.abs(a - b) <= tolerance(a, b);
const finite = (...values: number[]) => values.every(Number.isFinite);

/** Prove each original cue intersecting a cut is retained once, unchanged and
 * wholly inside one source/output chapter. No timestamp or content is rewritten.
 */
export interface Cue {
  id: string;
  text: string;
  sourceFilm: string;
  start: number;
  end: number;
  seconds: number;
  narrator?: string;
  voice?: string;
  speed?: number;
}
export interface Edit {
  duration: number;
  cues: Cue[];
  chapters: {
    sourceFilm: string;
    start: number;
    end: number;
    sourceStart: number;
    sourceEnd: number;
  }[];
}
export function validateAdaptationEdit(
  edit: Edit,
  duration: number,
  sourceTimings: Record<string, Cue[]>,
) {
  if (
    !finite(duration) ||
    duration <= 0 ||
    edit?.duration !== duration ||
    !Array.isArray(edit.cues) ||
    !edit.cues.length ||
    !Array.isArray(edit.chapters) ||
    !edit.chapters.length ||
    !sourceTimings
  )
    throw Error("Missing source edit provenance");
  const expected = [];
  let previousEnd = 0;
  for (let index = 0; index < edit.chapters.length; index++) {
    const chapter = edit.chapters[index];
    if (
      !chapter ||
      typeof chapter.sourceFilm !== "string" ||
      !finite(chapter.start, chapter.end, chapter.sourceStart, chapter.sourceEnd) ||
      chapter.sourceStart < 0 ||
      chapter.sourceEnd <= chapter.sourceStart ||
      chapter.end <= chapter.start ||
      !near(chapter.start, previousEnd) ||
      !near(chapter.end - chapter.start, chapter.sourceEnd - chapter.sourceStart)
    )
      throw Error("Invalid or noncontiguous source cut");
    previousEnd = chapter.end;
    const originals = sourceTimings[chapter.sourceFilm];
    if (!Array.isArray(originals) || !originals.length)
      throw Error("Missing original timing provenance");
    for (const original of originals) {
      if (
        !original ||
        typeof original.id !== "string" ||
        typeof original.text !== "string" ||
        !finite(original.start, original.end, original.seconds) ||
        original.start < 0 ||
        original.end <= original.start ||
        original.seconds <= 0 ||
        original.start + original.seconds > original.end + tolerance(original.start, original.end)
      )
        throw Error("Invalid original narration timing");
      const epsilon = tolerance(
        original.start,
        original.end,
        chapter.sourceStart,
        chapter.sourceEnd,
      );
      if (
        original.start >= chapter.sourceEnd - epsilon ||
        original.end <= chapter.sourceStart + epsilon
      )
        continue;
      if (
        original.start < chapter.sourceStart - epsilon ||
        original.end > chapter.sourceEnd + epsilon
      )
        throw Error("Source edit truncates original narration");
      expected.push({
        chapterIndex: index,
        sourceFilm: chapter.sourceFilm,
        original,
        start: chapter.start + original.start - chapter.sourceStart,
        end: chapter.start + original.end - chapter.sourceStart,
      });
    }
  }
  if (!near(previousEnd, duration)) throw Error("Source chapters do not cover the film duration");
  const used = new Set(),
    assignments = [];
  let previousCueStart: number | null = null;
  for (const cue of edit.cues) {
    if (
      !cue ||
      !finite(cue.start, cue.end, cue.seconds) ||
      cue.end <= cue.start ||
      cue.seconds <= 0 ||
      cue.start < -tolerance(duration) ||
      cue.end > duration + tolerance(duration)
    )
      throw Error("Nonfinite or out-of-range edit cue");
    if (
      previousCueStart !== null &&
      cue.start < previousCueStart - tolerance(cue.start, previousCueStart)
    )
      throw Error("Unordered edit cues");
    previousCueStart = cue.start;
    const matches = expected
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          cue.sourceFilm === item.sourceFilm &&
          cue.id === item.original.id &&
          near(cue.start, item.start) &&
          near(cue.end, item.end),
      );
    if (matches.length !== 1)
      throw Error("Edit cue truncates narration or has no unique source assignment");
    const { item, index } = matches[0];
    if (used.has(index)) throw Error("Duplicate original narration cue");
    used.add(index);
    if (
      !near(cue.seconds, item.original.seconds) ||
      (["text", "narrator", "voice", "speed"] as const).some(
        (key) => cue[key] !== item.original[key],
      )
    )
      throw Error("Original narration content or performance changed");
    assignments.push({
      id: cue.id,
      sourceFilm: cue.sourceFilm,
      chapterIndex: item.chapterIndex,
      start: cue.start,
      end: cue.end,
      startRoundoff: cue.start - item.start,
    });
  }
  if (used.size !== expected.length) throw Error("Original narration cue omitted from edit");
  return {
    policy: "32 machine epsilon scaled to compared timestamps; no editorial tolerance",
    originalCueCount: expected.length,
    assignments,
  };
}
