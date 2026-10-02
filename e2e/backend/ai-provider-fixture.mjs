// Loaded only in the explicitly opted-in acceptance child, never imported by app code.
import { appendFileSync } from "node:fs";
import { acceptanceTarget } from "./guard.ts";
acceptanceTarget();
if (!process.env.QUESAR_AI_FIXTURE_LOG || process.env.XAI_API_KEY !== "synthetic-fixture-only") {
  throw new Error("Synthetic provider interceptor requires its owned test child environment");
}
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.href === "https://api.x.ai/v1/chat/completions") {
    const body = JSON.parse(init.body);
    appendFileSync(process.env.QUESAR_AI_FIXTURE_LOG, JSON.stringify(body) + "\n");
    const content = JSON.stringify(body.messages);
    if (content.includes("FIXTURE_PROVIDER_ERROR"))
      return new Response("synthetic error", { status: 503 });
    if (content.includes("FIXTURE_TIMEOUT"))
      throw new DOMException("Synthetic timeout", "TimeoutError");
    if (content.includes("FIXTURE_DELAY"))
      await new Promise((resolve) => setTimeout(resolve, 1000));
    return Response.json({
      choices: [{ message: { content: "Synthetic provider reply; local acceptance only." } }],
    });
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("External fetch blocked in AI acceptance child");
  return original(input, init);
};
