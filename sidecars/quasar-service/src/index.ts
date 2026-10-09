import { networkPolicy } from "./security";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "./server";
import { PreviewManager } from "./preview";
import { runGeneration, type EngineClient } from "./engine";

const home = process.env.QUASAR_HOME ?? path.join(os.homedir(), ".quasar");
const templateDir = fileURLToPath(new URL("../templates/next-site", import.meta.url));
const preview = new PreviewManager();
const policy = networkPolicy(process.env);
const server = createServer({ ...policy, previewDomain: process.env.QUASAR_PREVIEW_DOMAIN, allowNetwork: process.env.QUASAR_ALLOW_NETWORK === "true", pairingToken: process.env.QUASAR_PAIRING_TOKEN, home, templateDir, engine: runGeneration, makeClient: () => new Anthropic({ maxRetries: 0, timeout: 60_000 }) as unknown as EngineClient, preview, scaffoldInstall: true, port: Number(process.env.PORT ?? 4700) });
console.log(`quasar service listening on ${policy.hostname}:${server.port}; pairing credential: ${path.join(home, "pairing-token")} (or QUASAR_PAIRING_TOKEN override)`);
let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  // Forced process termination, not early ownership release. A still-generating
  // durable row is recovered as interrupted at the next exclusively owned start.
  const deadline = setTimeout(() => { console.error("quasar: shutdown drain deadline exceeded; unfinished jobs require restart recovery"); process.exit(1); }, 15_000);
  try { await server.shutdown(); clearTimeout(deadline); process.exit(0); }
  catch { console.error("quasar: shutdown failed; refusing unsafe ownership release"); process.exitCode = 1; }
};
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
