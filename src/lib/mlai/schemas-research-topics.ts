import { z } from "zod";

import type { StatusKind } from "@/lib/site-identity";
import { researchContextTopicIds } from "./categories/research-context";

// Schemas for the /research topic and source lists. Kept apart from `schemas.ts`
// so this group can grow without touching the shared schema module. Like every
// content schema, it is used only by tests and for `z.infer` types, so zod never
// reaches the client bundle.

const StatusKindSchema = z.enum([
  "current",
  "partial",
  "experimental",
  "development",
  "planned",
  "research",
]) satisfies z.ZodType<StatusKind>;

/** A `researchRecords.tracks` id (`ai`, `wdbx`, `sea`, `gpu`, `mcp`, `tui`). */
export const ResearchTrackIdSchema = z.enum(researchContextTopicIds);

export const ResearchTopicEntrySchema = z.object({
  title: z.string().min(1),
  status: StatusKindSchema,
  /** Human-readable list of the projects the topic applies to. */
  applies: z.string().min(1),
  body: z.string().min(1),
  /** Research tracks this topic restates; empty when no track covers it. */
  trackIds: z.array(ResearchTrackIdSchema),
});

export const ResearchTopicsSchema = z.array(ResearchTopicEntrySchema);

/**
 * The entity a source card describes, for later linkage to the repo catalog.
 * Repo names where one exists (`abi`, `wdbx`, `abbey`, `gama`, `skill-creator`);
 * `mobile` and `quasar` are product surfaces without a repo of their own here.
 */
export const ResearchSourceSubjectSchema = z.enum([
  "abi",
  "wdbx",
  "abbey",
  "gama",
  "skill-creator",
  "mobile",
  "quasar",
]);

export const ResearchSourceSchema = z.object({
  title: z.string().min(1),
  href: z.string().startsWith("/"),
  body: z.string().min(1),
  subject: ResearchSourceSubjectSchema.optional(),
});

export const ResearchSourcesSchema = z.array(ResearchSourceSchema);

export type ResearchTopicEntry = z.infer<typeof ResearchTopicEntrySchema>;
export type ResearchTopics = z.infer<typeof ResearchTopicsSchema>;
export type ResearchSourceSubject = z.infer<typeof ResearchSourceSubjectSchema>;
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
export type ResearchSources = z.infer<typeof ResearchSourcesSchema>;
