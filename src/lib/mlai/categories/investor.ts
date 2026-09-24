import type { Investor } from "../schemas-investor";

import { companyIdentity } from "./about";

/**
 * The GPU engineering target. Stated once so the unit-economics row and the
 * founder-evidence row cannot drift apart; `architectureNodes` (compute) in
 * `@/lib/content` names the same figure as not claimed. Never a measurement.
 */
const gpuTargetFigure = "295×";

export const investor: Investor = {
  entity: `${companyIdentity.entity} · ${companyIdentity.legalName}`,
  market: [
    {
      k: "TAM",
      v: "$48B",
      note: "On-device and private AI infrastructure. Category sizing, not a booking.",
      tag: "target",
    },
    {
      k: "SAM",
      v: "$12B",
      note: "Regulated software, research ops, and security-conscious product teams.",
      tag: "target",
    },
    {
      k: "SOM",
      v: "$1.2B",
      // Same business model as `companyIdentity.model`; the wording differs
      // ("plus" vs "+") and is kept as rendered copy. investor.content.test.ts
      // keeps the two in agreement.
      note: "Near-term reachable: SDK licensing plus integration services.",
      tag: "target",
    },
  ],
  raise: { round: "Seed", amount: "$4.5M" },
  funds: [
    { k: "Product", v: "50%", p: "ABI, WDBX, Abbey, Quesar" },
    { k: "Infrastructure", v: "30%", p: "Tooling, eval, private deploy paths" },
    { k: "GTM", v: "20%", p: "Services motion, not ads" },
  ],
  unit: [
    { k: "Gross margin", v: "82% target", tag: "target" },
    { k: "CAC payback", v: "11 months target", tag: "target" },
    { k: "LTV/CAC", v: "5.4× target", tag: "target" },
    { k: `GPU ${gpuTargetFigure}`, v: "engineering target — not a result", tag: "target" },
  ],
  arr: [
    { year: "Y1", v: "0.4" },
    { year: "Y2", v: "1.8" },
    { year: "Y3", v: "6.5" },
    { year: "Y4", v: "18" },
    { year: "Y5", v: "42" },
  ],
  founder: [
    {
      k: "Public source across ABI, WDBX, Abbey, Gama, and this site",
      tag: "measured",
    },
    { k: "Claims ledger in abbey/src/claims.rs", tag: "measured" },
    { k: "Independent verification gates per app", tag: "measured" },
    { k: `${gpuTargetFigure} GPU figure`, tag: "target" },
  ],
};
