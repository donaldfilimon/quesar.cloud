import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function htmlFiles(dir: string, skipDirectory?: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === skipDirectory ? [] : htmlFiles(path, skipDirectory);
    }
    return name.endsWith(".html") ? [path] : [];
  });
}
