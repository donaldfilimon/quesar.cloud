import { afterEach, expect, it, vi } from "vitest";
import { acceptanceTarget } from "../e2e/backend/guard";
afterEach(() => vi.unstubAllEnvs());
it("requires opt-in even for the disposable server", () => {
  vi.stubEnv("QUESAR_BACKEND_ACCEPTANCE", "");
  vi.stubEnv("QUESAR_ACCEPTANCE_ADMIN_URL", "postgresql://127.0.0.1:55471/postgres");
  expect(acceptanceTarget).toThrow("QUESAR_BACKEND_ACCEPTANCE=1");
});
it.each([
  "postgresql://example.com:55471/postgres",
  "postgresql://127.0.0.1:5432/postgres",
  "postgresql://127.0.0.1:55471/quesar_acceptance",
  "postgresql://127.0.0.1:55471/postgres?host=remote.example",
  "postgresql://fixture:password@127.0.0.1:55471/postgres",
])("refuses an unintended target", (url) => {
  vi.stubEnv("QUESAR_BACKEND_ACCEPTANCE", "1");
  vi.stubEnv("QUESAR_ACCEPTANCE_ADMIN_URL", url);
  expect(acceptanceTarget).toThrow("Acceptance requires");
});
it("accepts the explicit loopback admin database", () => {
  vi.stubEnv("QUESAR_BACKEND_ACCEPTANCE", "1");
  vi.stubEnv("QUESAR_ACCEPTANCE_ADMIN_URL", "postgresql://127.0.0.1:55471/postgres");
  expect(acceptanceTarget().port).toBe("55471");
});
