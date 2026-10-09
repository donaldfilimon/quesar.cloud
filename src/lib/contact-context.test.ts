import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contactSearch,
  contactOutcomeMessage,
  readReceipts,
  receiptLabel,
  saveContactReceipt,
  submitContact,
} from "./contact-context";
import { writeStore } from "./local-store";

afterEach(() => vi.unstubAllGlobals());
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

it.each(["draft", "accepted"] as const)(
  "preserves %s evidence when local receipt storage throws",
  (delivery) => {
    const setItem = vi.fn(() => {
      throw new Error("Storage denied");
    });
    vi.stubGlobal("window", { localStorage: { setItem } });
    const receipt = {
      id: "synthetic-receipt",
      name: "Fixture",
      email: "fixture@example.invalid",
      topic: "Quesar",
      message: "Synthetic inquiry",
      created: 1,
      delivery,
    };
    const result = saveContactReceipt(receipt, [], (receipts) =>
      writeStore("mlai-inquiries", receipts),
    );
    expect(setItem).toHaveBeenCalledOnce();
    expect(result).toEqual({ receipts: [receipt], persisted: false, status: "done" });
    const notice = contactOutcomeMessage(delivery, result.persisted);
    expect(notice).toContain(
      delivery === "draft" ? "Delivery is unconfirmed" : "Inquiry accepted by the site",
    );
    expect(notice).toContain("could not be saved");
    expect(notice).not.toContain("Sending");
  },
);

it("keeps bounded device receipts when storage succeeds", () => {
  const receipt = {
    id: "one",
    name: "Fixture",
    email: "fixture@example.invalid",
    topic: "Quesar",
    message: "Fixture",
    created: 1,
    delivery: "accepted" as const,
  };
  const persist = vi.fn();
  const result = saveContactReceipt(
    receipt,
    Array.from({ length: 25 }, () => receipt),
    persist,
  );
  expect(result.persisted).toBe(true);
  expect(result.receipts).toHaveLength(20);
  expect(persist).toHaveBeenCalledWith(result.receipts);
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
