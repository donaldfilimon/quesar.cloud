import { afterEach, describe, expect, it, vi } from "vitest";
import { createGithubLoader } from "./github-data";

const repo = { name: "abi", html_url: "https://github.com/donaldfilimon/abi", stargazers_count: 2 };
function fixture(url: string | URL | Request) {
  const value = String(url);
  return Promise.resolve(
    value.includes("/repos?")
      ? Response.json([repo])
      : value.includes("/events/")
        ? Response.json([])
        : new Response("# ABI\nA useful public runtime."),
  );
}
afterEach(() => vi.useRealTimers());

describe("GitHub section recovery", () => {
  it("retains repositories when optional endpoints fail", async () => {
    const fetcher = vi.fn((url: string | URL | Request) =>
      String(url).includes("/repos?")
        ? fixture(url)
        : Promise.resolve(new Response("", { status: 503 })),
    );
    const data = await createGithubLoader(fetcher)();
    expect(data.repos[0].name).toBe("abi");
    expect(data.sections.repos.state).toBe("fresh");
    expect(data.sections.events.state).toBe("unavailable");
    expect(data.sections.readmes.state).toBe("unavailable");
  });
  it("shares concurrent requests and caches successful sections for five minutes", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(fixture);
    const load = createGithubLoader(fetcher);
    const first = load();
    expect(load(true)).toBe(first);
    await first;
    const count = fetcher.mock.calls.length;
    await load();
    expect(fetcher).toHaveBeenCalledTimes(count);
    await vi.advanceTimersByTimeAsync(300001);
    await load();
    expect(fetcher).toHaveBeenCalledTimes(count * 2);
  });
  it("retains section timestamps and stale data on failure, with a retry cooldown", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(fixture);
    const load = createGithubLoader(fetcher);
    const fresh = await load();
    fetcher.mockImplementation(() => Promise.reject(new Error("offline")));
    await vi.advanceTimersByTimeAsync(300001);
    const stale = await load();
    expect(stale.repos).toEqual(fresh.repos);
    expect(stale.sections.repos).toEqual({
      state: "stale",
      fetchedAt: fresh.sections.repos.fetchedAt,
    });
    const count = fetcher.mock.calls.length;
    await load();
    expect(fetcher).toHaveBeenCalledTimes(count);
    await load(true);
    expect(fetcher).toHaveBeenCalledTimes(count + 9);
    await vi.advanceTimersByTimeAsync(30001);
    await load();
    expect(fetcher).toHaveBeenCalledTimes(count + 18);
  });
  it("bounds even an unresponsive request at ten seconds", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    const result = createGithubLoader(fetcher)();
    await vi.advanceTimersByTimeAsync(10000);
    expect((await result).sections.repos.state).toBe("unavailable");
    expect(fetcher.mock.calls).toHaveLength(9);
  });
  it("rejects malformed payloads while accepting an empty activity feed", async () => {
    const data = await createGithubLoader((url) =>
      String(url).includes("/repos?")
        ? Promise.resolve(Response.json({ unexpected: "shape" }))
        : fixture(url),
    )();
    expect(data.sections.repos.state).toBe("unavailable");
    expect(data.sections.events.state).toBe("fresh");
    expect(data.sections.readmes.state).toBe("fresh");
  });
  it("retains individual README excerpts during partial failure", async () => {
    const fetcher = vi.fn(fixture);
    const load = createGithubLoader(fetcher);
    const first = await load();
    fetcher.mockImplementation((url) =>
      String(url).includes("/abi/main/") ? Promise.reject(new Error("offline")) : fixture(url),
    );
    const partial = await load(true);
    expect(partial.readmes).toEqual(first.readmes);
    expect(partial.sections.readmes.state).toBe("stale");
  });
});
