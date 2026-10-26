import mark from "./mlai-mark.svg";

/** The MLAI mark's URL. Next.js imports images as `{ src, width, height }`; the boards need the string. */
export const markUrl: string = typeof mark === "string" ? mark : (mark as { src: string }).src;
