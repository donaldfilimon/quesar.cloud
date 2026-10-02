// math-data.tsx — the math act's palette and its scene definitions (MATH).
// Split out of math.tsx so that module exports only components (fast refresh);
// this file exports no components, only data.

import { C } from "../tokens";
import type { MathDef } from "./math";
import { Sub, Sup, Tok } from "./math-tex";

export const AV = "#a78bfa";
export const AVC = "#22d3ee";

export const MATH: MathDef[] = [
  {
    idx: "M1",
    label: "Similarity",
    badge: "vision",
    title: "Cosine similarity",
    motif: "vectors",
    eqs: [
      {
        tex: (
          <span>
            cos θ = (<Tok c={AVC}>a</Tok>·<Tok c={AV}>b</Tok>) / (‖<Tok c={AVC}>a</Tok>‖ ‖
            <Tok c={AV}>b</Tok>‖)
          </span>
        ),
        note: "Cosine similarity illustrates vector alignment, not semantic truth.",
      },
    ],
    bullets: [
      "Vectors normalized to unit length",
      "Dot product over the input dimensions",
      "Illustrative equation; no throughput claim",
    ],
  },
  {
    idx: "M2",
    label: "Index",
    badge: "vision",
    title: "HNSW search",
    motif: "graph",
    eqs: [
      {
        tex: <span>Illustrative graph traversal · sample M=16, ef=32</span>,
        note: "Conceptual graph-search illustration; no implementation claim.",
      },
    ],
    bullets: [
      "Illustrative coarse and dense layers",
      "Illustrative traversal toward a query",
      "Illustrative result ordering",
    ],
  },
  {
    idx: "M3",
    label: "Hybrid rank",
    badge: "vision",
    title: "Beyond similarity",
    motif: "curve",
    eqs: [
      {
        tex: (
          <span>
            score = <Tok c={AVC}>sem</Tok> × <Tok c="#60a5fa">temp</Tok> ×{" "}
            <Tok c={C.green}>causal</Tok> × <Tok c={AV}>persona</Tok>
          </span>
        ),
      },
      {
        tex: (
          <span>
            <Tok c="#60a5fa">temporal</Tok> = e<Sup>−λΔt</Sup>
          </span>
        ),
        note: "Conceptual recency decay and causal proximity; no implemented ranking claim.",
      },
    ],
    bullets: [
      "Illustrative recency factor",
      "Illustrative causal factor",
      "Illustrative persona factor",
    ],
  },
  {
    idx: "M4",
    label: "Integrity",
    badge: "vision",
    title: "SHA-256 chaining",
    motif: "chain",
    eqs: [
      {
        tex: (
          <span>
            H<Sub>n</Sub> = SHA256( H<Sub>n−1</Sub> ‖ ts ‖ sequence ‖ profile ‖ metadata )
          </span>
        ),
        note: "Each block commits to its predecessor.",
      },
    ],
    bullets: [
      "Hash links are not digital signatures",
      "Strict verification recomputes stored content hashes",
      "Link-only verification checks predecessor links",
    ],
  },
  {
    idx: "M5",
    label: "Durability",
    badge: "vision",
    title: "Write-ahead log",
    motif: "orbit",
    eqs: [
      {
        tex: (
          <span>
            frame = <Tok c={AVC}>crc32(JSON)</Tok> ‖ space ‖ JSON ‖ newline
          </span>
        ),
        note: "The checksum covers the minified JSON bytes.",
      },
    ],
    bullets: [
      "Append-only CRC-prefixed records",
      "CRC mismatches are rejected; an incomplete final frame may be ignored",
      "Verified frames replay onto a matching checkpoint",
    ],
  },
  {
    idx: "M6",
    label: "Compression",
    badge: "vision",
    title: "int8 quantization",
    motif: "orbit",
    eqs: [
      {
        tex: <span>q = round( x / s ), &nbsp; s = max|x| / 127</span>,
        note: "Illustrative formula assuming a positive, nonzero scale; zero-vector behavior unspecified.",
      },
    ],
    bullets: [
      "Conceptual conversion example",
      "Storage ratio and reconstruction behavior require separate evidence",
      "Illustrative conversion, not runtime acceptance",
    ],
  },
  {
    idx: "M7",
    label: "Privacy",
    badge: "vision",
    title: "Encrypted aggregation",
    motif: "orbit",
    eqs: [
      {
        tex: <span>Encrypted aggregation / conceptual objective</span>,
        note: "A scheme and threat model require separate evidence",
      },
    ],
    bullets: [
      "No cryptographic privacy guarantee",
      "Research direction / vision",
      "Qualification requires separate evidence",
    ],
  },
  {
    idx: "M8",
    label: "Consensus",
    badge: "vision",
    title: "Raft replication / concept",
    motif: "orbit",
    eqs: [
      {
        tex: <span>Illustrative majority threshold = ⌊n/2⌋ + 1</span>,
        note: "Conceptual vote count; not a complete Raft commit rule.",
      },
    ],
    bullets: [
      "Leader/follower illustration",
      "Replication direction / vision",
      "Protocol qualification requires separate evidence",
    ],
  },
  {
    idx: "M9",
    label: "The minds",
    badge: "vision",
    title: "Conceptual profile objectives",
    motif: "blend",
    eqs: [
      {
        tex: (
          <span>
            <Tok c={C.green}>
              L<Sub>Abbey</Sub>
            </Tok>{" "}
            = L<Sub>NLL</Sub> + λ·L<Sub>emp</Sub> + L<Sub>tech</Sub>
          </span>
        ),
      },
      {
        tex: (
          <span>
            <Tok c={AV}>
              L<Sub>Aviva</Sub>
            </Tok>{" "}
            = L<Sub>fact</Sub> + γ·L<Sub>direct</Sub>
          </span>
        ),
      },
      {
        tex: (
          <span>
            R<Sub>final</Sub> ={" "}
            <Tok c={C.green}>
              α·R<Sub>Abbey</Sub>
            </Tok>{" "}
            +{" "}
            <Tok c={AV}>
              (1−α)·R<Sub>Aviva</Sub>
            </Tok>
          </span>
        ),
        note: "Illustrative α; the identity contract does not establish a learned blend.",
      },
    ],
    bullets: [
      "Conceptual objectives, not trained model weights",
      "Illustrative blend, not execution evidence",
      "Profile contracts do not verify answers",
    ],
  },
  {
    idx: "M10",
    label: "Concepts / vision",
    title: "Illustrative mathematics / vision",
    motif: "orbit",
    eqs: [
      {
        tex: <span>resilient ⟸ verifiable ∧ governed ∧ routed</span>,
        note: "Equations illustrate concepts; they do not prove deployment claims.",
      },
    ],
    bullets: [
      "State the assumptions",
      "Define the acceptance evidence",
      "Test the intended execution path",
    ],
  },
];
