import { z } from "zod";

import type { StatusKind } from "@/lib/site-identity";

/**
 * Schemas for `categories/surfaces.ts`: the /quesar surface table and "what"
 * cards, the /developers setup cards and the /abbey workspace facts. Like
 * `schemas.ts`, these run only in tests; the data module imports types only.
 */

const StatusKindSchema = z.enum([
  "current",
  "partial",
  "experimental",
  "development",
  "planned",
  "research",
]) satisfies z.ZodType<StatusKind>;

/** A product journey slug or start-journey id in `categories/product-journeys.ts`. */
export const JourneyLinkSchema = z.enum(["abi", "abbey", "wdbx", "quasar", "mobile"]);

export const QuesarSurfacesSchema = z.array(
  z.object({
    surface: z.string(),
    role: z.string(),
    status: StatusKindSchema,
    /** The journey this row restates; its status must match (surfaces.content.test.ts). */
    journey: JourneyLinkSchema.optional(),
  }),
);

export const QuesarWhatSchema = z.array(z.object({ title: z.string(), body: z.string() }));

export const SetupsSchema = z.array(
  z.object({
    title: z.string(),
    body: z.string(),
    code: z.string().nullable(),
    href: z.string().startsWith("/"),
    /** The journey this card restates; its href must match that journey's link. */
    journey: JourneyLinkSchema.optional(),
  }),
);

export const AbbeyWorkspaceFactsSchema = z.array(z.string().min(1));

export type JourneyLink = z.infer<typeof JourneyLinkSchema>;
export type QuesarSurface = z.infer<typeof QuesarSurfacesSchema>[number];
export type QuesarWhatCard = z.infer<typeof QuesarWhatSchema>[number];
export type SetupCard = z.infer<typeof SetupsSchema>[number];
