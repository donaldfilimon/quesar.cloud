/**
 * `bun run check:research-drift`: how far the source trees have moved since
 * the research records were pinned. Reports only; it never fails the gate,
 * because a pin is a dated review, not a claim about today's tree. A large
 * count is the prompt to re-review, not a defect.
 *
 * Reads sibling checkouts (`../abi`, `../wdbx`); a missing checkout (for
 * example a cloud session) is reported as unmeasured, never as zero.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const files = [
  "src/lib/mlai/categories/research-records.ts",
  "src/lib/mlai/categories/research-context.ts",
];
const pins = new Map<string, Set<string>>();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [, repo, sha] of text.matchAll(
    /github\.com\/donaldfilimon\/([a-z0-9.-]+)\/(?:blob|tree)\/([0-9a-f]{7,40})/g,
  )) {
    pins.set(repo, (pins.get(repo) ?? new Set()).add(sha));
  }
}

for (const [repo, shas] of pins) {
  const dir = resolve("..", repo);
  for (const sha of shas) {
    const label = `${repo}@${sha.slice(0, 9)}`;
    if (!existsSync(join(dir, ".git"))) {
      console.log(`${label}: unmeasured (no checkout at ${dir})`);
      continue;
    }
    try {
      const git = (...args: string[]) =>
        execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
      const behind = git("rev-list", "--count", `${sha}..origin/main`);
      const pinned = git("show", "-s", "--format=%cs", sha);
      console.log(`${label} (${pinned}): ${behind} commits behind origin/main`);
    } catch {
      console.log(`${label}: unmeasured (commit or origin/main not in ${dir}; try git fetch)`);
    }
  }
}
