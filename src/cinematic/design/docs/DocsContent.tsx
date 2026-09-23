/* MLAI docs — content primitives + sample pages. */
import { useState } from "react";
import type { ReactNode } from "react";
import { ICheck, ICopy, IInfo, IAlert, IShield } from "./Icons";
import type { IconProps } from "./Icons";

/* ── prose primitives ─────────────────────────────────────────── */
export function H2({ id, children }: { id: string; children: ReactNode }): ReactNode {
  return (
    <h2
      id={id}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "var(--text-h3)",
        letterSpacing: "-0.01em",
        color: "var(--text)",
        margin: "38px 0 14px",
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }): ReactNode {
  return (
    <p
      style={{
        fontSize: 15.5,
        lineHeight: 1.7,
        color: "var(--text-dim)",
        margin: "0 0 16px",
        textWrap: "pretty",
      }}
    >
      {children}
    </p>
  );
}

export function IC({ children }: { children: ReactNode }): ReactNode {
  return (
    <code
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.85em",
        color: "var(--spectrum-cyan)",
        background: "var(--surface-1)",
        borderRadius: 6,
        padding: "0.12em 0.42em",
      }}
    >
      {children}
    </code>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  };
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--surface-1)",
        border: "1px solid var(--hair)",
        margin: "0 0 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        {label ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-faint)",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={copy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 6,
            border: 0,
            cursor: "pointer",
            color: copied ? "var(--proof)" : "var(--text-faint)",
            background: "transparent",
          }}
        >
          {copied ? <ICheck s={12} /> : <ICopy s={12} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "16px",
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          lineHeight: 1.65,
          color: "#cbd5e1",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export type CalloutKind = "info" | "warn" | "proof";

export function Callout({
  kind = "info",
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
}): ReactNode {
  const map: Record<CalloutKind, [string, (p: IconProps) => ReactNode]> = {
    info: ["var(--spectrum-cyan)", IInfo],
    warn: ["var(--signal)", IAlert],
    proof: ["var(--proof)", IShield],
  };
  const [c, Icon] = map[kind];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 16,
        borderRadius: "var(--radius-md)",
        margin: "0 0 20px",
        background: `color-mix(in srgb, ${c} 7%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`,
      }}
    >
      <span style={{ color: c, flexShrink: 0, marginTop: 1 }}>
        <Icon s={18} />
      </span>
      <div>
        {title && (
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-dim)" }}>{children}</div>
      </div>
    </div>
  );
}

/** A parameter row: [parameter, default, description]. */
export type ParamRow = readonly [string, string, string];

export function ParamTable({ rows }: { rows: readonly ParamRow[] }): ReactNode {
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--hair)",
        margin: "0 0 20px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 110px 1fr",
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--hair)",
          padding: "10px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "var(--text-faint)",
        }}
      >
        <span>Parameter</span>
        <span>Default</span>
        <span>Description</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r[0]}
          style={{
            display: "grid",
            gridTemplateColumns: "160px 110px 1fr",
            padding: "12px 16px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--hair)" : 0,
            background: "var(--surface-2)",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--spectrum-cyan)" }}>
            {r[0]}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)" }}>
            {r[1]}
          </span>
          <span style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.5 }}>{r[2]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── pages ────────────────────────────────────────────────────── */
/** A table-of-contents entry: [anchor id, label]. */
export type TocEntry = readonly [string, string];

export interface DocPage {
  eyebrow: string;
  title: string;
  toc: readonly TocEntry[];
  body: () => ReactNode;
}
