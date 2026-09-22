/**
 * Contact inquiry rules, shared by the `/contact` form and the server.
 *
 * Minimums follow mlai's `/api/inquiries` (name >= 2, an email address, message
 * >= 10). mlai had no upper bounds; these take the `/contact` form's existing
 * caps so the database never stores an unbounded public string. mlai also
 * required a company; `/contact` has no company field, so it is optional and
 * stored as "".
 */

export const TOPICS = ["Quesar", "Abbey", "ABI / WDBX", "Services", "Investors", "Other"] as const;
export type InquiryTopic = (typeof TOPICS)[number];

export const INQUIRY_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 120,
  companyMax: 120,
  messageMin: 10,
  messageMax: 2000,
  tokenMax: 4096,
} as const;

export interface InquiryInput {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
  turnstileToken: string;
}

export type InquiryField = "name" | "email" | "company" | "topic" | "message";

export interface ValidInquiry {
  name: string;
  email: string;
  company: string;
  topic: InquiryTopic;
  message: string;
}

export type InquiryValidation = { ok: true; value: ValidInquiry } | { ok: false; field: InquiryField; error: string };

/** Coerce an untrusted payload into string fields. Never throws. */
export function coerceInquiryInput(input: unknown): InquiryInput {
  const record = typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  return {
    name: text("name"),
    email: text("email"),
    company: text("company"),
    topic: text("topic"),
    message: text("message"),
    turnstileToken: text("turnstileToken").slice(0, INQUIRY_LIMITS.tokenMax + 1),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTopic(value: string): value is InquiryTopic {
  return (TOPICS as readonly string[]).includes(value);
}

export function validateInquiry(input: InquiryInput): InquiryValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();
  const topic = input.topic.trim();
  const message = input.message.trim();
  const L = INQUIRY_LIMITS;

  if (name.length < L.nameMin) return { ok: false, field: "name", error: "Enter your full name." };
  if (name.length > L.nameMax) return { ok: false, field: "name", error: `Keep your name under ${L.nameMax} characters.` };
  if (!EMAIL.test(email) || email.length > L.emailMax) {
    return { ok: false, field: "email", error: "Enter an email address we can reply to." };
  }
  if (company.length > L.companyMax) {
    return { ok: false, field: "company", error: `Keep the organization under ${L.companyMax} characters.` };
  }
  if (!isTopic(topic)) return { ok: false, field: "topic", error: "Choose a topic." };
  if (message.length < L.messageMin) {
    return { ok: false, field: "message", error: "Add a bit more detail: at least 10 characters." };
  }
  if (message.length > L.messageMax) {
    return { ok: false, field: "message", error: `Keep the message under ${L.messageMax} characters.` };
  }
  return { ok: true, value: { name, email, company, topic, message } };
}

export type InquiryResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "rate_limited" | "verification" | "misconfigured" | "unavailable";
      error: string;
      field?: InquiryField;
    };
