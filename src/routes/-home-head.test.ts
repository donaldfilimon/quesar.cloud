import { expect, it } from "vitest";
import { Route } from "./index";

it("home head leaves the Organization to the site-wide graph", () => {
  const head = Route.options.head!({} as never) as { scripts?: unknown[] };
  expect(head.scripts ?? []).toEqual([]);
});
