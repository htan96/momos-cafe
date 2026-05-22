import type { OperationalActivityEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readOperationalMetadataEntityIds } from "@/lib/operations/operationalContextLinks";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/** Prefer explicit `shipmentId` on envelope; otherwise infer latest shipment tied to commerce order metadata. */
export async function resolveShippoShipmentIdForRecovery(
  row: OperationalActivityEvent,
  entityIds: ReturnType<typeof readOperationalMetadataEntityIds>
): Promise<{
  shipmentId: string;
  commerceOrderId: string | null;
  source: "metadata" | "latest_for_order";
  contractLine: string;
} | null> {
  const orderCandidate = entityIds.commerceOrderId ?? entityIds.orderId;

  if (entityIds.shipmentId && orderCandidate) {
    return {
      shipmentId: entityIds.shipmentId,
      commerceOrderId: orderCandidate,
      source: "metadata",
      contractLine:
        `POST /api/super-admin/operations/recovery/shippo-label with {\"shipmentId\":\"${entityIds.shipmentId}\"} (preferred; linked order ${orderCandidate.slice(0, 8)}…).`,
    };
  }

  if (entityIds.shipmentId) {
    const group = await prisma.shipment.findUnique({
      where: { id: entityIds.shipmentId },
      select: {
        fulfillmentGroup: { select: { orderId: true } },
      },
    });
    const commerceOrderId = group?.fulfillmentGroup?.orderId ?? null;
    return {
      shipmentId: entityIds.shipmentId,
      commerceOrderId,
      source: "metadata",
      contractLine: `POST …/recovery/shippo-label with {\"shipmentId\":\"${entityIds.shipmentId}\"}`,
    };
  }

  if (!orderCandidate) return null;

  const shipment = await prisma.shipment.findFirst({
    where: { fulfillmentGroup: { orderId: orderCandidate } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!shipment) return null;

  const contractLine =
    row.type === PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED
      ? `No shipment id on failure envelope — inferred latest shipment ${shipment.id.slice(0, 8)}… for order ${orderCandidate.slice(
          0,
          8
        )}… via Prisma lookup. Prefer re-emitting events with shipmentId for cleaner retries.`
      : `Resolved latest shipment ${shipment.id.slice(0, 8)}… for order ${orderCandidate.slice(0, 8)}…`;

  return {
    shipmentId: shipment.id,
    commerceOrderId: orderCandidate,
    source: "latest_for_order",
    contractLine,
  };
}
