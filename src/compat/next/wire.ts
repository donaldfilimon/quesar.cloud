import { fromJSON, toJSON } from "seroval";

/**
 * Server-function wire format for the Next.js build: seroval's JSON form, the
 * serializer TanStack Start uses, so Dates, Maps, undefined and the like survive
 * the round trip as they do on the Vite build. `fromJSON` does not evaluate code.
 */
export const SERVER_FN_PATH = "/api/server-fn/";

export interface WireError {
  name: string;
  message: string;
}

export type WireReply = { ok: true; result: unknown } | { ok: false; error: WireError };

export const encode = (value: unknown) => JSON.stringify(toJSON(value));
export const decode = <T>(text: string): T => fromJSON(JSON.parse(text)) as T;
