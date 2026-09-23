// math-data.tsx — the math act's palette and its scene definitions (MATH).
// Split out of math.tsx so that module exports only components (fast refresh);
// this file exports no components, only data.

import { C } from "../tokens";
import type { MathDef } from "./math";
import { Sub, Sup, Tok } from "./math-tex";

export const AV = "#a78bfa";
export const AVC = "#22d3ee";

export const MATH: MathDef[] = [
  { idx: "M1", label: "Similarity", badge: "current", title: "Cosine distance", motif: "vectors",
    eqs: [{ tex: <span>cos θ = (<Tok c={AVC}>a</Tok>·<Tok c={AV}>b</Tok>) / (‖<Tok c={AVC}>a</Tok>‖ ‖<Tok c={AV}>b</Tok>‖)</span>, note: "Relevance is the angle between two embeddings." }],
    bullets: ["Vectors normalized to unit length", "Dot product over 768+ dimensions", "Zig @Vector SIMD — many lanes per cycle"] },
  { idx: "M2", label: "Index", badge: "partial", title: "HNSW search", motif: "graph",
    eqs: [{ tex: <span>search ≈ O(<Tok c={AVC}>log N</Tok>) &nbsp; · &nbsp; M=16, ef=32</span>, note: "A hierarchical navigable small-world graph." }],
    bullets: ["Coarse top layers, dense bottom layer", "Greedy descent toward the query", "Results returned in non-increasing score"] },
  { idx: "M3", label: "Hybrid rank", badge: "partial", title: "Beyond similarity", motif: "curve",
    eqs: [{ tex: <span>score = <Tok c={AVC}>sem</Tok> × <Tok c="#60a5fa">temp</Tok> × <Tok c={C.green}>causal</Tok> × <Tok c={AV}>persona</Tok></span> },
          { tex: <span><Tok c="#60a5fa">temporal</Tok> = e<Sup>−λΔt</Sup></span>, note: "Recency decays on a half-life; cause is BFS hop-distance." }],
    bullets: ["Recency half-life decay", "Causal-edge proximity", "Router persona weight"] },
  { idx: "M4", label: "Integrity", badge: "current", title: "SHA-256 chaining", motif: "chain",
    eqs: [{ tex: <span>H<Sub>n</Sub> = SHA256( H<Sub>n−1</Sub> ‖ ts ‖ profile ‖ q ‖ r )</span>, note: "Each block commits to its predecessor." }],
    bullets: ["Tamper-evident by construction", "verifyBlocks() re-derives every hash", "One flipped bit breaks the chain"] },
  { idx: "M5", label: "Durability", badge: "partial", title: "Write-ahead log", motif: "orbit",
    eqs: [{ tex: <span>frame = [ len ‖ payload ‖ <Tok c={AVC}>crc32</Tok> ]</span>, note: "CRC-32 is polynomial division over GF(2)." }],
    bullets: ["Append-only, framed records", "Corruption fails the checksum", "Replay rebuilds state deterministically"] },
  { idx: "M6", label: "Compression", badge: "partial", title: "int8 quantization", motif: "orbit",
    eqs: [{ tex: <span>q = round( x / s ), &nbsp; s = max|x| / 127</span>, note: "Float-32 → int-8, one scale factor per vector." }],
    bullets: ["~4× smaller footprint", "Bounded reconstruction error", "Dequantize on the hot path"] },
  { idx: "M7", label: "Privacy", badge: "partial", title: "Homomorphic sums", motif: "orbit",
    eqs: [{ tex: <span>Enc(<Tok c={AVC}>a</Tok>) + Enc(<Tok c={AV}>b</Tok>) = Enc(<Tok c={AVC}>a</Tok>+<Tok c={AV}>b</Tok>) &nbsp; (mod p)</span>, note: "Additive, single-key homomorphism over GF(p)." }],
    bullets: ["Aggregate without decrypting", "Sums decrypt to plaintext sums", "Full multiply — still research"] },
  { idx: "M8", label: "Consensus", badge: "partial", title: "Raft replication", motif: "orbit",
    eqs: [{ tex: <span>commit ⟺ acks ≥ ⌊n/2⌋ + 1</span>, note: "Agreement by majority quorum." }],
    bullets: ["Single leader per term", "Log replicated to followers", "In-process today — networked is proposed"] },
  { idx: "M9", label: "The minds", badge: "current", title: "Three loss functions", motif: "blend",
    eqs: [{ tex: <span><Tok c={C.green}>L<Sub>Abbey</Sub></Tok> = L<Sub>NLL</Sub> + λ·L<Sub>emp</Sub> + L<Sub>tech</Sub></span> },
          { tex: <span><Tok c={AV}>L<Sub>Aviva</Sub></Tok> = L<Sub>fact</Sub> + γ·L<Sub>direct</Sub></span> },
          { tex: <span>R<Sub>final</Sub> = <Tok c={C.green}>α·R<Sub>Abbey</Sub></Tok> + <Tok c={AV}>(1−α)·R<Sub>Aviva</Sub></Tok></span>, note: "Abi sets α — empathy vs. directness." }],
    bullets: ["Each persona is an objective", "Blended in a single pass", "Moderated, never averaged blindly"] },
  { idx: "M10", label: "QED", title: "The proof is the math", motif: "orbit",
    eqs: [{ tex: <span>resilient ⟸ verifiable ∧ governed ∧ routed</span>, note: "Everything Abbey promised — formalized." }],
    bullets: ["No hand-waving", "Every layer, a definition", "And the math checks out"] },
];
