import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/types/ordering";
import type { CafeOrderCustomer, CafeOrderStatus } from "@/types/order";

export interface CreateCafeOrderInput {
  cart: CartItem[];
  customer: CafeOrderCustomer;
  totalCents: number;
  fulfillmentType: string;
  /** ISO 8601 — customer-scheduled pickup; when valid, status starts as `scheduled` */
  scheduledForIso?: string | null;
  /** ISO 8601 — server-computed ASAP estimate (always recommended) */
  estimatedPickupAtIso: string;
  /** Set when checkout used Square Orders API (catalog line items). */
  squareOrderId?: string | null;
}

function parseIsoToDate(iso: string | null | undefined): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function deriveInitialStatus(
  totalCents: number,
  hasValidScheduledFor: boolean
): CafeOrderStatus {
  if (hasValidScheduledFor) return "scheduled";
  if (totalCents <= 0) return "confirmed";
  return "awaiting_payment";
}

/**
 * Persists an order before (or alongside) Square payment.
 * When `squareOrderId` is set, totals should match Square’s computed order total.
 */
export async function createCafeOrder(
  input: CreateCafeOrderInput
): Promise<{ id: string }> {
  const scheduledFor = parseIsoToDate(input.scheduledForIso ?? null);
  const hasValidScheduledFor = scheduledFor !== null;
  const status = deriveInitialStatus(input.totalCents, hasValidScheduledFor);
  const estimatedPickupAt = parseIsoToDate(input.estimatedPickupAtIso);
  if (!estimatedPickupAt) {
    throw new Error("estimatedPickupAtIso must be a valid ISO date");
  }

  try {
    const row = await prisma.cafeOrder.create({
      data: {
        cart: input.cart as unknown as Prisma.InputJsonValue,
        customer: input.customer as unknown as Prisma.InputJsonValue,
        totalCents: input.totalCents,
        fulfillmentType: input.fulfillmentType,
        scheduledFor,
        estimatedPickupAt,
        status,
        isPaid: input.totalCents <= 0,
        squarePaymentId: null,
        squareOrderId: input.squareOrderId?.trim() || null,
        notes: input.customer.notes?.trim() || null,
      },
      select: { id: true },
    });
    return { id: row.id };
  } catch (err) {
    console.error("[orders] createCafeOrder error:", err);
    throw new Error(
      err instanceof Error ? err.message : "Failed to create order"
    );
  }
}

export async function markCafeOrderPaid(
  orderId: string,
  squarePaymentId: string
): Promise<void> {
  try {
    await prisma.cafeOrder.update({
      where: { id: orderId },
      data: {
        squarePaymentId,
        status: "paid",
        isPaid: true,
      },
    });
  } catch (err) {
    console.error("[orders] markCafeOrderPaid error:", err);
    throw new Error(
      err instanceof Error ? err.message : "Failed to update order payment"
    );
  }
}

export async function markCafeOrderPaymentFailed(orderId: string): Promise<void> {
  try {
    await prisma.cafeOrder.update({
      where: { id: orderId },
      data: { status: "payment_failed" },
    });
  } catch (err) {
    console.error("[orders] markCafeOrderPaymentFailed error:", err);
  }
}

export interface InsertPaidCafeOrderInput extends CreateCafeOrderInput {
  /** Client/server checkout correlation id — becomes `cafe_orders.id` when persisted. */
  id: string;
  squarePaymentId: string;
}

/**
 * Inserts a paid row in one step (used after Square charge succeeds).
 * Caller supplies `id` so it matches the `orderId` returned to the client even when reconcile retries.
 */
export async function insertCafeOrderAfterSuccessfulPayment(
  input: InsertPaidCafeOrderInput
): Promise<{ id: string }> {
  const scheduledFor = parseIsoToDate(input.scheduledForIso ?? null);
  const estimatedPickupAt = parseIsoToDate(input.estimatedPickupAtIso);
  if (!estimatedPickupAt) {
    throw new Error("estimatedPickupAtIso must be a valid ISO date");
  }

  try {
    const row = await prisma.cafeOrder.create({
      data: {
        id: input.id,
        cart: input.cart as unknown as Prisma.InputJsonValue,
        customer: input.customer as unknown as Prisma.InputJsonValue,
        totalCents: input.totalCents,
        fulfillmentType: input.fulfillmentType,
        scheduledFor,
        estimatedPickupAt,
        status: "paid",
        isPaid: true,
        squarePaymentId: input.squarePaymentId,
        squareOrderId: input.squareOrderId?.trim() || null,
        notes: input.customer.notes?.trim() || null,
      },
      select: { id: true },
    });
    return { id: row.id };
  } catch (err) {
    console.error("[orders] insertCafeOrderAfterSuccessfulPayment error:", err);
    throw new Error(
      err instanceof Error ? err.message : "Failed to persist paid order"
    );
  }
}

export interface InsertFreeCafeOrderInput extends CreateCafeOrderInput {
  id: string;
}

/** $0 checkout — no Square payment id. */
export async function insertCafeOrderFreeOrder(
  input: InsertFreeCafeOrderInput
): Promise<{ id: string }> {
  const scheduledFor = parseIsoToDate(input.scheduledForIso ?? null);
  const hasValidScheduledFor = scheduledFor !== null;
  const status = deriveInitialStatus(0, hasValidScheduledFor);
  const estimatedPickupAt = parseIsoToDate(input.estimatedPickupAtIso);
  if (!estimatedPickupAt) {
    throw new Error("estimatedPickupAtIso must be a valid ISO date");
  }

  try {
    const row = await prisma.cafeOrder.create({
      data: {
        id: input.id,
        cart: input.cart as unknown as Prisma.InputJsonValue,
        customer: input.customer as unknown as Prisma.InputJsonValue,
        totalCents: 0,
        fulfillmentType: input.fulfillmentType,
        scheduledFor,
        estimatedPickupAt,
        status,
        isPaid: true,
        squarePaymentId: null,
        squareOrderId: input.squareOrderId?.trim() || null,
        notes: input.customer.notes?.trim() || null,
      },
      select: { id: true },
    });
    return { id: row.id };
  } catch (err) {
    console.error("[orders] insertCafeOrderFreeOrder error:", err);
    throw new Error(
      err instanceof Error ? err.message : "Failed to persist free order"
    );
  }
}
