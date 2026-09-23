/** The site trailer's cuts, in playback order. */
export const filmCuts = [
  {
    id: "mark",
    title: "The mark",
    src: "/media/quesar-trailer.mp4",
    poster: "/media/quesar-trailer.jpg",
    caption: "The M is the stack: experience, then runtime, then memory.",
  },
  {
    id: "wafer",
    title: "The wafer",
    src: "/media/atmosphere-wafer.mp4",
    poster: "/media/atmosphere-wafer.jpg",
    caption: "Compute is pictured here. It is not a measured result.",
  },
  {
    id: "board",
    title: "The board",
    src: "/media/atmosphere-board.mp4",
    poster: "/media/atmosphere-board.jpg",
    caption: "Storage you can inspect. A film is orientation, not a benchmark.",
  },
] as const;

export type FilmCut = (typeof filmCuts)[number]["id"];
