import { createRandom } from "@/lib/trailer-engine/random";

export const CAPTURE_FPS = 30;
export const CAPTURE_SEED = 20261002;

export function trustedCapture(enabled: boolean, href: string): boolean {
  const url = new URL(href);
  return (
    enabled &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    ["http:", "https:"].includes(url.protocol) &&
    url.searchParams.get("capture") === "1"
  );
}

export function isCapture(): boolean {
  return (
    typeof window !== "undefined" &&
    import.meta.env.VITE_FILM_CAPTURE === "1" &&
    trustedCapture(true, window.location.href)
  );
}

export function frameTime(frame: number, duration: number): number {
  if (!Number.isInteger(frame) || frame < 0 || frame >= Math.ceil(duration * CAPTURE_FPS))
    throw new Error(`Frame ${frame} outside the ${duration}s film`);
  return frame / CAPTURE_FPS;
}

/** A fresh generator per mounted renderer. Explore keeps its original randomness. */
export function sceneRandom(scope: string): () => number {
  if (!isCapture()) return Math.random;
  let seed = CAPTURE_SEED;
  for (const char of scope) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return createRandom(seed);
}

/** The director places this on every board before its effects attach. */
export function captureLocalTime(el: Element): number | null {
  if (!isCapture()) return null;
  const board = el.closest<HTMLElement>("[data-shot-time]");
  if (!board) throw new Error("Capture renderer has no shot clock");
  return Number(board.dataset.shotTime);
}

/** Some UI kits own an inner main scroller; scroll that instead of their shell. */
export function applyDirectedScroll(board: HTMLElement): void {
  const target = board.querySelector<HTMLElement>("[data-design-scroll]") ?? board;
  target.scrollTop =
    Math.max(0, target.scrollHeight - target.clientHeight) * Number(board.dataset.shotScroll);
}

export interface FilmCaptureAPI {
  readonly fps: 30;
  readonly duration: number;
  readonly seed: number;
  renderFrame(frame: number): Promise<{ frame: number; time: number; board: string | null }>;
}

declare global {
  interface Window {
    __filmCapture?: FilmCaptureAPI;
  }
}

// Local @fontsource families declared by src/styles.css. System fallback is
// intentional for symbols outside their unicode ranges, never for a failed face.
const LOCAL_CAPTURE_FAMILIES = new Set([
  "IBM Plex Sans Variable",
  "Space Grotesk Variable",
  "IBM Plex Mono",
]);
export interface CaptureFont {
  family: string;
  font: string;
  text: string;
}

/** Only direct rendered text/controls: a parent's textContent would incorrectly
 * require its font for descendants that override the family. Current cinematic
 * canvases contain geometry, and its CSS pseudo-elements contain no text. */
export function requiredCaptureFonts(root: HTMLElement): CaptureFont[] {
  const groups = new Map<string, CaptureFont>();
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (!element.getClientRects().length) continue;
    let text = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent ?? "")
      .join("");
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
      text += element.value || element.placeholder;
    if (!text.trim()) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.visibility === "collapse") continue;
    const family = style.fontFamily
      .split(",")[0]
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!LOCAL_CAPTURE_FAMILIES.has(family)) continue;
    const font = `${style.fontStyle} ${style.fontWeight} 16px "${family}"`;
    const previous = groups.get(font)?.text ?? "";
    groups.set(font, { family, font, text: [...new Set(previous + text)].join("") });
  }
  return [...groups.values()];
}

function coversText(face: FontFace, text: string): boolean {
  return face.unicodeRange.split(",").some((range) => {
    const match = /^U\+([\dA-F?]+)(?:-([\dA-F]+))?$/i.exec(range.trim());
    if (!match) throw new Error(`Unsupported font unicode range: ${range}`);
    const start = parseInt(match[1].replace(/\?/g, "0"), 16);
    const end = parseInt(match[2] ?? match[1].replace(/\?/g, "F"), 16);
    return [...text].some((character) => {
      const point = character.codePointAt(0)!;
      return point >= start && point <= end;
    });
  });
}

/** FontFaceSet.ready also resolves on failure. load selects the actual style,
 * weight and used Unicode subsets; checking every declared face would falsely
 * reject unused styles/subsets. No network or font registry is replaced here. */
export async function loadCaptureFont(required: CaptureFont, fonts: FontFaceSet): Promise<void> {
  const declared = [...fonts].filter(
    (face) => face.family.replace(/^["']|["']$/g, "") === required.family,
  );
  if (!declared.length)
    throw new Error(`Required capture font is not declared: ${required.family}`);
  let loaded: FontFace[];
  try {
    loaded = await fonts.load(required.font, required.text);
  } catch {
    throw new Error(`Required capture font failed: ${required.font}`);
  }
  const covered = declared.some((face) => coversText(face, required.text));
  if (
    (covered && !loaded.length) ||
    loaded.some((face) => face.status !== "loaded") ||
    !fonts.check(required.font, required.text)
  )
    throw new Error(`Required capture font unavailable: ${required.font}`);
}

export const CAPTURE_READY_TIMEOUT_MS = 30000;

/** One deadline covers every asynchronous readiness phase. External font/image
 * promises cannot be cancelled, but their late completion cannot continue work
 * or approve a frame after timeout/Stage teardown. Owned timers and RAFs are
 * always cancelled before this operation settles. */
export async function settleCapture(
  root: HTMLElement,
  time: number,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  let phase = "initial paint";
  const deadline = performance.now() + CAPTURE_READY_TIMEOUT_MS;
  const timeoutError = () =>
    new Error(`Capture readiness timed out during ${phase} after ${CAPTURE_READY_TIMEOUT_MS}ms`);
  const frames = new Set<number>();
  let rejectCancelled!: (reason: Error) => void;
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectCancelled = reject;
  });
  const assertLive = () => {
    signal.throwIfAborted();
    if (!root.isConnected) throw new Error(`Capture Stage was unmounted during ${phase}`);
    if (performance.now() >= deadline) throw timeoutError();
  };
  const abort = () => rejectCancelled(new Error(`Capture Stage was unmounted during ${phase}`));
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => rejectCancelled(timeoutError()), CAPTURE_READY_TIMEOUT_MS);
  const wait = async <T>(promise: PromiseLike<T>, nextPhase: string): Promise<T> => {
    phase = nextPhase;
    assertLive();
    const value = await Promise.race([promise, cancelled]);
    assertLive();
    return value;
  };
  const paint = (nextPhase: string) =>
    wait(
      new Promise<void>((resolve) => {
        const id = requestAnimationFrame(() => {
          frames.delete(id);
          resolve();
        });
        frames.add(id);
      }),
      nextPhase,
    );
  try {
    do {
      await paint("lazy board readiness");
    } while (root.querySelector("[data-capture-pending]"));
    await wait(document.fonts.ready, "fonts");
    for (const font of requiredCaptureFonts(root))
      await wait(loadCaptureFont(font, document.fonts), `required font ${font.font}`);
    for (const img of root.querySelectorAll("img")) {
      if (!img.complete) await wait(img.decode(), `image ${img.currentSrc || img.src}`);
      if (!img.naturalWidth) throw new Error(`Capture image failed: ${img.currentSrc}`);
    }
    assertLive();
    for (const board of root.querySelectorAll<HTMLElement>("[data-shot-scroll]"))
      applyDirectedScroll(board);
    await paint("directed scroll commit");
    await paint("directed scroll paint");
    // CSS animation time is independent of page load, mounts and seek order.
    // Scroll-driven animations retain the director's exact scroll timeline.
    const local = root.querySelector<HTMLElement>("[data-shot-time]");
    const milliseconds = (local ? Number(local.dataset.shotTime) : time) * 1000;
    for (const animation of root.getAnimations({ subtree: true })) {
      if (animation.timeline && animation.timeline !== document.timeline) continue;
      animation.pause();
      await wait(animation.ready, "CSS animation readiness");
      animation.currentTime = milliseconds;
    }
    await paint("final paint");
    assertLive();
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
    for (const id of frames) cancelAnimationFrame(id);
    frames.clear();
  }
}
