import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { NarratedFilms } from "./narrated-films";
import { filmCollection } from "@/lib/mlai/categories/film-collection";

it("offers all six captioned exports and transcripts without loading any video before intent", () => {
  const html = renderToStaticMarkup(<NarratedFilms />);
  expect(html).not.toContain("<video");
  expect(html).not.toContain("<source");
  for (const film of filmCollection) {
    expect(html).toContain(`href="/media/films/${film.id}.mp4"`);
    expect(html).toContain(`href="/media/films/${film.id}.vtt"`);
    expect(html).toContain(`href="/media/films/${film.id}.transcript.txt"`);
    expect(html).toContain(`src="/media/films/${film.id}.poster.png"`);
    expect(html).toContain(`aria-label="Play ${film.title}"`);
  }
  expect(html).toContain("AI narration");
  expect(html).toContain("vision and roadmap");
});
