// DesignHub.tsx — the /design surface. A floating switcher (bottom-center)
// between the design boards & UI kits. Each board is code-split via lazy() and
// only the active one is downloaded/mounted, so opening the hub is cheap and the
// heavy boards (canvas demos, the system board) load on demand.

import { useState, Suspense } from "react";
import { BOARDS, type Board } from "./boards";
import { designShots, filmScript } from "../catalog";

const TABS = designShots.map((chapter) => ({
  key: chapter.shot.board,
  label: chapter.shot.board[0].toUpperCase() + chapter.shot.board.slice(1),
}));
const SCRIPT = filmScript("design");

export function DesignHub() {
  const [board, setBoard] = useState<Board>("brand");
  const Active = BOARDS[board];
  const shot = designShots.find((chapter) => chapter.shot.board === board)!;

  return (
    <div
      // The boards scroll here, not the window: the shell is a fixed overlay.
      // The named timeline drives the system board's progress bar.
      data-ds-scroller=""
      style={{
        position: "absolute",
        inset: 0,
        overflow: "auto",
        background: "var(--surface-0)",
        scrollTimeline: "--ds-page block",
      }}
    >
      <aside
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          padding: "12px 24px 12px 170px",
          background: "#0c0d14",
          color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {shot.shot.overlay} · Explore · {shot.title} · illustrative data, no live service
        <details style={{ marginTop: 6 }}>
          <summary>Walkthrough transcript · planned 80-second cut</summary>
          <ol>
            {SCRIPT.map((line) => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ol>
        </details>
      </aside>
      <Suspense
        fallback={
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-faint)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.3em",
            }}
          >
            LOADING
          </div>
        }
      >
        <div data-design-board={board} data-shot-start={shot.start} data-shot-end={shot.end}>
          <Active />
        </div>
      </Suspense>

      {/* floating board switcher */}
      <div
        style={{
          position: "fixed",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          gap: 4,
          padding: 5,
          borderRadius: 999,
          maxWidth: "92vw",
          overflowX: "auto",
          background: "rgba(12,13,20,0.82)",
          border: "1px solid var(--hair-hi)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.5)",
        }}
      >
        {TABS.map((t) => {
          const active = t.key === board;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setBoard(t.key)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
                border: "none",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.1em",
                color: active ? "#06120c" : "var(--text-dim)",
                background: active ? "var(--spectrum-cyan)" : "transparent",
                transition: "background var(--dur-fast), color var(--dur-fast)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DesignHub;
