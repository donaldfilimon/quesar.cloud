import { describe, expect, it } from "vitest";
import { advance } from "@/lib/trailer-engine";
import { backingRatio, prefersReducedMotion, resolveSeek } from "./engine-utils";

describe("Stage helpers", () => {
  it("reads reduced motion from matchMedia, and answers false without it", () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(
      prefersReducedMotion(() => {
        throw new Error("no media queries");
      }),
    ).toBe(false);
  });

  it("sizes a canvas to the pixels shown, in quarter steps, between 0.5 and 2", () => {
    expect(backingRatio(3, 0.2)).toBe(0.75); // a phone: 1920 * 0.2 CSS px at 3x
    expect(backingRatio(2, 1)).toBe(2); // a Retina desktop at full size
    expect(backingRatio(3, 1)).toBe(2); // never above the designed 2x
    expect(backingRatio(1, 0.1)).toBe(0.5); // never below half
    expect(backingRatio(0, 0)).toBe(1); // unknown inputs read as 1x at full size
  });

  it("pauses a seek onto the end instead of wrapping to the start", () => {
    expect(resolveSeek(12, 10)).toEqual({ time: 10, atEnd: true });
    expect(resolveSeek(-1, 10)).toEqual({ time: 0, atEnd: false });
    expect(resolveSeek(0, 0)).toEqual({ time: 0, atEnd: false });
  });

  it("advances the clock and reports the end of a non-looping film", () => {
    expect(advance(9.5, 1, 10, false)).toMatchObject({ time: 10, ended: true });
    expect(advance(1, 0.5, 10, false)).toMatchObject({ time: 1.5, ended: false });
  });
});
