import path from "node:path";
import { readdir, mkdir, copyFile } from "node:fs/promises";
import { BLOCKED } from "./paths";

async function copyDir(src: string, dest: string, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    signal?.throwIfAborted();
    if (BLOCKED.has(entry.name.toLowerCase())) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, signal);
    } else if (entry.isFile()) {
      await mkdir(dest, { recursive: true });
      signal?.throwIfAborted();
      await copyFile(srcPath, destPath);
    }
  }
}

export async function scaffoldSite(
  templateDir: string,
  siteDir: string,
  opts?: { install?: boolean; signal?: AbortSignal }
): Promise<void> {
  await copyDir(templateDir, siteDir, opts?.signal);
  opts?.signal?.throwIfAborted();

  if (opts?.install) {
    const proc = Bun.spawn(["bun", "install"], {
      cwd: siteDir,
      stdout: "ignore",
      stderr: "pipe",
    });
    const abort = () => proc.kill();
    opts.signal?.addEventListener("abort", abort, { once: true });
    if (opts.signal?.aborted) abort();
    // Drain stderr without retaining potentially unbounded installer output.
    const discard = async () => { for await (const _chunk of proc.stderr) { /* discard */ } };
    let exitCode: number;
    try { [exitCode] = await Promise.all([proc.exited, discard()]); }
    finally { opts.signal?.removeEventListener("abort", abort); }
    opts.signal?.throwIfAborted();
    if (exitCode !== 0) {
      throw new Error(`bun install failed (exit ${exitCode})`);
    }
  }
}
