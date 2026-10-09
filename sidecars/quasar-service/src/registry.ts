import path from "node:path";
import crypto from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import type { Site } from "../shared/index";

export async function readRegistry(file: string): Promise<Site[]> {
  try {
    const raw = await readFile(file, "utf8");
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== "string" || typeof row.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || !["idle", "generating", "error"].includes(row.status) || !Array.isArray(row.promptHistory))) throw new Error("Invalid registry; operator repair required");
    if (new Set(rows.map(row => row.id)).size !== rows.length || new Set(rows.map(row => row.slug)).size !== rows.length) throw new Error("Duplicate registry identity; operator repair required");
    return rows as Site[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeRegistry(file: string, sites: Site[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  // Give every call its own temp path. A shared `${file}.tmp` name races
  // under concurrent writers (e.g. two HTTP handlers, or a job-completion
  // write overlapping a request write): the second writer's `rename` fails
  // with ENOENT once the first has already renamed the shared tmp file away.
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(sites, null, 2));
  await rename(tmp, file);
}
