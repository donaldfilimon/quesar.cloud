import { test, expect } from "bun:test";
import { JobScope } from "./job";
import { ownHome } from "./ownership";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("cancel fences admission and drain retains accepted operations", async () => {
  const scope = new JobScope();
  let release!: () => void;
  const operation = scope.accept(() => new Promise<void>(resolve => { release = resolve; }));
  scope.cancel("cancelled");
  await expect(scope.accept(async () => {})).rejects.toBe("cancelled");
  let drained = false;
  const drain = scope.drain().then(() => { drained = true; });
  await Promise.resolve();
  expect(drained).toBe(false);
  release();
  await operation;
  await drain;
  expect(drained).toBe(true);
});

test("kernel reservation refuses same-home second owner and releases", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "quasar-owner-"));
  const release = ownHome(home);
  try { expect(() => ownHome(home)).toThrow("ownership unavailable"); }
  finally { release(); }
  ownHome(home)();
  await rm(home, { recursive: true });
});

test("home ownership excludes a separate process and recovers after crash", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "quasar-cross-process-"));
  const module = new URL("./ownership.ts", import.meta.url).pathname;
  const child = Bun.spawn([process.execPath, "-e", `import {ownHome} from ${JSON.stringify(module)};ownHome(${JSON.stringify(home)});console.log('ready');setInterval(()=>{},1000);`], { stdout: "pipe", stderr: "ignore" });
  try {
    const reader = child.stdout.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain("ready");
    expect(() => ownHome(home)).toThrow("ownership unavailable");
    child.kill("SIGKILL");
    await child.exited;
    reader.releaseLock();
    ownHome(home)();
  } finally {
    child.kill();
    await child.exited;
    await rm(home, { recursive: true });
  }
});
