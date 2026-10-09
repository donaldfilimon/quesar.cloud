import { services } from "@/lib/mlai/categories/services";

export function contactSearch(search: Record<string, unknown>): { service?: string } {
  return typeof search.service === "string" &&
    services.some((item) => item.title === search.service)
    ? { service: search.service }
    : {};
}

export type InquiryFields = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  created: number;
};
export type InquiryReceipt = InquiryFields &
  ({ delivery: "draft" } | { delivery: "accepted" } | { delivery: "unknown" });
export function receiptLabel(delivery: InquiryReceipt["delivery"]): string {
  return delivery === "draft"
    ? "Email draft — delivery unconfirmed"
    : delivery === "accepted"
      ? "Inquiry accepted by the site"
      : "Legacy copy — delivery unknown";
}
export function readReceipts(value: unknown): InquiryReceipt[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is InquiryFields & { delivery?: unknown } =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.email === "string" &&
        typeof item.topic === "string" &&
        typeof item.message === "string" &&
        typeof item.created === "number" &&
        Number.isFinite(item.created) &&
        Number.isFinite(new Date(item.created).getTime()),
    )
    .map((item) => ({
      ...item,
      delivery:
        item.delivery === "draft" || item.delivery === "accepted" ? item.delivery : "unknown",
    }));
}

/** Device storage is optional and must never undo a known submission outcome. */
export function saveContactReceipt(
  receipt: InquiryReceipt,
  previous: InquiryReceipt[],
  persist: (receipts: InquiryReceipt[]) => void,
) {
  const receipts = [receipt, ...previous].slice(0, 20);
  let persisted = false;
  try {
    persist(receipts);
    persisted = true;
  } catch {
    // Keep the receipt in memory even when storage is denied or full.
  }
  return { receipts, persisted, status: "done" as const };
}

export function contactOutcomeMessage(delivery: "draft" | "accepted", persisted: boolean) {
  const outcome =
    delivery === "draft"
      ? "Email draft requested. Delivery is unconfirmed."
      : "Inquiry accepted by the site.";
  return `${outcome} ${
    persisted
      ? "A local copy is kept on this device."
      : "The local copy could not be saved; it is available only while this page stays open."
  }`;
}

/** Submission produces an outcome; failed requests never mutate the caller's form. */
export async function submitContact<T>(
  fields: T,
  send: (fields: T) => Promise<import("@/lib/inquiry-rules").InquiryResult>,
): Promise<import("@/lib/inquiry-rules").InquiryResult> {
  try {
    return await send(fields);
  } catch {
    return {
      ok: false,
      code: "unavailable",
      error: "We couldn't reach the server. Your message is still in the form.",
    };
  }
}
