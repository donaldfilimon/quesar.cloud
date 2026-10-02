import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const probes = vi.hoisted(() => ({
  pool: vi.fn(),
  connect: vi.fn(),
  bootstrap: vi.fn(),
  providers: vi.fn(),
}));
// Keep installed Better Auth and Kysely intact: their actual eager init/schema
// check must reach these driver probes only after explicit getAuth().
vi.mock("pg", () => ({
  Pool: class {
    constructor() {
      probes.pool();
    }
    connect = async () => {
      probes.connect();
      throw new Error("instrumented disposable driver");
    };
  },
}));
vi.mock("../db", () => ({
  getPglite: async () => {
    probes.bootstrap();
    throw new Error("instrumented PGLite bootstrap");
  },
}));
vi.mock("./methods.server", () => ({
  authEnabledOnServer: () => true,
  socialCredentials: () => {
    probes.providers();
    return {};
  },
}));
describe("installed Better Auth lazy initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("imports the real route entry with no provider, pool, bootstrap or signing-secret work", async () => {
    const ref = globalThis as typeof globalThis & { __quesarDevAuthSecret__?: string };
    const before = ref.__quesarDevAuthSecret__;
    await import("../../routes/api/auth/$");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(probes.pool).not.toHaveBeenCalled();
    expect(probes.connect).not.toHaveBeenCalled();
    expect(probes.bootstrap).not.toHaveBeenCalled();
    expect(probes.providers).not.toHaveBeenCalled();
    expect(ref.__quesarDevAuthSecret__).toBe(before);
    const { getAuth } = await import("./server");
    expect(getAuth).toThrow("Runtime configuration is not ready");
    expect(probes.providers).not.toHaveBeenCalled();
  });
  it("runs real installed init/schema connection only after valid production preflight", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/disposable");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
    const { getAuth } = await import("./server");
    expect(probes.pool).not.toHaveBeenCalled();
    const instance = getAuth();
    await instance.$context;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getAuth()).toBe(instance);
    expect(probes.pool).toHaveBeenCalledOnce();
    expect(probes.providers).toHaveBeenCalledOnce();
    expect(probes.connect).toHaveBeenCalled();
  });
  it("starts embedded migrations only when local auth is actually requested", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getAuth } = await import("./server");
    expect(probes.bootstrap).not.toHaveBeenCalled();
    await getAuth().$context;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(probes.bootstrap).toHaveBeenCalled();
  });
});
