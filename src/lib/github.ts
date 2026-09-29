import { createServerFn } from "@tanstack/react-start";
import { staticSite } from "./static-site";
import type { GithubPayload } from "./github-data";
export type { GithubPayload, LiveRepo, ReadmeCard, EventItem, Freshness } from "./github-data";

const loadGithub = createServerFn({ method: "GET" })
  .validator((value: unknown) => value === true)
  .handler(async ({ data }): Promise<GithubPayload> =>
    (await import("./github-data")).fetchGithubPayload(data),
  );

/**
 * Keep the network/parser implementation out of the initial route payload. On
 * the static site the browser calls GitHub itself, and anything it cannot load
 * is filled from the snapshot captured at build time.
 */
export async function loadGithubData(force = false): Promise<GithubPayload> {
  if (!staticSite) return loadGithub({ data: force });
  const [data, snapshot] = await Promise.all([
    import("./github-data"),
    import("./github-snapshot"),
  ]);
  const [live, captured] = await Promise.all([
    data.fetchGithubPayload(force),
    snapshot.loadGithubSnapshot(),
  ]);
  return data.withSnapshot(live, captured);
}
