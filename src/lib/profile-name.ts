/** mlai's per-field name limit (`firstName`/`lastName` were each capped at 80). */
export const DISPLAY_NAME_MAX = 80;

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/** Trim, then require 1..80 characters. Rejects rather than silently truncating. */
export function validateDisplayName(input: string): NameCheck {
  const name = input.trim();
  if (!name) return { ok: false, error: "Enter a display name." };
  if ([...name].length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: `Keep the display name to ${DISPLAY_NAME_MAX} characters or fewer.`,
    };
  }
  return { ok: true, name };
}
