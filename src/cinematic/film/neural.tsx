// neural.tsx — React shell over @mlai/trailer-engine's NeuralScene.
// The 3D neural-network backdrop (layered MLP in rotating perspective, radial
// "fabric" warp, title bloom) is drawn by the package; this file owns the MLAI
// colour presets, the time→mode mapping, the canvas element and its lifetime.
// Reads window.__tw.neural for intensity. Exports: NeuralCanvas, NeuralLayer
// (presets and neuralModeForTime live in neural-mode.ts).

import { useRef, useEffect, type CSSProperties } from "react";
import { Canvas2DRenderer, NeuralScene, type NeuralModePreset } from "@/lib/trailer-engine";
import { C } from "./tokens";
import { useTime, useTimeline } from "./timeline-context";
import { backingRatio } from "./engine-utils";
import { NL_MODES, neuralModeForTime } from "./neural-mode";

// `C` is part of the canonical token surface for film modules; referenced to keep the
// import intentional even though the scene paints its deep-black base with literal stops.
void C;

const readIntensity = (): number => {
  const tw = (window as unknown as { __tw?: { neural?: number } }).__tw || {};
  return tw.neural != null ? tw.neural : 1;
};

function NeuralCanvas({ t, mode, opacity = 1 }: { t: number; mode: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stage = useRef<{ renderer: Canvas2DRenderer; scene: NeuralScene } | null>(null);
  // Fixed logical frame; Stage scales it with a CSS transform, and the backing
  // store follows the pixels actually shown (backingRatio).
  const W = 1920,
    H = 1080;
  const { scale } = useTimeline();
  const ratio = backingRatio(typeof window === "undefined" ? 1 : window.devicePixelRatio, scale);
  // The ratio the canvas is currently sized to; 0 until the first redraw.
  const sizedTo = useRef(0);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const renderer = new Canvas2DRenderer(c);
    renderer.resize(W, H, 1);
    const scene = new NeuralScene({ initial: NL_MODES.chaos, intensity: readIntensity });
    renderer.setScene(scene);
    stage.current = { renderer, scene };
    sizedTo.current = 0;
    return () => {
      // Null the ref before disposing so a StrictMode re-run never draws
      // through a disposed renderer.
      stage.current = null;
      renderer.dispose();
    };
  }, []);

  // Resizing clears the canvas, so it happens here, right before a redraw.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    if (sizedTo.current !== ratio) {
      s.renderer.resize(W, H, ratio);
      sizedTo.current = ratio;
    }
    s.scene.setMode((NL_MODES as Record<string, NeuralModePreset>)[mode] ?? NL_MODES.build);
    s.renderer.render(t);
  }, [t, mode, ratio]);

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity,
    pointerEvents: "none",
  };
  return <canvas ref={ref} style={style} aria-hidden="true" />;
}

export function NeuralLayer({ opacity = 1, mode }: { opacity?: number; mode?: string }) {
  const t = useTime();
  return <NeuralCanvas t={t} mode={mode || neuralModeForTime(t)} opacity={opacity} />;
}
