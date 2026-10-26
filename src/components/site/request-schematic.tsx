import { cn } from "@/lib/utils";

type Node = {
  x: number;
  y: number;
  w: number;
  h: number;
  index: string;
  title: string;
  sub: string;
};

const context: Node = {
  x: 16,
  y: 40,
  w: 196,
  h: 72,
  index: "01",
  title: "Your context",
  sub: "sources and history",
};
const routing: Node = {
  x: 16,
  y: 196,
  w: 196,
  h: 72,
  index: "02",
  title: "ABI routing",
  sub: "intent, risk, style",
};
const personas: Node[] = [
  { x: 300, y: 112, w: 204, h: 60, index: "03", title: "Abbey", sub: "companion" },
  { x: 300, y: 202, w: 204, h: 60, index: "03", title: "Aviva", sub: "direct expert" },
  { x: 300, y: 292, w: 204, h: 60, index: "03", title: "Controlled blend", sub: "selected by ABI" },
];
const store = { x: 16, y: 392, w: 488, h: 56 };

function Box({ node, selected = false }: { node: Node; selected?: boolean }) {
  return (
    <g className={cn("bp-node", selected && "bp-node-selected")}>
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="3" />
      <text x={node.x + 14} y={node.y + 26} className="bp-node-index">
        {node.index}
      </text>
      <text x={node.x + 44} y={node.y + 27} className="bp-node-title">
        {node.title}
      </text>
      <text x={node.x + 44} y={node.y + node.h - 16} className="bp-node-sub">
        {node.sub}
      </text>
    </g>
  );
}

/**
 * The home hero's drawing: the conceptual request flow from the ecosystem
 * figure (context, ABI routing, a selected persona, WDBX underneath), drawn as
 * a blueprint. Trace lines draw in once (`.bp-trace`, off under reduced
 * motion). Conceptual only: it does not show separate models or services.
 */
export function RequestSchematic({ className }: { className?: string }) {
  const routeOut = routing.x + routing.w;
  const routeMid = routing.y + routing.h / 2;
  return (
    <svg
      viewBox="0 0 520 470"
      className={cn("bp-schematic", className)}
      role="img"
      aria-labelledby="schematic-title"
    >
      <title id="schematic-title">
        Conceptual request flow: your context goes to ABI routing, which selects a persona; WDBX
        holds context and storage underneath.
      </title>
      <text x="504" y="20" textAnchor="end" className="bp-fig">
        fig. 01 · conceptual
      </text>
      <path
        d={`M${context.x + 98} ${context.y + context.h} V${routing.y}`}
        pathLength={1}
        className="bp-trace"
        style={{ animationDelay: "120ms" }}
      />
      {personas.map((p, i) => (
        <path
          key={p.title}
          d={`M${routeOut} ${routeMid} H${routeOut + 44} V${p.y + p.h / 2} H${p.x}`}
          pathLength={1}
          className={cn("bp-trace", i > 0 && "bp-trace-quiet")}
          style={{ animationDelay: `${420 + i * 140}ms` }}
        />
      ))}
      {[context.x + 150, routing.x + 150, 402].map((x, i) => (
        <path
          // Context and routing share an x, so the position cannot be the key.
          key={i}
          d={`M${x} ${i === 0 ? context.y + context.h : i === 1 ? routing.y + routing.h : 352} V${store.y}`}
          className="bp-link"
        />
      ))}
      <Box node={context} />
      <Box node={routing} />
      {personas.map((p, i) => (
        <Box key={p.title} node={p} selected={i === 0} />
      ))}
      <g className="bp-node bp-node-store">
        <rect x={store.x} y={store.y} width={store.w} height={store.h} rx="3" />
        <text x={store.x + 14} y={store.y + 34} className="bp-node-title">
          WDBX
        </text>
        <text x={store.x + 84} y={store.y + 34} className="bp-node-sub">
          context and storage · writes report their result
        </text>
      </g>
      <circle cx={routeOut} cy={routeMid} r="4" className="bp-joint" />
      <circle cx={context.x + 98} cy={context.y + context.h} r="4" className="bp-joint" />
    </svg>
  );
}
