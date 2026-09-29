import type { Plugin } from "vite";
import { captureGithubSnapshot } from "../src/lib/github-data.ts";

/**
 * Captures the GitHub panels' data once per static build and emits it as a
 * JSON asset (`virtual:github-snapshot-url`). On GitHub Pages every visitor's
 * browser calls GitHub directly, unauthenticated, at 60 requests an hour per
 * IP; the snapshot gives each panel something to show when those calls fail,
 * labelled with its capture time (`withSnapshot` in src/lib/github-data.ts).
 *
 * Only the static build captures: the server build fetches server-side, and
 * dev and non-client environments get `null`. No network at build time also
 * yields `null`, which is exactly the behavior without a snapshot. Set
 * GITHUB_TOKEN to raise the build's own rate limit; it is never required and
 * never reaches the output.
 */
export function githubSnapshotPlugin({ enabled }: { enabled: boolean }): Plugin {
  const id = "\0quesar:github-snapshot-url";
  let dev = false;
  let capture: Promise<string | null> | undefined;

  const authorized: typeof fetch = (input, init) => {
    const token = process.env.GITHUB_TOKEN;
    const url = String(input instanceof Request ? input.url : input);
    if (!token || !url.startsWith("https://api.github.com/")) return fetch(input, init);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  return {
    name: "quesar:github-snapshot",
    configResolved(config) {
      dev = config.command === "serve";
    },
    resolveId(source) {
      if (source === "virtual:github-snapshot-url") return id;
    },
    async load(source) {
      if (source !== id) return;
      if (!enabled || dev || this.environment.name !== "client") return "export default null;";
      capture ??= captureGithubSnapshot(authorized).then((payload) => {
        console.info(
          payload
            ? `[github-snapshot] captured ${payload.repos.length} repos, ${payload.readmes.length} READMEs`
            : "[github-snapshot] GitHub did not answer; building without a snapshot",
        );
        return payload && JSON.stringify(payload);
      });
      const json = await capture;
      if (!json) return "export default null;";
      const ref = this.emitFile({ type: "asset", name: "github-snapshot.json", source: json });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
}
