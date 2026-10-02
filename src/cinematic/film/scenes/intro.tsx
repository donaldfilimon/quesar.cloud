// scenes/intro.tsx — Scene 1 (cold open), Scene 2 (the problem), Scene 3 (runtime stack)
// Ported from scenes_intro.jsx: explicit ES-module imports + TypeScript types,
// visuals/geometry/timings preserved byte-for-byte.

import { C, FONT } from "../tokens";
import { Easing, step } from "../easing";
import { useSprite } from "../timeline-context";
import { DiagramSVG, Wire, PulseRing, SignalDots, SignalPolyline, Elbow } from "../fx";
import { Orb } from "../primitives";
import { SceneTag, FlowNode } from "../chrome";
import { SceneBox } from "./_shared";

// A soft horizontal scan band that sweeps down a region, looping. (HTML overlay.)
function Scanline({
  x,
  y,
  w,
  h,
  lt = 0,
  period = 3.4,
  color = C.blue,
  band = 90,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lt?: number;
  period?: number;
  color?: string;
  band?: number;
}) {
  const p = (((lt / period) % 1) + 1) % 1;
  const top = y - band + p * (h + band);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: top,
        width: w,
        height: band,
        zIndex: 15,
        pointerEvents: "none",
        background: `linear-gradient(180deg, transparent, ${color}22 50%, transparent)`,
        maskImage: `linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)`,
        WebkitMaskImage: `linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)`,
        opacity: 0.7,
      }}
    />
  );
}

// ── Scene 3: WDBX runtime stack ──────────────────────────────────────────────
type LayerStatus = "current" | "partial" | "vision";
interface Layer {
  name: string;
  sub: string;
  st: LayerStatus;
}

const LAYERS: Layer[] = [
  { name: "Storage", sub: "WAL · snapshot · CRC32", st: "partial" },
  { name: "Retrieval", sub: "explicit paths · no automatic recall", st: "vision" },
  { name: "Compute", sub: "CPU primitives · accelerator contracts", st: "partial" },
  { name: "Integrity", sub: "link-only / strict content checks", st: "current" },
  { name: "Fabric", sub: "distributed direction", st: "vision" },
  { name: "Persistence", sub: "completion persistence via MCP", st: "partial" },
];
const ST_COLOR: Record<LayerStatus, string> = {
  current: C.green,
  partial: C.amber,
  vision: C.purple,
};

export function Scene3() {
  const { localTime: lt } = useSprite();
  const head = step(lt, 0.4, 0.9);
  const abiIn = step(lt, 0.9, 0.7, Easing.easeOutBack);
  const w1 = step(lt, 1.7, 0.7);
  const routerIn = step(lt, 2.3, 0.7, Easing.easeOutBack);
  const w2 = step(lt, 3.1, 0.8);
  const panelIn = step(lt, 3.6, 0.9, Easing.easeOutCubic);
  const legend = step(lt, 11.0, 0.8);
  const cap = step(lt, 12.0, 0.8);

  // geometry
  const abi = { x: 200, y: 360, w: 280, h: 78 };
  const router = { x: 200, y: 560, w: 280, h: 84 };
  const panel = { x: 720, y: 188, w: 600, h: 704 };
  const rowH = 78,
    rowGap = 14,
    rowTop = panel.y + 96,
    rowX = panel.x + 28,
    rowW = panel.w - 56;

  return (
    <SceneBox inDur={0.7} outDur={0.7}>
      <SceneTag index="02" label="WDBX runtime" reveal={head} />
      <Orb x={1020} y={540} size={620} color={C.blue} opacity={0.1} />

      <DiagramSVG>
        {/* ABI -> Router */}
        <Wire
          x1={abi.x + abi.w / 2}
          y1={abi.y + abi.h}
          x2={abi.x + abi.w / 2}
          y2={router.y}
          draw={w1}
          color={C.lineHi}
          width={2}
        />
        <SignalDots
          x1={abi.x + abi.w / 2}
          y1={abi.y + abi.h}
          x2={abi.x + abi.w / 2}
          y2={router.y}
          lt={lt}
          count={1}
          speed={0.7}
          color={C.blueHi}
          r={3.5}
          on={w1 > 0.9}
        />
        {/* Router -> Panel */}
        <Elbow
          pts={[
            [router.x + router.w, router.y + router.h / 2],
            [620, router.y + router.h / 2],
            [620, panel.y + panel.h / 2],
            [panel.x, panel.y + panel.h / 2],
          ]}
          draw={w2}
          color={C.blue}
          width={2.5}
        />
        <SignalPolyline
          pts={[
            [router.x + router.w, router.y + router.h / 2],
            [620, router.y + router.h / 2],
            [620, panel.y + panel.h / 2],
            [panel.x, panel.y + panel.h / 2],
          ]}
          lt={lt}
          count={2}
          speed={0.4}
          color={C.cyan}
          r={4.5}
        />
        {/* live pulse on the Security (CURRENT) layer */}
        {lt > 6.4 && (
          <PulseRing
            cx={rowX + rowW - 56}
            cy={rowTop + 3 * (rowH + rowGap) + rowH / 2}
            lt={lt}
            period={2}
            maxR={30}
            minR={6}
            color={C.green}
            width={1.5}
            opacity={0.7}
          />
        )}
      </DiagramSVG>

      {/* ABI node */}
      <FlowNode
        x={abi.x}
        y={abi.y}
        w={abi.w}
        h={abi.h}
        reveal={abiIn}
        title="ABI"
        subtitle="orchestration"
        accent={C.blueHi}
      />
      {/* Router node */}
      <FlowNode
        x={router.x}
        y={router.y}
        w={router.w}
        h={router.h}
        reveal={routerIn}
        title="Persona Router"
        titleSize={23}
        subtitle="keyword-weighted"
        accent={C.cyan}
      />

      {/* Runtime panel */}
      <div
        style={{
          position: "absolute",
          left: panel.x,
          top: panel.y,
          width: panel.w,
          height: panel.h,
          zIndex: 12,
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 24}px)`,
          borderRadius: 22,
          border: `1px solid ${C.lineHi}`,
          background: "linear-gradient(160deg, rgba(20,20,30,0.92), rgba(8,8,14,0.92))",
          backdropFilter: "blur(8px)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ padding: "26px 28px 0", display: "flex", alignItems: "baseline", gap: 14 }}>
          <span
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 30,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            WDBX Runtime
          </span>
          <span
            style={{ fontFamily: FONT.mono, fontSize: 14, color: C.dim2, letterSpacing: "0.16em" }}
          >
            source foundations
          </span>
        </div>
      </div>

      {/* scanline sweep over the runtime panel */}
      {panelIn > 0.5 && (
        <Scanline
          x={panel.x}
          y={panel.y}
          w={panel.w}
          h={panel.h}
          lt={lt}
          period={4.2}
          color={C.blue}
          band={120}
        />
      )}

      {/* layer rows */}
      {LAYERS.map((L, i) => {
        const rv = step(lt, 4.3 + i * 0.55, 0.6, Easing.easeOutCubic);
        const dot = step(lt, 4.7 + i * 0.55, 0.5, Easing.easeOutBack);
        const c = ST_COLOR[L.st];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: rowX,
              top: rowTop + i * (rowH + rowGap),
              width: rowW,
              height: rowH,
              zIndex: 14,
              opacity: rv,
              transform: `translateX(${(1 - rv) * 22}px)`,
              borderRadius: 14,
              border: `1px solid ${C.line}`,
              background: "rgba(255,255,255,0.025)",
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              gap: 16,
            }}
          >
            <span style={{ fontFamily: FONT.mono, fontSize: 13, color: C.dim2, width: 26 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 24, color: C.text }}
              >
                {L.name}
              </div>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 14,
                  color: C.dim,
                  letterSpacing: "0.04em",
                  marginTop: 2,
                }}
              >
                {L.sub}
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: dot,
                padding: "5px 11px",
                borderRadius: 999,
                border: `1px solid ${c}55`,
                background: `${c}14`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: c,
                  boxShadow: `0 0 8px ${c}`,
                }}
              />
              <span
                style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: "0.12em", color: c }}
              >
                {L.st === "vision" ? "VISION" : "SOURCE"}
              </span>
            </span>
          </div>
        );
      })}

      {/* legend / caption */}
      <div
        style={{
          position: "absolute",
          left: 1390,
          top: 360,
          zIndex: 20,
          opacity: legend,
          transform: `translateX(${(1 - legend) * 16}px)`,
          width: 360,
        }}
      >
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 14,
            letterSpacing: "0.2em",
            color: C.dim2,
            marginBottom: 18,
          }}
        >
          CLAIMS DISCIPLINE
        </div>
        {(
          [
            ["current", "Source inspection only"],
            ["partial", "Runtime acceptance separate"],
          ] as [LayerStatus, string][]
        ).map(([k, d]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: ST_COLOR[k],
                boxShadow: `0 0 8px ${ST_COLOR[k]}`,
              }}
            />
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 14,
                color: ST_COLOR[k],
                width: 88,
                letterSpacing: "0.08em",
              }}
            >
              {k === "current" ? "SOURCE" : "SCOPED"}
            </span>
            <span style={{ fontFamily: FONT.sans, fontSize: 15, color: C.dim }}>{d}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1390,
          bottom: 230,
          zIndex: 20,
          opacity: cap,
          width: 380,
          transform: `translateY(${(1 - cap) * 12}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 38,
            color: C.text,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          Inspect the source.
          <br />
          Six scoped foundations.
        </div>
      </div>
    </SceneBox>
  );
}
