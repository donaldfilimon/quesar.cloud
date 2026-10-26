// The backend acceptance app: the Next.js server build in development mode, in one
// process. `next dev` forks its server into a child that outlives a SIGKILL of the
// CLI and keeps the port, so an owned handle could not stop it; this launcher is the
// process the harness spawns and signals. Only the acceptance harnesses run it.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { acceptanceTarget } from "./guard.ts";

// Loaded untyped: importing `next` here would put Next's global types (a read-only
// NODE_ENV among them) into the root typecheck, which covers e2e/ and src/ tests.
interface NextApp {
  prepare(): Promise<void>;
  getRequestHandler(): (request: IncomingMessage, response: ServerResponse) => Promise<void>;
}
const next = createRequire(import.meta.url)("next") as (options: object) => NextApp;

acceptanceTarget();
const [hostname, rawPort] = process.argv.slice(2);
const port = Number(rawPort);
if (!hostname || !Number.isInteger(port) || port <= 0)
  throw new Error("Usage: node e2e/backend/next-dev-server.ts <hostname> <port>");
if (process.env.QUESAR_NEXT_MODE !== "server" || !process.env.QUESAR_NEXT_DIST)
  throw new Error("The acceptance app needs QUESAR_NEXT_MODE=server and its own QUESAR_NEXT_DIST.");

const app = next({ dev: true, webpack: true, dir: process.cwd(), hostname, port });
const handle = app.getRequestHandler();
await app.prepare();
const server = createServer((request, response) => void handle(request, response));
server.listen(port, hostname, () => console.log(`Listening on: http://${hostname}:${port}/`));
