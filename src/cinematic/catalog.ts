import {
  filmCollection,
  filmSources,
  type FilmId,
  type FilmNarrator,
  type FilmRecord,
} from "@/lib/mlai/categories/film-collection";

export interface NarrationLine {
  id: string;
  t: number;
  who: FilmNarrator;
  text: string;
  /** Fixed caption window, not measured speech duration. */
  dur: number;
}

/** Reject malformed authored data before it can drive playback or exports. */
export function validateFilmCollection(records: readonly FilmRecord[]): void {
  const filmIds = new Set<string>();
  const ids = new Set<string>();
  const knownFilms = new Set<string>(["film", "trailer", "abbey", "explainer", "mega", "design"]);
  function unique(id: string) {
    if (!/^[a-z][a-zA-Z0-9-]*$/.test(id) || ids.has(id))
      throw new Error(`Invalid or duplicate ID: ${id}`);
    ids.add(id);
  }
  function interval(start: number, end: number, duration: number, id: string) {
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      end > duration
    )
      throw new Error(`Invalid interval: ${id}`);
  }
  function sources(values: readonly string[], id: string) {
    if (values.some((source) => !Object.hasOwn(filmSources, source)))
      throw new Error(`Unknown source: ${id}`);
  }
  for (const film of records) {
    if (!knownFilms.has(film.id) || filmIds.has(film.id))
      throw new Error(`Invalid film ID: ${film.id}`);
    filmIds.add(film.id);
    if (!Number.isFinite(film.duration) || film.duration <= 0)
      throw new Error(`Invalid duration: ${film.id}`);
    let chapterEnd = 0;
    for (const chapter of film.chapters) {
      unique(chapter.id);
      interval(chapter.start, chapter.end, film.duration, chapter.id);
      if (chapter.start !== chapterEnd) throw new Error(`Chapter order or coverage: ${chapter.id}`);
      chapterEnd = chapter.end;
      sources(chapter.visual.sources, chapter.id);
      if (chapter.shot) {
        const { scroll } = chapter.shot;
        if (
          !chapter.shot.board ||
          !chapter.shot.readiness ||
          !chapter.shot.exploreHref ||
          !Number.isFinite(scroll.from) ||
          !Number.isFinite(scroll.to) ||
          scroll.from < 0 ||
          scroll.from > 1 ||
          scroll.to < 0 ||
          scroll.to > 1
        )
          throw new Error(`Invalid shot: ${chapter.id}`);
        interval(scroll.startOffset, scroll.endOffset, chapter.end - chapter.start, chapter.id);
      }
    }
    if (chapterEnd !== film.duration) throw new Error(`Incomplete chapters: ${film.id}`);
    let cueEnd = 0;
    for (const cue of film.cues) {
      unique(cue.id);
      interval(cue.start, cue.end, film.duration, cue.id);
      if (cue.start < cueEnd) throw new Error(`Cue order or overlap: ${cue.id}`);
      cueEnd = cue.end;
      const chapter = film.chapters.find((item) => item.id === cue.chapterId);
      if (!chapter || cue.start < chapter.start || cue.end > chapter.end)
        throw new Error(`Cue outside chapter: ${cue.id}`);
      if (!cue.text.trim() || !["abbey", "aviva", "abi"].includes(cue.narrator))
        throw new Error(`Invalid narration: ${cue.id}`);
      sources(cue.sources, cue.id);
    }
  }
}

validateFilmCollection(filmCollection);

export function filmRecord(id: FilmId): FilmRecord {
  const record = filmCollection.find((film) => film.id === id);
  if (!record) throw new Error(`Unknown film: ${id}`);
  return record;
}

export function filmScript(id: FilmId): NarrationLine[] {
  return filmRecord(id).cues.map((cue) => ({
    id: cue.id,
    t: cue.start,
    who: cue.narrator,
    text: cue.text,
    dur: cue.end - cue.start,
  }));
}

export function filmCaptions(id: FilmId) {
  return filmRecord(id).cues.map((cue) => ({
    id: cue.id,
    start: cue.start,
    end: cue.end,
    who: cue.narrator,
    text: cue.text,
  }));
}

type ChapterKey<I extends FilmId> = Extract<
  (typeof filmCollection)[number],
  { id: I }
>["chapters"][number]["id"] extends `${I}-${infer K}`
  ? K
  : never;

export function filmTimeline<I extends FilmId>(
  id: I,
): Record<ChapterKey<I>, readonly [number, number]> {
  return Object.fromEntries(
    filmRecord(id).chapters.map((chapter) => [
      chapter.id.slice(id.length + 1),
      [chapter.start, chapter.end] as const,
    ]),
  ) as Record<ChapterKey<I>, readonly [number, number]>;
}

/** Same eight shots for Explore's board inventory and the later directed player. */
export const designShots = filmCollection.find((film) => film.id === "design")!.chapters;
