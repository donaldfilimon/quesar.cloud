// transcript.tsx — the full narration of a room as text, outside the picture.
//
// Portals into the Stage's unscaled chrome (like VoiceToggle), so it keeps its
// real size on a phone instead of shrinking with the 1920×1080 frame. Built
// from the same script array that drives speech and captions, so the three
// never disagree.

import { createPortal } from "react-dom";
import { C, FONT, PERSONAS, type PersonaKey } from "./tokens";
import { useTimeline } from "./timeline-context";

export interface TranscriptLine {
  who?: PersonaKey;
  text: string;
}

export function Transcript({ lines }: { lines: readonly TranscriptLine[] }) {
  const { chrome, capture } = useTimeline();
  if (capture) return null;
  const panel = (
    <details
      style={{
        position: "absolute",
        // Below the shell's fixed "Showcase" back link, which owns the corner.
        top: 64,
        left: 14,
        zIndex: 9998,
        maxWidth: "min(480px, calc(100% - 28px))",
        color: C.dim,
        fontFamily: FONT.sans,
        fontSize: 14,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          minHeight: 36,
          display: "inline-flex",
          alignItems: "center",
          padding: "0 14px",
          borderRadius: 999,
          background: "rgba(20,20,28,0.8)",
          border: `1px solid ${C.line}`,
          color: "#f6f4ef",
          fontSize: 13,
        }}
      >
        Transcript
      </summary>
      <ol
        style={{
          margin: "10px 0 0",
          padding: "12px 16px 12px 32px",
          maxHeight: "min(60vh, 520px)",
          overflowY: "auto",
          background: "rgba(4,4,6,0.9)",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          lineHeight: 1.55,
        }}
      >
        {lines.map((line, index) => (
          <li key={index} style={{ marginBottom: 6 }}>
            {line.who ? (
              <span style={{ color: PERSONAS[line.who].color, fontWeight: 600, marginRight: 8 }}>
                {PERSONAS[line.who].name}
              </span>
            ) : null}
            {line.text}
          </li>
        ))}
      </ol>
    </details>
  );
  return chrome ? createPortal(panel, chrome) : panel;
}
