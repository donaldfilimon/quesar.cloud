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
const server = createServer({ ...policy, previewDomain: process.env.QUASAR_PREVIEW_DOMAIN, allowNetwork: process.env.QUASAR_ALLOW_NETWORK === "true", pairingToken: process.env.QUASAR_PAIRING_TOKEN, home, templateDir, engine: runGeneration, makeClient: () => new Anthropic() as unknown as EngineClient, preview, scaffoldInstall: true, port: Number(process.env.PORT ?? 4700) });
console.log(`quasar service listening on ${policy.hostname}:${server.port}; pairing credential: ${path.join(home, "pairing-token")} (or QUASAR_PAIRING_TOKEN override)`);
const shutdown = async () => { await preview.stopAll(); process.exit(0); };
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
