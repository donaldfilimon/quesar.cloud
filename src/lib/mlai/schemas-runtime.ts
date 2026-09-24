import { z } from "zod";

import type { StatusKind } from "@/lib/site-identity";

/**
 * Schemas for the ABI/WDBX runtime facts in `categories/abi-runtime.ts`. Kept
 * apart from the shared `schemas.ts`; like it, only types flow into the
 * content module, and `abi-runtime.content.test.ts` does the parsing, so zod
 * never reaches the client bundle.
 */

const StatusKindSchema = z.enum([
  "current",
  "partial",
  "experimental",
  "development",
  "planned",
  "research",
]) satisfies z.ZodType<StatusKind>;

/**
 * One MCP tool exposed by `abi-mcp`. `docsBody` is the docs-hub wording (all
 * twelve tools); `abiBody` is the /abi page wording for the subset shown there.
 */
export const McpToolSchema = z.object({
  name: z.string(),
  docsBody: z.string(),
  abiBody: z.string().optional(),
});

/**
 * One crate of the ABI/WDBX Rust workspaces. Each page that lists crates reads
 * its own wording: `abiBody` (/abi), `wdbxBody` (/wdbx), `docsBody` (docs hub
 * module map).
 */
export const AbiModuleSchema = z.object({
  name: z.string(),
  abiBody: z.string().optional(),
  wdbxBody: z.string().optional(),
  docsBody: z.string().optional(),
});

/** A /wdbx capability table row. */
export const WdbxCapabilitySchema = z.object({
  concern: z.string(),
  what: z.string(),
  status: StatusKindSchema,
});

/**
 * A docs-hub WDBX capability card. `pendingStatus` is data only, not rendered
 * yet: it flags cards whose unbadged copy overstates or contradicts the /wdbx
 * table, for the copy wave. It is deliberately not named `status`, which
 * `CopyGrid` would render as a badge.
 */
export const DocsWdbxCapabilitySchema = z.object({
  title: z.string(),
  body: z.string(),
  pendingStatus: StatusKindSchema.optional(),
});

export const McpToolCatalogSchema = z.array(McpToolSchema);
export const AbiModulesSchema = z.array(AbiModuleSchema);
export const WdbxCapabilitiesSchema = z.array(WdbxCapabilitySchema);
export const DocsWdbxCapabilitiesSchema = z.array(DocsWdbxCapabilitySchema);

export type McpTool = z.infer<typeof McpToolSchema>;
export type AbiModule = z.infer<typeof AbiModuleSchema>;
export type WdbxCapability = z.infer<typeof WdbxCapabilitySchema>;
export type DocsWdbxCapability = z.infer<typeof DocsWdbxCapabilitySchema>;
