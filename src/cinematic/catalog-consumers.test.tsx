import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filmCollection } from "@/lib/mlai/categories/film-collection";
import { buildAbbeyTimeline, captionAt } from "./abbey-trailer/scenes";
import { SCRIPT } from "./film/narration-script";
import { FilmEvidence } from "./film/evidence";
import { ScenePersonaRouting, SceneVerifiableMemory } from "./film/scenes/core";
import { SceneGovernance } from "./film/scenes/outro";
import { SpriteContext, TimelineContext } from "./film/timeline-context";
import { Transcript } from "./film/transcript";

describe("cinematic consumers", () => {
  it("uses canonical film narration unchanged in the rendered transcript", () => {
    expect(SCRIPT.map((line) => line.text)).toEqual(filmCollection[0].cues.map((cue) => cue.text));
    const html = renderToStaticMarkup(<Transcript lines={SCRIPT} />);
    expect(html).toContain("I’m Abbey, the conversational profile.");
    expect(html).toContain("Strict checks recompute hashes. Links alone do not.");
    expect(html).not.toContain("Tampering can&#x27;t hide");
  });

  it("keeps Abbey particle scenes but derives their timing and all captions from the catalog", () => {
    const timeline = buildAbbeyTimeline({
      abi: "#22d3ee",
      aviva: "#a855f7",
      abbey: "#34d399",
      ink: "#040406",
      text: "#fafafa",
      dim: "#b6b6c0",
    });
    const film = filmCollection[2];
    expect(timeline.duration).toBe(film.duration);
    expect(timeline.cues.map((cue) => [cue.start, cue.start + cue.duration])).toEqual(
      film.chapters.map((chapter) => [chapter.start, chapter.end]),
    );
    expect(timeline.captions.map((caption) => caption.text)).toEqual(
      film.cues.map((cue) => cue.text),
    );
    const first = timeline.captions[0]!;
    expect(captionAt(timeline.captions, first.start)).toBe(first);
    expect(captionAt(timeline.captions, first.end)).toBeNull();
    expect(captionAt(timeline.captions, film.duration)).toBeNull();
  });

  it("shows canonical chapter evidence at starts, gaps and final hold", () => {
    for (const film of filmCollection.filter((record) => record.id !== "design")) {
      for (const chapter of film.chapters) {
        const html = renderToStaticMarkup(
          <TimelineContext.Provider
            value={{
              time: chapter.start,
              clock: chapter.start,
              duration: film.duration,
              playing: false,
              setTime: () => {},
              setPlaying: () => {},
              chrome: null,
              reducedMotion: false,
              scale: 1,
            }}
          >
            <FilmEvidence id={film.id} />
          </TimelineContext.Provider>,
        );
        expect(html).toContain(`data-film-chapter="${chapter.id}"`);
        expect(html).toContain(chapter.presentation);
        expect(html).toContain(chapter.statusNote);
      }
      const html = renderToStaticMarkup(
        <TimelineContext.Provider
          value={{
            time: film.duration,
            clock: film.duration,
            duration: film.duration,
            playing: false,
            setTime: () => {},
            setPlaying: () => {},
            chrome: null,
            reducedMotion: false,
            scale: 1,
          }}
        >
          <FilmEvidence id={film.id} />
        </TimelineContext.Provider>,
      );
      expect(html).toContain(`data-film-chapter="${film.chapters.at(-1)!.id}"`);
    }
  });

  it("labels the actual routing, chain and governance graphics with their limits", () => {
    function settled(element: React.ReactNode) {
      return renderToStaticMarkup(
        <SpriteContext.Provider
          value={{ localTime: 12, progress: 0.8, duration: 16, visible: true }}
        >
          {element}
        </SpriteContext.Provider>,
      );
    }
    const routing = settled(<ScenePersonaRouting />);
    expect(routing).toContain("Conversational · empathetic");
    expect(routing).toContain("Direct · technical");
    expect(routing).toContain("Orchestration · routing");
    expect(routing).toContain("ILLUSTRATIVE QUERY / SCORES");
    expect(routing).toContain("Explicit selection can bypass scoring.");
    const memory = settled(<SceneVerifiableMemory />);
    expect(memory).toContain("Link check ≠ content hash recomputation");
    expect(memory).toContain("Hash links are not signatures.");
    const governance = settled(<SceneGovernance />);
    expect(governance).toContain("13 substring patterns");
    expect(governance).toContain("ILLUSTRATIVE RESPONSE");
    expect(governance).toContain("Pattern checks are not semantic safety.");
    expect(governance).not.toContain("Every response, governed.");
  });
});
