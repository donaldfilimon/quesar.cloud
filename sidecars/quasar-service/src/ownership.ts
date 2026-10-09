import { mkdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";

// Kernel-owned loopback reservation, not a stale PID file. Crash releases it.
// Hash collisions refuse conservatively. Supported only for single-host homes;
// sharing QUASAR_HOME across hosts/filesystems is not supported.
export function ownHome(home: string): () => void {
  mkdirSync(home, { recursive: true });
  const canonical = realpathSync(home);
  const port = 20000 + createHash("sha256").update(canonical).digest().readUInt32BE(0) % 20000;
  let release: () => void;
  try {
    const listener = Bun.listen({ hostname: "127.0.0.1", port, socket: { data(socket) { socket.end(); } } });
    release = () => listener.stop(true);
  } catch {
    throw new Error("QUASAR_HOME ownership unavailable (active owner or reservation collision)");
  }
  return release;
}
