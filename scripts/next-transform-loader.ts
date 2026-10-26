/**
 * webpack loader for the Next.js build (`next.config.ts`, `enforce: "pre"`), so it
 * sees the TypeScript source before SWC. See ./next-transform.ts for what it does.
 */
import { moduleIdFor, transformGlobs, transformServerFns } from "./next-transform.ts";

interface LoaderContext {
  resourcePath: string;
  rootContext: string;
  getOptions(): { target: "client" | "server" };
  addContextDependency(dir: string): void;
}

export default function nextTransformLoader(this: LoaderContext, code: string): string {
  const { target } = this.getOptions();
  const id = moduleIdFor(this.rootContext, this.resourcePath);
  let out = transformServerFns(code, id, target) ?? code;
  if (target === "server")
    out = transformGlobs(out, this.rootContext, (dir) => this.addContextDependency(dir)) ?? out;
  return out;
}
