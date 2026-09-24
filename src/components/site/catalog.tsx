import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppLink } from "./app-link";
import { NextUp } from "./lab";
import { Surface } from "./section";
import { StatusBadge } from "./status-badge";
import { ProvTag, type Provenance } from "./prov-tag";
import { integrityRules, type StatusKind } from "@/lib/content";
import { personas } from "@/lib/mlai/categories/personas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CopyItem = {
  title: string;
  body: string;
  status?: StatusKind;
  kicker?: string;
  href?: string;
  note?: string;
  accent?: "accent" | "abi" | "wdbx" | "abbey" | "aviva";
};

export function CopyGrid({
  items,
  columns = "md:grid-cols-2",
}: {
  items: readonly CopyItem[];
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-4", columns)}>
      {items.map((item) => {
        const inner = (
          <Surface hover={Boolean(item.href)} accent={item.accent} className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                {item.kicker ? <p className="text-xs text-fg-subtle">{item.kicker}</p> : null}
                <h3 className={cn("font-display text-xl", item.kicker && "mt-1")}>{item.title}</h3>
              </div>
              {item.status ? <StatusBadge status={item.status} /> : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
            {item.note ? <p className="mt-3 text-xs text-fg-subtle">{item.note}</p> : null}
          </Surface>
        );
        if (!item.href) return <div key={item.title}>{inner}</div>;
        return (
          <AppLink key={item.title} to={item.href} className="no-underline">
            {inner}
          </AppLink>
        );
      })}
    </div>
  );
}

export function NamedGrid({
  items,
  accent,
  nameClass,
  columns = "sm:grid-cols-2",
}: {
  items: readonly { name: string; body: string }[];
  accent?: "accent" | "abi" | "wdbx" | "abbey" | "aviva";
  nameClass?: string;
  columns?: string;
}) {
  return (
    <ul className={cn("grid gap-3", columns)}>
      {items.map((item) => (
        <li key={item.name}>
          <Surface accent={accent}>
            <p className={cn("font-mono text-sm", nameClass)}>{item.name}</p>
            <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
          </Surface>
        </li>
      ))}
    </ul>
  );
}

export function CommandList({ rows }: { rows: readonly { cmd: string; note: string }[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl shadow-border">
      {rows.map((row) => (
        <li key={row.cmd} className="bg-bg-elevated px-5 py-4">
          <p className="font-mono text-0.8rem text-fg">{row.cmd}</p>
          <p className="mt-1 text-sm text-fg-muted">{row.note}</p>
        </li>
      ))}
    </ul>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = "36rem",
}: {
  columns: { header: string; className?: string; cell: (row: T) => ReactNode }[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl shadow-border">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-bg-elevated text-fg-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-bg">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.header} className={cn("px-4 py-3", col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const personaDot: Record<string, string> = {
  abbey: "bg-persona-abbey",
  aviva: "bg-persona-aviva",
  abi: "bg-persona-abi",
};

export function PersonaGrid({
  items = personas,
}: {
  items?: readonly {
    id: string;
    name: string;
    role: string;
    color: "abbey" | "aviva" | "abi";
    body: string;
  }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Surface key={item.id} accent={item.color === "abi" ? "wdbx" : item.color} className="p-7">
          <h3 className="flex items-center gap-2.5 font-display text-2xl">
            <span className={cn("size-2.5 rounded-full", personaDot[item.id])} aria-hidden="true" />
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-fg-subtle">{item.role}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">{item.body}</p>
        </Surface>
      ))}
    </div>
  );
}

export function StatGrid({
  cells,
  columns = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  cells: readonly { k: string; v: string; tag?: Provenance }[];
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-4", columns)}>
      {cells.map((cell) => (
        <div key={cell.k} className="surface p-4 text-center">
          <p className="font-display text-3xl tabular">{cell.v}</p>
          <p className="mt-1 text-xs text-fg-subtle">{cell.k}</p>
          {cell.tag ? (
            <div className="mt-2 flex justify-center">
              <ProvTag tag={cell.tag} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ClaimList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-2 text-sm text-fg-muted sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-status-planned" aria-hidden="true">
            ○
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function IntegrityList({
  rules = integrityRules,
}: {
  rules?: readonly { title: string; body: string }[];
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rules.map((rule) => (
        <li key={rule.title} className="surface p-4">
          <p className="text-xs text-accent">{rule.title}</p>
          <p className="mt-2 text-sm text-fg-muted">{rule.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function ProjectRows({
  items,
}: {
  items: readonly { href: string; name: string; oneLiner: string; status: StatusKind }[];
}) {
  return (
    <div>
      {items.map((item, index) => (
        <Link key={item.href} to={item.href} className="project-row">
          <span className="font-mono text-11 text-fg-subtle">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="project-row-name font-display text-3xl tracking-tight">{item.name}</span>
          <span className="project-row-copy text-sm leading-relaxed text-fg-muted">
            {item.oneLiner}
          </span>
          <span className="project-row-status">
            <StatusBadge status={item.status} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function TruthList({
  items,
}: {
  items: readonly { n?: string; title: string; body: string }[];
}) {
  return (
    <div>
      {items.map((item, index) => (
        <article key={item.title} className="truth-row">
          <span className="font-mono text-sm text-accent">
            {item.n ?? String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-display text-2xl tracking-tight">{item.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
              {item.body}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function MetricCard({
  k,
  v,
  note,
  sub,
  children,
}: {
  k: string;
  v: string;
  note?: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <Surface>
      <p className="text-xs text-fg-subtle">{k}</p>
      <p className="mt-2 font-display text-3xl tabular">{v}</p>
      {sub ? <p className="mt-1 font-mono text-sm text-fg-muted">{sub}</p> : null}
      {note ? <p className="mt-2 text-sm text-fg-muted">{note}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Surface>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

export function PageClose({
  primary,
  secondary,
  next,
}: {
  primary?: { to: string; label: string };
  secondary?: { to: string; label: string }[];
  next?: { to: string; label: string; body: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {primary || secondary?.length ? (
        <Actions>
          {primary ? (
            <Button asChild>
              <Link to={primary.to as never}>{primary.label}</Link>
            </Button>
          ) : null}
          {secondary?.map((item) => (
            <Button key={item.to} asChild variant="secondary">
              <Link to={item.to as never}>{item.label}</Link>
            </Button>
          ))}
        </Actions>
      ) : null}
      {next ? (
        <div className={primary || secondary?.length ? "mt-10" : undefined}>
          <NextUp items={next} />
        </div>
      ) : null}
    </section>
  );
}

export function BulletSurface({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-3 text-sm text-fg-muted sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="surface px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function HeroStatus({ status, note }: { status: StatusKind; note?: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <StatusBadge status={status} />
      {note ? <span className="text-sm text-fg-muted">{note}</span> : null}
    </div>
  );
}

export function ChipRow({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-muted px-3 py-1 font-mono text-11 text-muted-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full px-3 font-mono text-11 tracking-wide",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pager({
  index,
  prev,
  next,
}: {
  index?: { to: string; label: string };
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
}) {
  return (
    <div className="mt-12 flex flex-wrap gap-4 text-sm">
      {index ? (
        <Link to={index.to as never} className="text-accent">
          {index.label}
        </Link>
      ) : null}
      {prev ? (
        <Link to={prev.to as never} className="text-fg-muted hover:text-fg">
          {prev.label}
        </Link>
      ) : null}
      {next ? (
        <Link to={next.to as never} className="text-fg-muted hover:text-fg">
          {next.label}
        </Link>
      ) : null}
    </div>
  );
}
