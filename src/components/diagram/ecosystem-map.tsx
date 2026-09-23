import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Instrument } from "@/components/site/instrument";

const nodes = [
  {
    id: "abbey",
    name: "Abbey",
    kicker: "Application",
    body: "Companion with a claims ledger. Personas, not products.",
    href: "/abbey",
    className: "map-node-abbey",
    accent: "text-abbey",
    edge: "[--edge:var(--abbey)]",
  },
  {
    id: "abi",
    name: "ABI",
    kicker: "Compute",
    body: "Nightly Rust runtime. Inspectable context. Honest GPU reporting.",
    href: "/abi",
    className: "map-node-abi",
    accent: "text-abi",
    edge: "[--edge:var(--abi)]",
  },
  {
    id: "wdbx",
    name: "WDBX",
    kicker: "Storage",
    body: "Episodic substrate. Provenance, not a lookup.",
    href: "/wdbx",
    className: "map-node-wdbx",
    accent: "text-wdbx",
    edge: "[--edge:var(--wdbx)]",
  },
] as const;

export function EcosystemMap() {
  return (
    <Instrument
      serial="quesar · stack"
      status="three layers"
      caption="Quesar is the product window onto this stack. Status lives on each node’s page, not in the diagram."
      className="ecosystem-map"
    >
      <div className="map-canvas relative min-h-[22rem] p-4 sm:min-h-[24rem] sm:p-6">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <line className="flow-line" x1="28%" y1="28%" x2="50%" y2="48%" stroke="currentColor" strokeWidth="1" />
          <line className="flow-line" x1="50%" y1="58%" x2="72%" y2="78%" stroke="currentColor" strokeWidth="1" />
        </svg>
        {nodes.map((node) => (
          <Link
            key={node.id}
            to={node.href}
            className={cn("surface accent-edge map-node z-[1] p-4 no-underline", node.className, node.edge)}
          >
            <p className={cn("text-xs", node.accent)}>{node.kicker}</p>
            <h3 className="mt-1 font-display text-xl text-fg">{node.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">{node.body}</p>
          </Link>
        ))}
      </div>
    </Instrument>
  );
}
