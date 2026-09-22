import { afterEach, describe, expect, it, vi } from "vitest";
import { complete, status } from "./index";

const GATEWAY = "https://api.cloudflare.com/client/v4/accounts/abc/ai/v1/chat/completions";
const KEYS = [
  "XAI_API_KEY",
  "LLM_PROVIDER",
  "CLOUDFLARE_AI_GATEWAY_URL",
  "CLOUDFLARE_AI_GATEWAY_TOKEN",
  "CLOUDFLARE_AI_GATEWAY_ID",
];

function reply(text: string, statusCode = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: statusCode });
}

const user = [{ role: "user" as const, content: "hi" }];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

describe("llm", () => {
  it("reports not_configured and never invents a reply", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(status()).toEqual({ configured: false, provider: null, model: null });
    const result = await complete({ messages: user });
    expect(result).toMatchObject({ ok: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses xAI when its key is set", async () => {
    process.env.XAI_API_KEY = "k";
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => reply("from grok"));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await complete({ messages: user });
    expect(result).toEqual({ ok: true, provider: "xai", model: "grok-4.5", text: "from grok" });
    expect(String(fetchSpy.mock.calls[0][0])).toContain("api.x.ai");
  });

  it("uses the Gemini gateway when only it is configured, without payload logging", async () => {
    process.env.CLOUDFLARE_AI_GATEWAY_URL = GATEWAY;
    process.env.CLOUDFLARE_AI_GATEWAY_TOKEN = "t";
    process.env.CLOUDFLARE_AI_GATEWAY_ID = "g";
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => reply("from gemini"));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await complete({ messages: [{ role: "system", content: "sys" }, ...user] });
    expect(result).toMatchObject({ ok: true, provider: "gemini", text: "from gemini" });
    const init = fetchSpy.mock.calls[0][1];
    expect((init.headers as Record<string, string>)["cf-aig-collect-log-payload"]).toBe("false");
  });

  it("honors LLM_PROVIDER even when both are configured", async () => {
    process.env.XAI_API_KEY = "k";
    process.env.CLOUDFLARE_AI_GATEWAY_URL = GATEWAY;
    process.env.CLOUDFLARE_AI_GATEWAY_TOKEN = "t";
    process.env.CLOUDFLARE_AI_GATEWAY_ID = "g";
    process.env.LLM_PROVIDER = "gemini";
    expect(status().provider).toBe("gemini");
  });

  it("treats a malformed gateway URL as not configured", async () => {
    process.env.CLOUDFLARE_AI_GATEWAY_URL = "https://evil.example.com/v1";
    process.env.CLOUDFLARE_AI_GATEWAY_TOKEN = "t";
    process.env.CLOUDFLARE_AI_GATEWAY_ID = "g";
    expect(status().configured).toBe(false);
  });

  it("surfaces a provider error instead of a fake answer", async () => {
    process.env.XAI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => reply("", 503)));
    expect(await complete({ messages: user })).toMatchObject({ ok: false, reason: "provider_error", provider: "xai" });
  });
});
