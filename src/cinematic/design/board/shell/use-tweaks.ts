/* useTweaks — tweak-value state for the Tweaks shell (TweaksPanel.tsx).
   Split out so TweaksPanel.tsx exports only components (fast refresh). */
import { useState, useCallback } from "react";

/* ── useTweaks ─────────────────────────────────────────────────── */
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
export type SetTweak<T> = {
  <K extends keyof T>(key: K, val: T[K]): void;
  (edits: Partial<T>): void;
};

export function useTweaks<T extends Record<string, unknown>>(defaults: T): readonly [T, SetTweak<T>] {
  const [values, setValues] = useState<T>(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = useCallback((keyOrEdits: keyof T | Partial<T>, val?: unknown): void => {
    const edits: Partial<T> = typeof keyOrEdits === "object" && keyOrEdits !== null
      ? keyOrEdits
      : ({ [keyOrEdits as keyof T]: val } as Partial<T>);
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    // Same-window signal so in-page listeners can react — the parent message
    // only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent("tweakchange", { detail: edits }));
  }, []) as SetTweak<T>;
  return [values, setTweak] as const;
}
