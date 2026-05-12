import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * After unified checkout payment, bind storefront shipping selection to the retail `FulfillmentGroup`
 * via a pending `Shipment` row (label purchase updates tracking + carrier).
 */
export async function persistStorefrontShipmentSelection(input: {
  commerceOrderId: string;
  shippingCents: number;
  selectedShippoRateId?: string;
  shippingService?: string;
  carrierHint?: string;
}): Promise<void> {
  const group = await prisma.fulfillmentGroup.findFirst({
    where: { orderId: input.commerceOrderId, pipeline: "RETAIL" },
    orderBy: { id: "asc" },
  });
  if (!group) {
    console.warn("[shipping] persist: no RETAIL fulfillment group", input.commerceOrderId);
    return;
  }

  const metadata = {
    source: "storefront_checkout",
    persistedAt: new Date().toISOString(),
  } satisfies Record<string, unknown>;

  const pending = await prisma.shipment.findFirst({
    where: {
      fulfillmentGroupId: group.id,
      trackingNumber: null,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });

  if (pending) {
    await prisma.shipment.update({
      where: { id: pending.id },
      data: {
        shippingCents: input.shippingCents,
        shippingService: input.shippingService ?? null,
        selectedShippoRateId: input.selectedShippoRateId ?? null,
        carrier: input.carrierHint ?? pending.carrier ?? null,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await prisma.shipment.create({
    data: {
      fulfillmentGroupId: group.id,
      status: "pending",
      shippingCents: input.shippingCents,
      shippingService: input.shippingService ?? null,
      selectedShippoRateId: input.selectedShippoRateId ?? null,
      carrier: input.carrierHint ?? null,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}
