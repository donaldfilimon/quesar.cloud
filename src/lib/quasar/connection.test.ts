// Ported from mlai `apps/quasar/packages/shared/src/connection.test.ts` at b6f3686 (bun:test -> vitest).
import { expect, test } from "vitest";
import {
  Connection,
  DEFAULT_ORIGIN,
  normalizeOrigin,
  applyEventPage,
  assertMatchingJob,
} from "./connection";
const storage = (value: string | null = null) => ({
  getItem: async () => value,
  setItem: async (_: string, next: string) => {
    value = next;
  },
});
const stub = (fn: (...args: Parameters<typeof fetch>) => Promise<Response>) => fn as typeof fetch;
test("strict normalized origins", () => {
  expect(normalizeOrigin(" http://localhost:4700/ ")).toBe(DEFAULT_ORIGIN);
  for (const v of [
    "bad",
    "http:host",
    "ftp://host",
    "http://user:pass@host",
    "http://@host",
    "http://host/path",
    "http://host/foo/..",
    "http://host?",
    "http://host#",
    "http://host\\path",
  ])
    expect(() => normalizeOrigin(v)).toThrow();
});
test("hydration precedes requests and persistence survives recreation", async () => {
  let release!: (value: string) => void;
  const calls: string[] = [];
  const saved = storage();
  const client = new Connection(
    {
      ...saved,
      getItem: (key) =>
        key !== "quasar.serviceOrigin"
          ? Promise.resolve(null)
          : new Promise((resolve) => {
              release = resolve;
            }),
    },
    stub(async (url) => {
      calls.push(String(url));
      return Response.json([]);
    }),
  );
  const pending = client.request("/api/sites");
  expect(calls).toEqual([]);
  release("http://lan:4700/");
  await pending;
  expect(calls).toEqual(["http://lan:4700/api/sites"]);
  await client.save("https://other.test/");
  const reopened = new Connection(saved);
  await reopened.hydrate();
  expect(reopened.origin).toBe("https://other.test");
});
test("storage failure preserves current origin", async () => {
  const client = new Connection({
    getItem: async () => null,
    setItem: async () => {
      throw Error("disk");
    },
  });
  await expect(client.save("http://other")).rejects.toThrow("disk");
  expect(client.origin).toBe(DEFAULT_ORIGIN);
});
test("timeouts and cancellation bound an uncooperative transport", async () => {
  const client = new Connection(
    storage(),
    stub(async () => new Promise(() => {})),
  );
  await expect(client.request("/api/sites", {}, 5)).rejects.toThrow("timed out");
  const controller = new AbortController();
  const cancelled = client.request("/api/sites", { signal: controller.signal });
  controller.abort();
  await expect(cancelled).rejects.toThrow("cancelled");
  const old = client.request("/api/sites");
  await client.save("http://new:4700");
  await expect(old).rejects.toThrow("cancelled");
});
test("synchronous double-action guard and explicit recovery after uncertain outcome", async () => {
  let calls = 0;
  let fail!: (error: Error) => void;
  const client = new Connection(storage());
  await client.hydrate();
  const first = client.mutate("site", () => {
    calls++;
    return new Promise((_, reject) => {
      fail = reject;
    });
  });
  await expect(
    client.mutate("site", async () => {
      calls++;
    }),
  ).rejects.toThrow("pending");
  fail(Error("disconnected"));
  await expect(first).rejects.toThrow("disconnected");
  await expect(
    client.mutate("site", async () => {
      calls++;
    }),
  ).rejects.toThrow("uncertain");
  await expect(
    client.recover(async () => {
      throw Error("offline");
    }),
  ).rejects.toThrow("offline");
  await expect(
    client.mutate("site", async () => {
      calls++;
    }),
  ).rejects.toThrow("uncertain");
  await client.recover(async (id) => {
    expect(id).toBe("site");
  });
  await client.mutate("site", async () => {
    calls++;
  });
  expect(calls).toBe(2);
});
test("a job transition between site and event reads keeps recovery uncertain", async () => {
  const client = new Connection(storage());
  await expect(
    client.mutate("site", async () => {
      throw Error("disconnected");
    }),
  ).rejects.toThrow("disconnected");
  await expect(
    client.recover(async () => assertMatchingJob("previous", "replacement")),
  ).rejects.toThrow("Job changed");
  expect(client.isUncertain()).toBe(true);
  await expect(client.mutate("site", async () => {})).rejects.toThrow("uncertain");
  await client.recover(async () => assertMatchingJob("replacement", "replacement"));
  expect(client.isUncertain()).toBe(false);
});
test("cursor catchup excludes duplicate pages and handles a restarted buffer", () => {
  const page = { events: ["a", "b"], next: 2 };
  const first = applyEventPage({ events: [] as string[], next: 0 }, 0, page);
  expect(applyEventPage(first, 0, page)).toBe(first);
  expect(applyEventPage(first, 2, { events: ["done"], next: 3 }).events).toEqual([
    "a",
    "b",
    "done",
  ]);
  expect(applyEventPage(first, 2, { events: [], next: 0 })).toEqual({ events: [], next: 0 });
});
test("exclusive retries cannot clear uncertainty from a later failed mutation", async () => {
  const client = new Connection(storage());
  await expect(
    client.mutate("old", async () => {
      throw Error("first disconnect");
    }),
  ).rejects.toThrow("disconnect");
  let finish!: () => void;
  const read = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const firstRetry = client.recover(async (id) => {
    expect(id).toBe("old");
    await read;
  });
  await expect(client.recover(async () => {})).rejects.toThrow("pending");
  await expect(client.mutate("new", async () => {})).rejects.toThrow("pending");
  finish();
  await firstRetry;
  await expect(
    client.mutate("new", async () => {
      throw Error("second disconnect");
    }),
  ).rejects.toThrow("disconnect");
  await expect(client.mutate("new", async () => {})).rejects.toThrow("uncertain");
  await expect(
    client.recover(async () => {
      throw Error("read failed");
    }),
  ).rejects.toThrow("read failed");
  await client.recover(async (id) => {
    expect(id).toBe("new");
  });
  await client.mutate("new", async () => {});
});
test("read-only recovery excludes mutations and releases on origin change", async () => {
  const client = new Connection(storage());
  let finish!: () => void;
  const read = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const retry = client.recover(async () => {
    await read;
  });
  await expect(client.mutate("site", async () => {})).rejects.toThrow("pending");
  await client.save("http://changed:4700");
  finish();
  await expect(retry).rejects.toThrow("Server changed");
  await client.mutate("site", async () => {});
});
test("fetch receives its browser global receiver rather than the Connection instance", async () => {
  const nativeLikeFetch = function (this: unknown, input: RequestInfo | URL): Promise<Response> {
    expect(this).toBe(globalThis);
    expect(String(input)).toBe(`${DEFAULT_ORIGIN}/api/sites`);
    return Promise.resolve(Response.json([]));
  } as typeof fetch;
  const client = new Connection(storage(), nativeLikeFetch);
  expect(await client.request<unknown[]>("/api/sites")).toEqual([]);
});

test("request preserves every HeadersInit form and an explicit body content type", async () => {
  const forms: HeadersInit[] = [
    { "x-request-id": "test", "Content-Type": "text/plain" },
    new Headers({ "x-request-id": "test", "Content-Type": "text/plain" }),
    [
      ["x-request-id", "test"],
      ["Content-Type", "text/plain"],
    ],
  ];
  for (const headers of forms) {
    const client = new Connection(
      storage(),
      stub(async (_url, init) => {
        const received = new Headers(init?.headers);
        expect(received.get("x-request-id")).toBe("test");
        expect(received.get("content-type")).toBe("text/plain");
        return Response.json({ ok: true });
      }),
    );
    await client.request("/api/sites", { method: "POST", headers, body: "payload" });
  }
  const client = new Connection(
    storage(),
    stub(async (_url, init) => {
      expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
      return Response.json({ ok: true });
    }),
  );
  await client.request("/api/sites", { method: "POST", body: "{}" });
});

test("pairing credentials stay scoped to the exact origin, survive cold load, and clear explicitly", async () => {
  const values = new Map<string, string>();
  const saved = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  const calls: { url: string; authorization: string | null; redirect?: RequestRedirect }[] = [];
  const transport = stub(async (url, init) => {
    calls.push({
      url: String(url),
      authorization: new Headers(init?.headers).get("authorization"),
      redirect: init?.redirect,
    });
    return Response.json([]);
  });
  const client = new Connection(saved, transport);
  await client.saveCredential("a".repeat(43));
  await client.request("/api/sites");
  await client.save("http://127.0.0.1:4700");
  await client.request("/api/sites");
  expect(calls[0]?.authorization).toBe(`Bearer ${"a".repeat(43)}`);
  expect(calls[1]?.authorization).toBeNull();
  await client.save(DEFAULT_ORIGIN);
  const cold = new Connection(saved, transport);
  expect(await cold.hasCredential()).toBe(true);
  await cold.request("/api/sites");
  expect(calls[2]?.authorization).toBe(calls[0]?.authorization);
  expect(calls.every((call) => call.redirect === "error")).toBe(true);
  expect(calls.every((call) => !call.url.includes("aaa"))).toBe(true);
  await cold.clearCredential();
  expect(await cold.hasCredential()).toBe(false);
  await cold.request("/api/sites");
  expect(calls[3]?.authorization).toBeNull();
  await expect(cold.request("//evil.example/steal")).rejects.toThrow("Invalid service API path");
});

test("pairing credentials are origin-scoped, clearable and never transmitted over remote HTTP", async () => {
  const values = new Map<string, string>();
  const saved = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  const sent: string[] = [];
  const client = new Connection(
    saved,
    stub(async (_url, init) => {
      sent.push(new Headers(init?.headers).get("authorization") ?? "");
      return Response.json([]);
    }),
  );
  const token = "s".repeat(43);
  await client.save("https://one.example");
  await client.saveCredential(token);
  await client.request("/api/sites");
  expect(sent.pop()).toBe(`Bearer ${token}`);
  await client.save("https://two.example");
  expect(await client.hasCredential()).toBe(false);
  await client.request("/api/sites");
  expect(sent.pop()).toBe("");
  await client.save("https://one.example");
  await client.clearCredential();
  expect(await client.hasCredential()).toBe(false);
  await client.save("http://remote.example");
  await expect(client.saveCredential(token)).rejects.toThrow("HTTPS");
  values.set("quasar.pairing:http://remote.example", token);
  await expect(client.request("/api/sites")).rejects.toThrow("HTTPS");
  expect(sent).toEqual([]);
  for (const origin of ["http://localhost:4700", "http://127.0.0.1:4700", "http://[::1]:4700"]) {
    await client.save(origin);
    await client.saveCredential(token);
    expect(await client.hasCredential()).toBe(true);
  }
});
