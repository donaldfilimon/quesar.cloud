import type { OgSection } from "./og-sections";

/**
 * A section's Open Graph card path. Its own module, with only a type import,
 * because route `head`s land in the main bundle and must not carry the
 * section records in `./og-sections`.
 */
export const ogImage = (slug: OgSection) => `/og/${slug}.jpg`;
