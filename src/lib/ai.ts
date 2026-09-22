import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { staticSite } from "@/lib/static-site";

const input = z.object({
  prompt: z.string().trim().min(1).max(1200),
  persona: z.enum(["abbey", "aviva", "abi"]).default("abi"),
});

const SYSTEM: Record<"abbey" | "aviva" | "abi", string> = {
  abbey:
    "You are Abbey, MLAI's empathic polymath. Care first. Scaffold. Name uncertainty. Never claim AGI, hosted sessions, or unverified benchmarks. Keep answers under 180 words.",
  aviva:
    "You are Aviva, MLAI's unfiltered expert. Clarity always. No preamble. No hedges unless the fact is actually unknown. Keep answers under 140 words.",
  abi: "You are Abi, MLAI's adaptive moderator. Route the user toward inspectable next steps. Say what the ledger can prove. Keep answers under 160 words.",
};

export const askPersona = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const { complete } = await import("@/lib/server/llm");
    const { hit, LIMITS } = await import("@/lib/server/rate-limit.server");
    const limited = await hit("llm", context.userId, LIMITS.llm);
    if (!limited.allowed) return { ok: false as const, error: "Too many requests. Try again in a minute." };
    const result = await complete({
      maxTokens: 280,
      messages: [
        { role: "system", content: SYSTEM[data.persona] },
        { role: "user", content: data.prompt },
      ],
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.reason === "not_configured" ? "Live model is not available in this environment." : result.message,
      };
    }
    return { ok: true as const, text: result.text };
  });

type AskInput = { data: { prompt: string; persona?: "abbey" | "aviva" | "abi" } };
type AskResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * What components call. The static GitHub Pages build has no server, so it
 * answers honestly instead of hitting a server function that does not exist.
 */
export function askPersonaFromClient(input: AskInput): Promise<AskResult> {
  if (staticSite) {
    return Promise.resolve({
      ok: false,
      error: "The live model runs on the server deployment; this is the static preview, so no model call was made.",
    });
  }
  return askPersona(input);
}
