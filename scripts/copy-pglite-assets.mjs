import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, ".vercel/output/functions/__server.func/_libs");
if (!existsSync(dest)) process.exit(0);
mkdirSync(dest, { recursive: true });
const src = join(root, "node_modules/@electric-sql/pglite/dist");
for (const file of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  copyFileSync(join(src, file), join(dest, file));
}
