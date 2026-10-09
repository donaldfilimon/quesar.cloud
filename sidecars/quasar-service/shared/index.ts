import { z } from "zod";

export type SiteStatus = "idle" | "generating" | "error";

export interface PromptEntry {
  prompt: string;
  at: string;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  status: SiteStatus;
  previewPort: number | null;
  promptHistory: PromptEntry[];
  lastError?: string;
  cleanupPending?: boolean;
  job?: { id: string; startedAt: string; finishedAt?: string; outcome?: "done" | "error" | "cancelled" | "interrupted" };
}

export type GenerationEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: "list_files" | "read_file" | "write_file"; path?: string }
  | { type: "done" }
  | { type: "error"; message: string };

// Epoch is required: a count alone cannot identify a replacement stream.
export const EventPage = z.object({
  events: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), text: z.string() }),
    z.object({ type: z.literal("tool"), name: z.enum(["list_files", "read_file", "write_file"]), path: z.string().optional() }),
    z.object({ type: z.literal("done") }),
    z.object({ type: z.literal("error"), message: z.string() }),
  ])),
  next: z.number().int().nonnegative().refine(Number.isSafeInteger),
  epoch: z.string().uuid(),
  job: z.object({
    id: z.string(), startedAt: z.string(), finishedAt: z.string().optional(),
    outcome: z.enum(["done", "error", "cancelled", "interrupted"]).optional(),
  }).optional(),
}).refine(page => page.events.length <= page.next, "Event count exceeds cursor");

export type PreviewState = "stopped" | "starting" | "running" | "crashed";

export interface PreviewStatus {
  state: PreviewState;
  port: number | null;
  url: string | null;
  logTail: string[];
}

export const CreateSiteBody = z.object({
  name: z.string().min(1).max(60),
  prompt: z.string().min(1).max(4000),
});

export const EditSiteBody = z.object({
  prompt: z.string().min(1).max(4000),
});

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "site";
}

export { Connection, normalizeOrigin, DEFAULT_ORIGIN, ORIGIN_KEY, applyEventPage } from "./connection";
