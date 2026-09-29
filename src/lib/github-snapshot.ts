import snapshotUrl from "virtual:github-snapshot-url";
import { parseSnapshot, type GithubPayload } from "./github-data";

let pending: Promise<GithubPayload | null> | undefined;

/**
 * The GitHub data captured when this static site was built, fetched once per
 * page load from our own origin. Null when the build had no snapshot or the
 * asset cannot be read; the panels then behave as they would without one.
 */
export function loadGithubSnapshot(): Promise<GithubPayload | null> {
  if (!snapshotUrl) return Promise.resolve(null);
  pending ??= fetch(snapshotUrl, { signal: AbortSignal.timeout(10000) })
    .then((response) => (response.ok ? response.json() : null))
    .then(parseSnapshot)
    .catch(() => null);
  return pending;
}
