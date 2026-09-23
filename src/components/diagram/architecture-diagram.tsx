import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { architectureNodes, layerCopy, type ArchNode } from "@/lib/content";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/site/status-badge";
import { Instrument } from "@/components/site/instrument";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Hint } from "@/components/ui/tooltip";

const DESKTOP_ORDER = [
  ["user"],
  ["quesar"],
  ["abi", "tools"],
  ["router", "context"],
  ["wdbx"],
  ["memory", "embed", "provenance"],
  ["compute"],
  ["output"],
];

function accentFor(id: string): "abi" | "wdbx" | "abbey" | "accent" {
  if (id === "abi" || id === "tools" || id === "router" || id === "context") return "abi";
  if (id === "wdbx" || id === "memory" || id === "embed" || id === "provenance") return "wdbx";
  if (id === "user" || id === "output") return "abbey";
  return "accent";
}

const borderByAccent = {
  abi: "border-l-abi",
  wdbx: "border-l-wdbx",
  abbey: "border-l-abbey",
  accent: "border-l-accent",
} as const;

const ringByAccent = {
  abi: "ring-abi/50",
  wdbx: "ring-wdbx/50",
  abbey: "ring-abbey/50",
  accent: "ring-accent/50",
} as const;

function nodeById(id: string): ArchNode {
  const found = architectureNodes.find((n) => n.id === id);
  if (!found) throw new Error(`Unknown architecture node: ${id}`);
  return found;
}

export function ArchitectureDiagram({
  compact = false,
  selectedId,
  onSelect,
}: {
  compact?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [internal, setInternal] = useState(selectedId ?? "quesar");
  const labelId = useId();
  const selected = selectedId ?? internal;
  const node = useMemo(() => nodeById(selected), [selected]);

  // Remember the last controlled selection so the diagram keeps it if the
  // parent stops controlling (adjusted during render, not in an effect).
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (selectedId) setInternal(selectedId);
  }

  const select = useCallback(
    (id: string) => {
      setInternal(id);
      onSelect?.(id);
    },
    [onSelect],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const target = event.target as HTMLElement | null;
      if (!target?.dataset.nodeId) return;
      const ids = architectureNodes.map((n) => n.id);
      const index = ids.indexOf(target.dataset.nodeId);
      if (index < 0) return;
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? ids[(index + 1) % ids.length]
          : ids[(index - 1 + ids.length) % ids.length];
      select(next);
      document.getElementById(`arch-node-${next}`)?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Instrument serial="quesar · architecture" status="select a node">
        <div
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={`arch-node-${selected}`}
          className="p-3 sm:p-4"
        >
          <p id={labelId} className="sr-only">
            Architecture. Use arrow keys to move between components. Enter selects. The inspector
            lists what is current in source versus what is not claimed.
          </p>
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 px-1">
            {(Object.keys(layerCopy) as Array<keyof typeof layerCopy>).map((layer) => (
              <span key={layer} className="text-xs text-fg-subtle">
                {layerCopy[layer]}
              </span>
            ))}
          </div>

          <div className="hidden flex-col items-stretch gap-0 md:flex">
            {DESKTOP_ORDER.map((row, rowIndex) => (
              <div key={row.join("-")}>
                <div
                  className={cn(
                    "grid gap-2",
                    row.length === 1 && "grid-cols-1 place-items-center",
                    row.length === 2 && "grid-cols-2",
                    row.length === 3 && "grid-cols-3",
                  )}
                >
                  {row.map((id) => (
                    <NodeButton
                      key={id}
                      node={nodeById(id)}
                      selected={selected === id}
                      onSelect={select}
                    />
                  ))}
                </div>
                {rowIndex < DESKTOP_ORDER.length - 1 ? <FlowRail /> : null}
              </div>
            ))}
          </div>

          <ol className="flex flex-col gap-2 md:hidden">
            {architectureNodes.map((item, index) => (
              <li key={item.id}>
                <NodeButton node={item} selected={selected === item.id} onSelect={select} stacked />
                {index < architectureNodes.length - 1 ? (
                  <div className="mx-auto h-3 w-px bg-border" aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Instrument>

      <aside
        className="rounded-[28px] bg-bg-elevated p-6 shadow-[var(--shadow-border)] sm:p-7"
        aria-live="polite"
      >
        <p className="text-xs text-fg-subtle">{layerCopy[node.layer]}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h3 className="font-display text-2xl tracking-tight">{node.name}</h3>
          <StatusBadge status={node.status} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          {compact ? node.summary : node.detail}
        </p>
        <CapabilityList title="Current in source" items={node.implemented} positive />
        <Separator className="my-5" />
        <CapabilityList title="Not claimed" items={node.notClaimed} className="mt-0" />
        <p className="mt-5 text-xs text-fg-subtle">Arrow keys move between nodes</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to="/console" search={{ node: node.id }}>
              Save a field note
            </Link>
          </Button>
          {compact ? (
            <Button asChild variant="secondary">
              <Link to="/architecture" search={{ node: node.id }}>
                Open full architecture
              </Link>
            </Button>
          ) : null}
          {node.href ? (
            <Button asChild variant="ghost">
              <Link to={node.href}>Read the {node.name} page</Link>
            </Button>
          ) : null}
          <Hint label="Copy a shareable URL for this node">
            <button
              type="button"
              className="inline-flex h-11 items-center px-3 text-sm font-medium text-fg-muted hover:text-fg"
              onClick={() => {
                const url = `${window.location.origin}/architecture?node=${node.id}`;
                void navigator.clipboard.writeText(url).then(
                  () => toast.success("Node link copied."),
                  () => toast.error("Could not copy the node link."),
                );
              }}
            >
              Copy node link
            </button>
          </Hint>
        </div>
      </aside>
    </div>
  );
}

function FlowRail() {
  return (
    <div className="flex h-7 items-center justify-center" aria-hidden="true">
      <svg width="12" height="28" viewBox="0 0 12 28" className="text-accent">
        <line
          className="flow-line"
          x1="6"
          y1="0"
          x2="6"
          y2="28"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

function NodeButton({
  node,
  selected,
  onSelect,
  stacked,
}: {
  node: ArchNode;
  selected: boolean;
  onSelect: (id: string) => void;
  stacked?: boolean;
}) {
  const accent = accentFor(node.id);
  return (
    <button
      type="button"
      id={`arch-node-${node.id}${stacked ? "-m" : ""}`}
      role="option"
      aria-selected={selected}
      data-node-id={node.id}
      onClick={() => onSelect(node.id)}
      onFocus={() => onSelect(node.id)}
      className={cn(
        "w-full rounded-[12px] border-l-4 px-3 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150",
        stacked ? "bg-bg" : "max-w-md bg-bg",
        borderByAccent[accent],
        selected
          ? cn("bg-bg-subtle shadow-[var(--shadow-border-hover)] ring-1", ringByAccent[accent])
          : "hover:shadow-[var(--shadow-border-hover)]",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{node.name}</span>
        <StatusBadge status={node.status} />
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{node.summary}</span>
    </button>
  );
}

function CapabilityList({
  title,
  items,
  positive,
  className,
}: {
  title: string;
  items: string[];
  positive?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mt-5", className)}>
      <p className="text-xs text-fg-subtle">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-fg-muted">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                positive ? "bg-status-current" : "bg-border-strong",
              )}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
