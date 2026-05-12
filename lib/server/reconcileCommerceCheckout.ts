import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  validateOrderStatusTransition,
  type CommerceOrderStatus,
} from "@/lib/commerce/orderLifecycle";

/**
 * After a successful unified Square payment, advance a `CommerceOrder` from draft → paid
 * and merge checkout metadata (shipping selection, Square payment id).
 */
export async function reconcileCommerceOrderAfterStorefrontPayment(input: {
  commerceOrderId: string;
  squarePaymentId: string;
  paidTotalCents: number;
  shipping: {
    cents: number;
    label?: string;
    quoteUid?: string;
    addressSummary?: string;
    /** Carrier brand from quote selection — storefront-only metadata */
    provider?: string;
  } | null;
}): Promise<void> {
  const order = await prisma.commerceOrder.findUnique({ where: { id: input.commerceOrderId } });
  if (!order) {
    console.warn("[commerce] reconcile: order not found", input.commerceOrderId);
    return;
  }

  const existingMeta = (order.metadata as Record<string, unknown> | null) ?? {};
  const shippingMeta: Record<string, unknown> = input.shipping
    ? {
        shippingCents: input.shipping.cents,
        ...(input.shipping.label ? { selectedLabel: input.shipping.label } : {}),
        ...(input.shipping.quoteUid ? { quoteUid: input.shipping.quoteUid } : {}),
        ...(input.shipping.addressSummary ? { addressSummary: input.shipping.addressSummary } : {}),
        ...(input.shipping.provider ? { carrierQuoteProvider: input.shipping.provider } : {}),
      }
    : {};

  const mergedMetadata = {
    ...existingMeta,
    squarePaymentId: input.squarePaymentId,
    paidAt: new Date().toISOString(),
    ...(Object.keys(shippingMeta).length > 0 ? { storefrontShipping: shippingMeta } : {}),
  } satisfies Record<string, unknown>;

  const status = order.status as CommerceOrderStatus;

  if (status === "draft") {
    const gate = validateOrderStatusTransition("draft", "pending_payment");
    if (!gate.ok) throw new Error(`commerce_order:${gate.reason}`);
    await prisma.commerceOrder.update({
      where: { id: order.id },
      data: { status: "pending_payment", metadata: mergedMetadata as Prisma.InputJsonValue },
    });
  }

  const refreshed = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
  const st = refreshed?.status as CommerceOrderStatus | undefined;
  if (st === "pending_payment") {
    const gate = validateOrderStatusTransition("pending_payment", "paid");
    if (!gate.ok) throw new Error(`commerce_order:${gate.reason}`);
    await prisma.commerceOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        totalCents: input.paidTotalCents,
        metadata: mergedMetadata as Prisma.InputJsonValue,
      },
    });
  } else if (st === "paid") {
    await prisma.commerceOrder.update({
      where: { id: order.id },
      data: {
        totalCents: input.paidTotalCents,
        metadata: mergedMetadata as Prisma.InputJsonValue,
      },
    });
  }
}
