import type { ChildProcess } from "node:child_process";

function exited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function within(exit: Promise<void>, timeoutMs: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      exit.then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Only accepts an owned spawn handle; never signals an arbitrary PID or process group. */
export async function stopOwnedChild(child: ChildProcess, timeoutMs = 5_000): Promise<void> {
  // Spawn failure has no PID; a signal exit leaves exitCode null permanently.
  if (!child.pid || exited(child)) return;
  let onExit!: () => void;
  const exit = new Promise<void>((resolve) => {
    onExit = resolve;
    child.once("exit", onExit);
  });
  try {
    // Subscribe before sending either signal. A failed kill still gets a bounded
    // wait: the OS process may have exited before Node delivered its exit event.
    try {
      child.kill("SIGTERM");
    } catch {
      /* Try the bounded fallback below. */
    }
    if (exited(child) || (await within(exit, timeoutMs))) return;
    try {
      child.kill("SIGKILL");
    } catch {
      /* Report failure after the final bound. */
    }
    if (exited(child) || (await within(exit, timeoutMs))) return;
    throw new Error("Owned acceptance child did not stop within the shutdown deadline.");
  } finally {
    child.off("exit", onExit);
  }
}

/** One failed cleanup must not skip the remaining owned databases or seeded dump. */
export async function cleanupOwnedResources(
  actions: readonly (() => Promise<unknown>)[],
): Promise<void> {
  let failed = 0;
  for (const action of actions) {
    try {
      await action();
    } catch {
      failed += 1;
    }
  }
  if (failed) throw new Error(`Acceptance cleanup failed for ${failed} owned resource(s).`);
}
