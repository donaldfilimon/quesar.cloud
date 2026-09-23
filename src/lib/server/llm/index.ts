/**
 * One model interface for every AI surface (console chat, desk, persona
 * router). Adapters: xAI (grok) and Cloudflare AI Gateway → Gemini, chosen by
 * `LLM_PROVIDER` or by whichever is configured (see config.server.ts).
 *
 * No provider configured → `{ ok: false, reason: "not_configured" }`. Callers
 * render that honestly; they never invent a reply.
 */
import { gatewayConfig, llmProvider, type LlmProviderId } from "../config.server";
import { env } from "@/lib/env.server";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompleteRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export type CompleteResult =
  | { ok: true; provider: LlmProviderId; model: string; text: string }
  | { ok: false; reason: "not_configured"; message: string }
  | { ok: false; reason: "provider_error"; provider: LlmProviderId; message: string };

export const XAI_MODEL = "grok-4.5";
export const GEMINI_MODEL = "gemini-3.7-flash";

export interface LlmStatus {
  configured: boolean;
  provider: LlmProviderId | null;
  model: string | null;
}

export function status(): LlmStatus {
  const provider = llmProvider();
  return {
    configured: provider !== null,
    provider,
    model: provider === "xai" ? XAI_MODEL : provider === "gemini" ? GEMINI_MODEL : null,
  };
}

function extractText(data: unknown): string {
  const choices = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)
    ?.choices;
  const content = Array.isArray(choices) ? choices[0]?.message?.content : undefined;
  return typeof content === "string" ? content.trim() : "";
}

async function completeXai(req: CompleteRequest): Promise<CompleteResult> {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey)
    return { ok: false, reason: "not_configured", message: "The xAI key is not configured." };
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: XAI_MODEL,
      max_tokens: req.maxTokens ?? 400,
      temperature: req.temperature ?? 0.4,
      messages: req.messages,
    }),
  });
  if (!res.ok)
    return {
      ok: false,
      reason: "provider_error",
      provider: "xai",
      message: `Model error ${res.status}`,
    };
  const text = extractText(await res.json());
  if (!text)
    return {
      ok: false,
      reason: "provider_error",
      provider: "xai",
      message: "The model returned no text.",
    };
  return { ok: true, provider: "xai", model: XAI_MODEL, text };
}

async function completeGemini(req: CompleteRequest): Promise<CompleteResult> {
  const gateway = gatewayConfig();
  if (!gateway)
    return {
      ok: false,
      reason: "not_configured",
      message: "The Cloudflare AI Gateway is not configured.",
    };
  const system = req.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = req.messages.filter((m) => m.role !== "system");
  const res = await fetch(gateway.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gateway.token}`,
      "cf-aig-gateway-id": gateway.gatewayId,
      // The only content log is our own encrypted audit store; the gateway keeps metadata only.
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
      "cf-aig-request-timeout": "25000",
      "cf-aig-max-attempts": "2",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: `google/${GEMINI_MODEL}`,
      messages: [...(system ? [{ role: "system", content: system }] : []), ...turns],
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 900,
    }),
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: "provider_error",
      provider: "gemini",
      message: `Gateway error ${res.status}`,
    };
  }
  const text = extractText(await res.json());
  if (!text)
    return {
      ok: false,
      reason: "provider_error",
      provider: "gemini",
      message: "The model returned no text.",
    };
  return { ok: true, provider: "gemini", model: GEMINI_MODEL, text };
}

export async function complete(req: CompleteRequest): Promise<CompleteResult> {
  if (!req.messages.some((m) => m.role === "user")) {
    throw new Error("complete() needs at least one user message");
  }
  let provider: LlmProviderId | null;
  try {
    provider = llmProvider();
  } catch (error) {
    return { ok: false, reason: "not_configured", message: (error as Error).message };
  }
  if (provider === null) {
    return {
      ok: false,
      reason: "not_configured",
      message: "No model provider is configured in this environment.",
    };
  }
  try {
    return provider === "xai" ? await completeXai(req) : await completeGemini(req);
  } catch (error) {
    return { ok: false, reason: "provider_error", provider, message: (error as Error).message };
  }
}
