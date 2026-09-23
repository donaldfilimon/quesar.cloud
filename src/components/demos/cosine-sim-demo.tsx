import { useId, useState } from "react";

// Ported from mlai `src/components/demos/CosineSimDemo.tsx` (b6f3686).
// Interactive vector-angle visualization of cosine similarity — the core
// comparison primitive of vector search. Pure math; nothing to overclaim.
export function CosineSimDemo() {
  const [a, setA] = useState(25);
  const [b, setB] = useState(115);
  const idA = useId();
  const idB = useId();
  const ar = (a * Math.PI) / 180;
  const br = (b * Math.PI) / 180;
  const cos = Math.cos(ar - br);
  const cx = 110,
    cy = 110,
    R = 82;
  const ax = cx + Math.cos(ar) * R;
  const ay = cy - Math.sin(ar) * R;
  const bx = cx + Math.cos(br) * R;
  const by = cy - Math.sin(br) * R;
  const col =
    cos > 0.5 ? "var(--status-current)" : cos > -0.1 ? "var(--warn)" : "var(--destructive)";

  return (
    <div className="surface grid items-center gap-6 p-6 sm:grid-cols-2">
      <svg
        viewBox="0 0 220 220"
        className="mx-auto w-full max-w-55"
        aria-label="Two vectors on a unit circle"
      >
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border-strong)" />
        <line x1={20} y1={cy} x2={200} y2={cy} stroke="var(--border)" />
        <line x1={cx} y1={20} x2={cx} y2={200} stroke="var(--border)" />
        <path d={`M ${cx} ${cy} L ${ax} ${ay}`} stroke="var(--primary)" strokeWidth="2.5" />
        <circle cx={ax} cy={ay} r="4" fill="var(--primary)" />
        <path d={`M ${cx} ${cy} L ${bx} ${by}`} stroke="var(--aviva)" strokeWidth="2.5" />
        <circle cx={bx} cy={by} r="4" fill="var(--aviva)" />
        <circle cx={cx} cy={cy} r="3" fill="var(--fg)" />
      </svg>
      <div>
        <div className="text-5xl font-black" style={{ color: col }}>
          {cos.toFixed(3)}
        </div>
        <div className="mb-5 text-xs text-fg-muted">cosine similarity (a · b / ‖a‖‖b‖)</div>
        <label htmlFor={idA} className="mb-1 block text-xs text-accent">
          Vector a — {a}°
        </label>
        <input
          id={idA}
          type="range"
          min={0}
          max={360}
          value={a}
          onChange={(e) => setA(+e.target.value)}
          className="mb-4 w-full accent-primary"
        />
        <label htmlFor={idB} className="mb-1 block text-xs text-accent">
          Vector b — {b}°
        </label>
        <input
          id={idB}
          type="range"
          min={0}
          max={360}
          value={b}
          onChange={(e) => setB(+e.target.value)}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
}
