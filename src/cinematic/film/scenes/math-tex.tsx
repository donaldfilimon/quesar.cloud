// math-tex.tsx — little formula helpers for the math act's equations (MATH in
// math-data.tsx).
import type { ReactNode } from "react";

export function Sub({ children }: { children: ReactNode }) {
  return <sub style={{ fontSize: "0.62em", opacity: 0.85 }}>{children}</sub>;
}
export function Sup({ children }: { children: ReactNode }) {
  return <sup style={{ fontSize: "0.62em", opacity: 0.85 }}>{children}</sup>;
}
export function Tok({ c, children }: { c: string; children: ReactNode }) {
  return <span style={{ color: c }}>{children}</span>;
}
