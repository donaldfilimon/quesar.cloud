import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { afterEach, expect, it } from "vitest";
import { cleanupOwnedResources, stopOwnedChild } from "../e2e/backend/process-cleanup";

const owned = new Set<ChildProcess>();
async function fixture(source = "setInterval(() => {}, 1000)") {
  const child = spawn(process.execPath, ["-e", `${source}; process.stdout.write('ready')`], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  owned.add(child);
  await once(child.stdout!, "data");
  return child;
}
afterEach(async () => {
  // Independent emergency cleanup, even if the helper under test regresses.
  for (const child of owned) {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exit = once(child, "exit");
      child.kill("SIGKILL");
      await exit;
    }
  }
  owned.clear();
});
it("returns immediately for an already signal-terminated owned child", async () => {
  const child = await fixture();
  const exit = once(child, "exit");
  child.kill("SIGTERM");
  await exit;
  expect(child.exitCode).toBeNull();
  expect(child.signalCode).toBe("SIGTERM");
  await stopOwnedChild(child, 100);
  expect(child.listenerCount("exit")).toBe(0);
}, 2_000);
it("returns for an already normally exited owned child", async () => {
  const child = await fixture("setTimeout(() => process.exit(0), 30)");
  await once(child, "exit");
  expect(child.exitCode).toBe(0);
  await stopOwnedChild(child, 100);
}, 2_000);
it("stops a running owned child and observes completion", async () => {
  const child = await fixture();
  await stopOwnedChild(child, 100);
  expect(child.signalCode).toBe("SIGTERM");
  expect(child.listenerCount("exit")).toBe(0);
}, 2_000);
it("force-stops only its owned child when graceful termination is ignored", async () => {
  const child = await fixture("process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)");
  await stopOwnedChild(child, 100);
  expect(child.signalCode).toBe("SIGKILL");
  expect(child.listenerCount("exit")).toBe(0);
}, 2_000);
it("handles a failed spawn with no owned PID", async () => {
  const child = spawn("/nonexistent/quesar-acceptance-process", [], { stdio: "ignore" });
  await new Promise<void>((resolve) => child.once("error", () => resolve()));
  expect(child.pid).toBeUndefined();
  await stopOwnedChild(child, 100);
}, 2_000);
it("attempts remaining cleanup after a resource failure and still reports failure", async () => {
  const attempted: string[] = [];
  await expect(
    cleanupOwnedResources([
      async () => {
        attempted.push("child");
        throw new Error("synthetic stop failure");
      },
      async () => {
        attempted.push("database");
      },
      async () => {
        attempted.push("scratch");
      },
    ]),
  ).rejects.toThrow("1 owned resource");
  expect(attempted).toEqual(["child", "database", "scratch"]);
});
