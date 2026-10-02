import { describe, expect, it } from "vitest";
import { contactSearch, readReceipts, receiptLabel, submitContact } from "./contact-context";
describe("contact context and delivery evidence", () => {
  it("accepts exact catalog services and ignores unknown or malformed input", () => {
    expect(contactSearch({ service: "WDBX Retrieval Architecture" })).toEqual({
      service: "WDBX Retrieval Architecture",
    });
    for (const service of [
      "wdbx retrieval architecture",
      "Unknown",
      ["Private AI Deployment"],
      null,
    ])
      expect(contactSearch({ service })).toEqual({});
  });
  it("keeps drafts and accepted inquiries distinct and never promotes legacy copies", () => {
    const copy = {
      id: "one",
      name: "Donald",
      email: "test@example.com",
      topic: "Services",
      message: "A project",
      created: 1,
    };
    expect(
      readReceipts([
        copy,
        { ...copy, delivery: "draft" },
        { ...copy, delivery: "accepted" },
        { ...copy, delivery: "sent" },
      ]).map((item) => item.delivery),
    ).toEqual(["unknown", "draft", "accepted", "unknown"]);
    expect(receiptLabel("draft")).toContain("unconfirmed");
    expect(receiptLabel("accepted")).toContain("accepted");
    expect(readReceipts([null, { id: "bad" }, { ...copy, created: 1e100 }])).toEqual([]);
  });
});

describe("failed submission", () => {
  it("returns an error and preserves all editable fields on rejection or transport failure", async () => {
    const fields = {
      name: "Donald",
      email: "test@example.com",
      topic: "Services",
      message: "Service: Private AI Deployment\n\nKeep my project requirements.",
    };
    const original = { ...fields };
    const rejected = await submitContact(fields, async () => ({
      ok: false,
      code: "invalid",
      error: "Try a different email.",
    }));
    expect(rejected).toEqual({ ok: false, code: "invalid", error: "Try a different email." });
    expect(fields).toEqual(original);
    const unavailable = await submitContact(fields, async () => {
      throw new Error("Offline");
    });
    expect(unavailable).toMatchObject({ ok: false, code: "unavailable" });
    expect(fields).toEqual(original);
  });
});
