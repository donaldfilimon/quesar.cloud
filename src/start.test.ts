import { describe, expect, it } from "vitest";
import { startInstance } from "./start";

/** Start's own marker (`csrfSymbol` in @tanstack/start-client-core). */
const CSRF = Symbol.for("tanstack-start:csrf-middleware");

describe("start instance", () => {
  it("keeps Start's CSRF middleware first, since this file replaces the default", async () => {
    const options = await startInstance.getOptions();
    const middleware = options.requestMiddleware ?? [];
    expect(middleware.length).toBe(2);
    expect(CSRF in (middleware[0] as object)).toBe(true);
    expect(CSRF in (middleware[1] as object)).toBe(false);
  });
});
