/**
 * WCAG 2.x contrast helpers for the theme tokens in `src/styles.css`.
 * Pure functions, no dependencies: parse a CSS color (hex or `oklch()`),
 * convert it to sRGB, then to relative luminance and a contrast ratio.
 */

/** sRGB channels in 0..1 (gamma-encoded). */
export type Rgb = readonly [number, number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function parseHex(input: string): Rgb {
  const hex = input.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    throw new Error(`Unsupported hex color: ${input}`);
  }
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return [channel(0), channel(2), channel(4)];
}

/** OKLCH (L in 0..1, C, H in degrees) to gamma-encoded sRGB, clipped to gamut. */
export function oklchToRgb(l: number, c: number, h: number): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (v: number) => {
    const x = clamp01(v);
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  return [
    encode(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc),
    encode(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc),
    encode(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc),
  ];
}

export function parseOklch(input: string): Rgb {
  const match = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/[^)]*)?\)$/i.exec(
    input.trim(),
  );
  if (!match) throw new Error(`Unsupported oklch color: ${input}`);
  const l = Number(match[1]) / (match[2] ? 100 : 1);
  return oklchToRgb(l, Number(match[3]), Number(match[4]));
}

export function parseColor(input: string): Rgb {
  const value = input.trim();
  if (value.startsWith("#")) return parseHex(value);
  if (/^oklch\(/i.test(value)) return parseOklch(value);
  throw new Error(`Unsupported color: ${input}`);
}

/** WCAG 2.x relative luminance of a gamma-encoded sRGB color. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two CSS colors, 1..21. */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(parseColor(fg));
  const b = relativeLuminance(parseColor(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Collect the custom properties declared in the CSS block whose selector list
 * is exactly `selector` (whitespace-insensitive), resolving `var(--x)`
 * references to other properties of the same block.
 */
export function readThemeTokens(css: string, selector: string): Record<string, string> {
  const want = selector.replace(/\s+/g, "");
  const raw: Record<string, string> = {};
  let found = false;
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "") !== want) continue;
    found = true;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      raw[name] = value.trim();
    }
    break;
  }
  if (!found) throw new Error(`No block for selector ${selector}`);
  const resolve = (value: string, depth = 0): string => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    const target = ref ? raw[ref[1]] : undefined;
    return target === undefined || depth > 10 ? value : resolve(target, depth + 1);
  };
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, resolve(v)]));
}
