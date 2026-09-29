/**
 * The site trailer's cuts, in playback order. Each cut declares its own
 * sources, text track and poster, so nothing is derived from the id.
 *
 * Sources are listed best-first: AV1 WebM where the browser decodes it, H.264
 * MP4 everywhere else. `hasAudio` is whether the file carries sound at all;
 * the player hides its mute control for a silent cut rather than offering a
 * button that does nothing. Wafer and board keep the ambient track of their
 * source renders (notes/grok-export/imagine_videos); the mark never had one.
 *
 * The text tracks describe silent or ambient footage, so they are
 * `descriptions`, not captions of speech.
 */
export type FilmSource = { src: string; type: string };

const AV1 = (audio: boolean) => `video/webm; codecs="av01.0.05M.08${audio ? ", opus" : ""}"`;

export const filmCuts = [
  {
    id: "mark",
    title: "The mark",
    sources: [
      { src: "/media/quesar-trailer.webm", type: AV1(false) },
      { src: "/media/quesar-trailer.mp4", type: "video/mp4" },
    ],
    track: "/media/mark.vtt",
    poster: "/media/quesar-trailer.webp",
    hasAudio: false,
    duration: 10.04,
    caption: "The M is the stack: experience, then runtime, then memory.",
  },
  {
    id: "wafer",
    title: "The wafer",
    sources: [
      { src: "/media/atmosphere-wafer.webm", type: AV1(true) },
      { src: "/media/atmosphere-wafer.mp4", type: "video/mp4" },
    ],
    track: "/media/wafer.vtt",
    poster: "/media/atmosphere-wafer.webp",
    hasAudio: true,
    duration: 6.04,
    caption: "Compute is pictured here. It is not a measured result.",
  },
  {
    id: "board",
    title: "The board",
    sources: [
      { src: "/media/atmosphere-board.webm", type: AV1(true) },
      { src: "/media/atmosphere-board.mp4", type: "video/mp4" },
    ],
    track: "/media/board.vtt",
    poster: "/media/atmosphere-board.webp",
    hasAudio: true,
    duration: 6.04,
    caption: "Storage you can inspect. A film is orientation, not a benchmark.",
  },
] as const satisfies readonly {
  id: string;
  title: string;
  sources: readonly FilmSource[];
  track: string;
  poster: string;
  hasAudio: boolean;
  duration: number;
  caption: string;
}[];

export type FilmCut = (typeof filmCuts)[number]["id"];

/** The day the cuts were first published on this site (git history of public/media). */
export const FILM_PUBLISHED = "2026-09-22";
