import { beforeEach, describe, expect, it, vi } from "vitest";
const calls: string[] = [];
const query = vi.fn(async (sql: string) => {
  calls.push(sql);
  return { rows: [] };
});
const release = vi.fn();
const end = vi.fn();
vi.mock("pg", () => ({
  default: {
    Pool: class {
      connect = async () => ({ query, release });
      end = end;
    },
  },
}));
vi.mock("node:fs/promises", () => ({
  readdir: async () => {
    calls.push("DISCOVER");
    return ["0001_test.sql"];
  },
  readFile: async () => "CREATE TABLE test(id int)",
}));
import { migrate } from "./migrate";
describe("migration locking", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });
  it("locks the same connection before discovery and releases after commit", async () => {
    await migrate("postgres://localhost/disposable");
    expect(calls[0]).toContain("pg_advisory_lock");
    expect(calls[1]).toBe("DISCOVER");
    expect(calls.at(-2)).toBe("COMMIT");
    expect(calls.at(-1)).toContain("pg_advisory_unlock");
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });
  it("rolls back failed migration and releases lock", async () => {
    query
      .mockImplementationOnce(async () => ({ rows: [] }))
      .mockImplementationOnce(async () => ({ rows: [] }))
      .mockImplementationOnce(async () => ({ rows: [] }))
      .mockImplementationOnce(async () => ({ rows: [] }))
      .mockImplementationOnce(async () => {
        throw new Error("failure");
      });
    await expect(migrate("postgres://localhost/disposable")).rejects.toThrow("failure");
    expect(calls).toContain("ROLLBACK");
    expect(calls.at(-1)).toContain("pg_advisory_unlock");
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });
});
