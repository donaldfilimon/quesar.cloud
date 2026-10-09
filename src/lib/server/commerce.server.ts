import { createHash } from "node:crypto";
import { z } from "zod";
import { adminDecisionFor } from "./admin.server";
import { seal, open, encryptionConfigured } from "./crypto.server";
import { WdbxCommerceStore, wdbxOptions } from "./commerce-wdbx.server";

const orderSchema = z
  .object({
    id: z.uuid(),
    invoiceNumber: z.string(),
    product: z.literal("pilot"),
    description: z.string(),
    currency: z.literal("USD"),
    amountMinor: z.literal(250000),
    status: z.enum(["awaiting_payment", "paid", "cancelled"]),
    createdAt: z.iso.datetime(),
    paidAt: z.iso.datetime().nullable(),
  })
  .strict();
export type CommerceOrder = z.infer<typeof orderSchema>;
const stateSchema = z
  .object({
    schema: z.literal("quesar-commerce-invoice-v1"),
    order: orderSchema,
    userId: z.string().nullable(),
    idempotencyKey: z.uuid().nullable(),
    paymentReference: z.string().nullable(),
    settledBy: z.string().nullable(),
    events: z
      .array(
        z.object({
          action: z.enum(["created", "paid", "cancelled", "account_unlinked"]),
          actor: z.string().nullable(),
          at: z.iso.datetime(),
        }),
      )
      .max(4),
  })
  .strict()
  .refine((s) =>
    s.order.status === "paid"
      ? s.order.paidAt !== null && s.paymentReference !== null && s.settledBy !== null
      : s.order.paidAt === null && s.paymentReference === null && s.settledBy === null,
  );
type State = z.infer<typeof stateSchema>;
const uuid = z.uuid();
function identity(userId: string, key: string) {
  const hex = createHash("sha256")
    .update(JSON.stringify(["quesar-invoice-v1", userId, key]))
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function requireDurableCommerce() {
  if (!wdbxOptions()) throw new Error("Invoicing requires a configured persistent WDBX ledger.");
  if (
    !process.env.DATABASE_URL?.trim() ||
    !process.env.BETTER_AUTH_SECRET?.trim() ||
    !process.env.BETTER_AUTH_URL?.trim()
  )
    throw new Error("Invoicing requires configured persistent authentication.");
  if (!encryptionConfigured()) throw new Error("Invoice encryption is not configured.");
}
export class CommerceRepository {
  constructor(private store: WdbxCommerceStore) {}
  private async mutate<T>(
    id: string,
    action: (state: State | null) => { state: State | null; result: T },
    create = false,
  ) {
    uuid.parse(id);
    return this.store.update(
      id,
      (value) => {
        const state =
          value === null ? null : stateSchema.parse(JSON.parse(open(value, `commerce:${id}`)));
        if (state && state.order.id !== id) throw new Error("Invoice identity mismatch.");
        const next = action(state);
        if (next.state === state) return { value, result: next.result };
        return {
          value:
            next.state === null
              ? null
              : seal(JSON.stringify(stateSchema.parse(next.state)), `commerce:${id}`),
          result: next.result,
        };
      },
      create,
    );
  }
  async create(userId: string, idempotencyKey: string): Promise<CommerceOrder> {
    uuid.parse(idempotencyKey);
    const id = identity(userId, idempotencyKey);
    return this.store.withAccountLock(userId, async () => {
      if (await this.store.accountDeleted(userId)) throw new Error("Invoice account unavailable.");
      return this.mutate(
        id,
        (state) => {
          if (state) {
            if (state.userId !== userId || state.idempotencyKey !== idempotencyKey)
              throw new Error("Invoice request unavailable.");
            return { state, result: state.order };
          }
          const now = new Date().toISOString();
          const order: CommerceOrder = {
            id,
            invoiceNumber: `QSR-${id.toUpperCase()}`,
            product: "pilot",
            description:
              "One month of scoped Pilot engineering engagement. Scope agreed before work begins. No automatic renewal or hosted model entitlement.",
            currency: "USD",
            amountMinor: 250000,
            status: "awaiting_payment",
            createdAt: now,
            paidAt: null,
          };
          return {
            state: {
              schema: "quesar-commerce-invoice-v1",
              order,
              userId,
              idempotencyKey,
              paymentReference: null,
              settledBy: null,
              events: [{ action: "created", actor: userId, at: now }],
            },
            result: order,
          };
        },
        true,
      );
    });
  }
  async list(userId: string): Promise<CommerceOrder[]> {
    const found: CommerceOrder[] = [];
    for (const id of await this.store.ids()) {
      const order = await this.mutate(id, (state) => ({
        state,
        result: state?.userId === userId ? state.order : null,
      }));
      if (order) found.push(order);
    }
    return found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async cancel(userId: string, orderId: string): Promise<CommerceOrder> {
    return this.mutate(orderId, (state) => {
      if (!state || state.userId !== userId || state.order.status === "paid")
        throw new Error("Invoice unavailable or no longer awaiting payment.");
      if (state.order.status === "cancelled") return { state, result: state.order };
      const order = { ...state.order, status: "cancelled" as const };
      return {
        state: {
          ...state,
          order,
          events: [
            ...state.events,
            { action: "cancelled", actor: userId, at: new Date().toISOString() },
          ],
        },
        result: order,
      };
    });
  }
  async settle(actorId: string, orderId: string, paymentReference: string): Promise<CommerceOrder> {
    uuid.parse(orderId);
    const reference = paymentReference.trim();
    if (
      reference.length < 3 ||
      reference.length > 160 ||
      Array.from(reference).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
    )
      throw new Error("A payment reference of 3–160 characters is required.");
    if (!(await adminDecisionFor(actorId)).admin) throw new Error("Administrator access required.");
    return this.store.withAccountLock(actorId, async () => {
      if (await this.store.accountDeleted(actorId))
        throw new Error("Administrator account unavailable.");
      return this.mutate(orderId, (state) => {
        if (!state || state.order.status === "cancelled")
          throw new Error("Invoice unavailable or no longer awaiting payment.");
        if (state.order.status === "paid") {
          if (state.settledBy === actorId && state.paymentReference === reference)
            return { state, result: state.order };
          throw new Error("Invoice unavailable or no longer awaiting payment.");
        }
        const now = new Date().toISOString(),
          order = { ...state.order, status: "paid" as const, paidAt: now };
        return {
          state: {
            ...state,
            order,
            paymentReference: reference,
            settledBy: actorId,
            events: [...state.events, { action: "paid", actor: actorId, at: now }],
          },
          result: order,
        };
      });
    });
  }
  async unlinkAccount(userId: string): Promise<number> {
    return this.store.withAccountLock(userId, async () => {
      await this.store.accountDeleted(userId, true);
      let count = 0;
      for (const id of await this.store.ids()) {
        const changed = await this.mutate(id, (state) => {
          if (
            !state ||
            (state.userId !== userId &&
              state.settledBy !== userId &&
              !state.events.some((e) => e.actor === userId))
          )
            return { state, result: false };
          return {
            state: {
              ...state,
              userId: state.userId === userId ? null : state.userId,
              idempotencyKey: state.userId === userId ? null : state.idempotencyKey,
              settledBy: state.settledBy === userId ? "deleted-account" : state.settledBy,
              events: [
                ...state.events.map((e) => ({ ...e, actor: e.actor === userId ? null : e.actor })),
                { action: "account_unlinked", actor: null, at: new Date().toISOString() },
              ],
            },
            result: true,
          };
        });
        if (changed) count++;
      }
      return count;
    });
  }
}
export async function commerceRepository() {
  requireDurableCommerce();
  return new CommerceRepository(new WdbxCommerceStore(wdbxOptions()!));
}
export function commerceReadiness() {
  return {
    configured: Boolean(
      wdbxOptions() &&
      process.env.DATABASE_URL?.trim() &&
      process.env.BETTER_AUTH_SECRET?.trim() &&
      process.env.BETTER_AUTH_URL?.trim() &&
      encryptionConfigured(),
    ),
    paymentMode: "manual_invoice" as const,
    storage: "wdbx" as const,
  };
}
export async function unlinkCommerceAccount(userId: string) {
  const options = wdbxOptions();
  // Partial WDBX configuration must fail closed during deletion, rather than leave associations.
  if (!options) {
    if (Object.keys(process.env).some((k) => k.startsWith("WDBX_COMMERCE_") && process.env[k]))
      throw new Error("WDBX commerce account cleanup requires complete configuration.");
    return 0;
  }
  return new CommerceRepository(new WdbxCommerceStore(options)).unlinkAccount(userId);
}
