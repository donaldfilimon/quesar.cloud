import { expect, it } from "vitest";
import { staticPrerenderPath } from "./static-prerender-path.ts";

it("prerenders canonical pages without overwriting them with client search or fragment state", () => {
  for (const path of ["/", "/contact", "/services", "/login", "/console", "/docs", "/feed.xml"])
    expect(staticPrerenderPath(path)).toBe(true);
  for (const path of [
    "/contact?service=Private+AI+Deployment",
    "/contact?service=Autonomy+Readiness+Audit",
    "/contact?service=Unknown",
    "/login?next=%2Fconsole",
    "/console?node=quesar",
    "/docs#ref-runtime",
    "/media/film.mp4",
    "/api/auth/ok",
    "/_serverFn/fixture",
  ])
    expect(staticPrerenderPath(path)).toBe(false);
});
