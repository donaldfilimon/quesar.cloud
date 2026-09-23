import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const layers = [
  {
    id: "abbey",
    name: "Abbey",
    kicker: "Application",
    href: "/abbey",
    body: "Human-facing companion. Personas, claims ledger, local workspace.",
    edge: "[--edge:var(--abbey)]",
    glow: "shadow-[var(--shadow-border-hover)]",
  },
  {
    id: "abi",
    name: "ABI",
    kicker: "Compute",
    href: "/abi",
    body: "Reasoning, routing, orchestration. Inspectable context.",
    edge: "[--edge:var(--abi)]",
    glow: "shadow-[var(--shadow-border-hover)]",
  },
  {
    id: "wdbx",
    name: "WDBX",
    kicker: "Storage",
    href: "/wdbx",
    body: "Episodic substrate. Provenance, not a lookup table.",
    edge: "[--edge:var(--wdbx)]",
    glow: "shadow-[var(--shadow-border-hover)]",
  },
] as const;

export function ChipCutaway() {
  const [active, setActive] = useState<(typeof layers)[number]["id"]>("abi");
  const selected = layers.find((layer) => layer.id === active) ?? layers[1];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
      <RadioGroup
        value={active}
        onValueChange={(value) => setActive(value as (typeof layers)[number]["id"])}
        className="chip-stack relative mx-auto grid w-full max-w-lg gap-0"
        aria-label="Stack layers"
      >
        <span className="absolute top-3 bottom-3 left-3 w-px bg-accent/40" aria-hidden="true" />
        {layers.map((layer, index) => {
          const isActive = active === layer.id;
          return (
            <RadioGroupItem
              key={layer.id}
              value={layer.id}
              onMouseEnter={() => setActive(layer.id)}
              className={cn(
                "chip-slab accent-edge relative block h-auto w-full rounded-[18px] px-6 py-5 text-left",
                layer.edge,
                isActive ? layer.glow : "shadow-[var(--shadow-border)]",
                isActive ? "bg-bg-elevated" : "bg-bg-elevated/80",
              )}
              style={{ marginTop: index === 0 ? 0 : -8, zIndex: layers.length - index }}
            >
              <span className="absolute top-1/2 left-[-0.55rem] size-2 -translate-y-1/2 rounded-full bg-accent" aria-hidden="true" />
              <span className="text-xs text-fg-subtle">
                {String(index + 1).padStart(2, "0")} · {layer.kicker}
              </span>
              <span className="mt-1 block font-display text-2xl tracking-tight text-fg">{layer.name}</span>
            </RadioGroupItem>
          );
        })}
      </RadioGroup>
      <div>
        <p className="text-xs text-accent">{selected.kicker}</p>
        <h3 className="mt-2 font-display text-3xl tracking-tight">{selected.name}</h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">{selected.body}</p>
        <Link
          to={selected.href}
          className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent no-underline hover:underline"
        >
          Open {selected.name}
        </Link>
      </div>
    </div>
  );
}
