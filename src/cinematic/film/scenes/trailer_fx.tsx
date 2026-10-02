// trailer_fx.tsx — high-energy trailer motion primitives.
// Ported from trailer_fx.jsx: explicit ES-module imports + TypeScript types,
// no window globals for module wiring. Visuals/geometry/timings unchanged.
// Camera (handheld drift + shake + zoom punch), FlashCut, SlamText, Stamp,
// SpeedLines, Shockwave, Beat. Camera/FlashCut read window.__tw (Tweaks panel).

import { type ReactNode } from "react";
import { C, FONT, clamp } from "../tokens";
import { Easing } from "../easing";
import { useTime, useSprite } from "../timeline-context";
import { DiagramSVG } from "../fx";
import { impactK } from "./impacts";

// Kinetic title that slams in (overshoot), holds, snaps out — with chromatic split.
export function SlamText({
  text,
  size = 200,
  color = "#fafafa",
  weight = 800,
  font = FONT.display,
  x = 960,
  y = 540,
  align = "center",
  chroma = true,
  letterSpacing = "-0.03em",
  inT = 0.28,
  outT = 0.16,
}: {
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  font?: string;
  x?: number;
  y?: number;
  align?: "left" | "center" | "right";
  chroma?: boolean;
  letterSpacing?: string;
  inT?: number;
  outT?: number;
}) {
  const { localTime, duration } = useSprite();
  const t = useTime();
  let scale = 1,
    op = 1,
    blur = 0;
  if (localTime < inT) {
    const lin = clamp(localTime / inT, 0, 1),
      k = Easing.easeOutBack(lin);
    scale = 1.45 - 0.45 * k;
    op = lin;
    blur = (1 - lin) * 6;
  } else if (localTime > duration - outT) {
    const k = clamp((localTime - (duration - outT)) / outT, 0, 1);
    op = 1 - k;
    scale = 1 + 0.12 * k;
    blur = k * 4;
  }
  const o = chroma ? 2 + 6 * impactK(t, 0.34) : 0;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 30,
        transform: `translate(${tx}, -50%) scale(${scale})`,
        opacity: op,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        color,
        letterSpacing,
        whiteSpace: "pre",
        lineHeight: 0.98,
        filter: blur ? `blur(${blur}px)` : "none",
        textShadow: chroma
          ? `${o}px 0 rgba(248,80,80,0.65), ${-o}px 0 rgba(56,220,255,0.65)`
          : "none",
        willChange: "transform, opacity",
      }}
    >
      {text}
    </div>
  );
}

// Stamped word (rotated, impact scale-in + residual jitter). E.g. "TAMPER-PROOF".
export function Stamp({
  text,
  color = C.green,
  x = 960,
  y = 540,
  rotate = -9,
  size = 86,
}: {
  text: string;
  color?: string;
  x?: number;
  y?: number;
  rotate?: number;
  size?: number;
}) {
  const { localTime, duration } = useSprite();
  const inT = 0.3;
  let scale = 1,
    op = 1;
  if (localTime < inT) {
    const k = Easing.easeOutBack(clamp(localTime / inT, 0, 1));
    scale = 1.7 - 0.7 * k;
    op = clamp(localTime / inT, 0, 1);
  } else if (localTime > duration - 0.25) {
    const k = (localTime - (duration - 0.25)) / 0.25;
    op = 1 - k;
  }
  const jit =
    localTime > inT ? Math.sin(localTime * 44) * 1.6 * Math.max(0, 1 - (localTime - inT) * 2.5) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 34,
        transform: `translate(-50%,-50%) rotate(${rotate + jit}deg) scale(${scale})`,
        opacity: op,
        padding: "14px 34px",
        border: `4px solid ${color}`,
        borderRadius: 10,
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: size,
        color,
        letterSpacing: "0.04em",
        background: `${color}1a`,
        boxShadow: `0 0 40px ${color}66, inset 0 0 30px ${color}22`,
        textShadow: `0 0 24px ${color}`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

// Radial speed lines emanating from a center. intensity 0..1.
export function SpeedLines({
  lt = 0,
  intensity = 1,
  color = C.blue,
  count = 44,
  cx = 960,
  cy = 540,
}: {
  lt?: number;
  intensity?: number;
  color?: string;
  count?: number;
  cx?: number;
  cy?: number;
}) {
  if (intensity <= 0.01) return null;
  const lines: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (i % 2 ? 0.04 : 0);
    const phase = (((lt * 1.25 + i * 0.137) % 1) + 1) % 1;
    const r0 = 220 + phase * 1000,
      r1 = r0 + 110 + phase * 200;
    const ca = Math.cos(a),
      sa = Math.sin(a);
    lines.push(
      <line
        key={i}
        x1={cx + ca * r0}
        y1={cy + sa * r0}
        x2={cx + ca * r1}
        y2={cy + sa * r1}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={(1 - phase) * 0.5 * intensity}
      />,
    );
  }
  return <DiagramSVG>{lines}</DiagramSVG>;
}

// Expanding shockwave ring(s) from a center over the sprite lifetime.
export function Shockwave({
  cx = 960,
  cy = 540,
  color = C.cyan,
  maxR = 1200,
  rings = 2,
  width = 6,
}: {
  cx?: number;
  cy?: number;
  color?: string;
  maxR?: number;
  rings?: number;
  width?: number;
}) {
  const { progress } = useSprite();
  const out: ReactNode[] = [];
  for (let i = 0; i < rings; i++) {
    const p = clamp(progress - i * 0.12, 0, 1);
    if (p <= 0) continue;
    const e = Easing.easeOutCubic(p);
    out.push(
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={e * maxR}
        fill="none"
        stroke={color}
        strokeWidth={width * (1 - p)}
        opacity={(1 - p) * 0.8}
        style={{ filter: `drop-shadow(0 0 14px ${color})` }}
      />,
    );
  }
  return <DiagramSVG>{out}</DiagramSVG>;
}

// Trailer scene wrapper: hard-cut friendly (instant on, quick fade only at the very edges).
export function Beat({ children, hold = false }: { children: ReactNode; hold?: boolean }) {
  const { localTime, duration } = useSprite();
  const op = Math.min(
    clamp(localTime / 0.12, 0, 1),
    hold ? 1 : clamp((duration - localTime) / 0.12, 0, 1),
  );
  return <div style={{ position: "absolute", inset: 0, opacity: op }}>{children}</div>;
}
