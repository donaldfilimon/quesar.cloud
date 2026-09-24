import { z } from "zod";

import type { Provenance } from "@/components/site/prov-tag";

/**
 * Mirrors `Provenance` in `src/components/site/prov-tag.tsx`. `satisfies` keeps
 * this enum from drifting outside that union.
 */
const ProvenanceSchema = z.enum(["measured", "target", "reported"]) satisfies z.ZodType<Provenance>;

/** A key/value row whose value is a figure, so it carries a provenance tag. */
const TaggedRowSchema = z.object({
  k: z.string(),
  v: z.string(),
  tag: ProvenanceSchema,
});

/**
 * Investor notes (`/investors`, `/company`, `/financial-model`, the TAM and ARR
 * charts). Every figure is tagged: a target is never a result.
 */
export const InvestorSchema = z.object({
  /** `${companyIdentity.entity} · ${companyIdentity.legalName}`, derived and never retyped. */
  entity: z.string(),
  market: z.array(TaggedRowSchema.extend({ note: z.string() })),
  raise: z.object({ round: z.string(), amount: z.string() }),
  funds: z.array(z.object({ k: z.string(), v: z.string(), p: z.string() })),
  unit: z.array(TaggedRowSchema),
  arr: z.array(z.object({ year: z.string(), v: z.string() })),
  founder: z.array(z.object({ k: z.string(), tag: ProvenanceSchema })),
});

export type Investor = z.infer<typeof InvestorSchema>;
