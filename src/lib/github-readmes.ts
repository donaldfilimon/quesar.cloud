/**
 * The repositories whose README excerpts the /developers source panel shows.
 * Its own module so the panel's fallback can name them without importing the
 * GitHub loader, which stays behind a dynamic import.
 */
export const README_NAMES = [
  "quesar.cloud",
  "abi",
  "wdbx",
  "abbey",
  "skill-creator",
  "abbey-bot",
  "gama",
] as const;
