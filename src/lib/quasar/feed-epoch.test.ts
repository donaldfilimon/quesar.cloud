import { expect, it } from "vitest";
import { applyEventPage } from "./connection";
import { applyEventPage as serviceApply } from "../../../sidecars/quasar-service/shared/connection";

for (const apply of [applyEventPage, serviceApply]) {
  it("replaces equal/larger replacement feeds by epoch rather than length", () => {
    const current = { events: ["old"], next: 1, epoch: "old" };
    expect(apply(current, 1, { events: ["new"], next: 1, epoch: "new" })).toEqual({
      events: ["new"],
      next: 1,
      epoch: "new",
    });
    expect(apply(current, 1, { events: ["new", "done"], next: 2, epoch: "new" })).toEqual({
      events: ["new", "done"],
      next: 2,
      epoch: "new",
    });
    expect(apply(current, 0, { events: ["stale"], next: 1, epoch: "stale" })).toBe(current);
  });
}
