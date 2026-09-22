import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

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
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Live model is not available in this environment." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        messages: [
          { role: "system", content: SYSTEM[data.persona] },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Model error ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true as const, text: body.choices?.[0]?.message?.content ?? "" };
  });
