import type { FilmId } from "@/lib/mlai/categories/film-collection";
import { filmRecord } from "../catalog";
import { useTimeline } from "./timeline-context";
import { C, FONT } from "./tokens";

/** A source/vision label beside the scene; it never grants runtime acceptance. */
export function FilmEvidence({ id }: { id: FilmId }) {
  const { time } = useTimeline();
  const film = filmRecord(id);
  const chapter =
    film.chapters.find((item) => time >= item.start && time < item.end) ??
    (time === film.duration ? film.chapters.at(-1) : undefined);
  if (!chapter) return null;
  return (
    <aside
      data-film-chapter={chapter.id}
      style={{
        position: "absolute",
        top: 90,
        right: 100,
        maxWidth: 460,
        zIndex: 45,
        fontFamily: FONT.mono,
        fontSize: 15,
        lineHeight: 1.5,
        textAlign: "right",
        color: C.dim,
      }}
    >
      <div style={{ color: chapter.presentation === "VISION" ? C.violetHi : C.cyanHi }}>
        {chapter.presentation} · {chapter.visual.text}
      </div>
      <div style={{ fontSize: 13 }}>{chapter.statusNote}</div>
    </aside>
  );
}
