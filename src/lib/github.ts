import { createServerFn } from "@tanstack/react-start";
import { staticSite } from "./static-site";
import type { GithubPayload } from "./github-data";
export type { GithubPayload, LiveRepo, ReadmeCard, EventItem, Freshness } from "./github-data";

export const loadGithub = createServerFn({ method: "GET" })
  .validator((value: unknown) => value === true)
  .handler(async ({ data }): Promise<GithubPayload> =>
    (await import("./github-data")).fetchGithubPayload(data),
  );

/** Keep the network/parser implementation out of the initial route payload. */
export function loadGithubData(force = false): Promise<GithubPayload> {
  return staticSite
    ? import("./github-data").then((module) => module.fetchGithubPayload(force))
    : loadGithub({ data: force });
}
