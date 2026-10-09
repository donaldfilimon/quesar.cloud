import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
export type { CommerceOrder } from "./server/commerce.server";

export const createPilotOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ idempotencyKey: z.uuid() }).strict())
  .handler(async ({ context, data }) => {
    const { commerceRepository } = await import("./server/commerce.server");
    const repository = await commerceRepository();
    const { hit } = await import("./server/rate-limit.server");
    const limit = await hit("commerce-create", context.userId, { windowMs: 3_600_000, max: 20 });
    if (!limit.allowed) throw new Error("Too many invoice requests. Try again later.");
    return repository.create(context.userId, data.idempotencyKey);
  });
export const listCommerceOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { commerceRepository } = await import("./server/commerce.server");
    return (await commerceRepository()).list(context.userId);
  });
export const cancelCommerceOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ orderId: z.uuid() }).strict())
  .handler(async ({ context, data }) => {
    const { commerceRepository } = await import("./server/commerce.server");
    return (await commerceRepository()).cancel(context.userId, data.orderId);
  });
export const adminSettleCommerceOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ orderId: z.uuid(), paymentReference: z.string().trim().min(3).max(160) }).strict(),
  )
  .handler(async ({ context, data }) => {
    const { commerceRepository } = await import("./server/commerce.server");
    return (await commerceRepository()).settle(context.userId, data.orderId, data.paymentReference);
  });

export const getCommerceReadiness = createServerFn({ method: "GET" }).handler(async () => {
  const { commerceReadiness } = await import("./server/commerce.server");
  return commerceReadiness();
});
