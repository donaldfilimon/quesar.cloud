import { expect, it } from "vitest";
import { applyEventPage } from "./connection";
import { EventPage } from "./index";
import { EventPage as ServiceEventPage } from "../../../sidecars/quasar-service/shared/index";
import { applyEventPage as serviceApply } from "../../../sidecars/quasar-service/shared/connection";

for (const apply of [applyEventPage, serviceApply]) {
  for (const count of [1, 2, 3]) {
    it(`replaces a feed with ${count} events from the previous cursor of 2`, () => {
      const current = { events: ["old", "old done"], next: 2, epoch: "old" };
      const events = Array.from({ length: count }, (_, i) => `new ${i}`);
      expect(apply(current, 2, { events, next: count, epoch: "new" }, "old")).toEqual({
        events,
        next: count,
        epoch: "new",
      });
    });
  }
  it("rejects late responses from obsolete epochs even at an equal offset", () => {
    const current = { events: ["new"], next: 1, epoch: "new" };
    expect(apply(current, 1, { events: ["old"], next: 1, epoch: "old" }, "old")).toBe(current);
    expect(
      apply(current, 1, { events: ["older replacement"], next: 1, epoch: "older" }, "old"),
    ).toBe(current);
    expect(apply(current, 0, { events: [], next: 1, epoch: "new" }, "new")).toBe(current);
  });
  it("appends only within the requested epoch", () => {
    const current = { events: ["a"], next: 1, epoch: "same" };
    expect(apply(current, 1, { events: ["b"], next: 2, epoch: "same" }, "same")).toEqual({
      events: ["a", "b"],
      next: 2,
      epoch: "same",
    });
  });
}

for (const schema of [EventPage, ServiceEventPage]) {
  it("validates epoch and cursor on the wire", () => {
    const page = {
      events: [{ type: "done" }],
      next: 1,
      epoch: "00000000-0000-4000-8000-000000000001",
    };
    expect(schema.safeParse(page).success).toBe(true);
    for (const bad of [
      { ...page, epoch: undefined },
      { ...page, epoch: "" },
      { ...page, next: -1 },
      { ...page, next: 0.5 },
      { ...page, next: 0 },
      { ...page, next: Number.MAX_SAFE_INTEGER + 1 },
      { ...page, events: [{ type: "unknown" }] },
    ]) {
      expect(schema.safeParse(bad).success).toBe(false);
    }
  });
}
