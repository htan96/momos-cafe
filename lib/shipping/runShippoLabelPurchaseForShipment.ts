import type { Prisma, Shipment } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateFulfillmentTransition } from "@/lib/commerce/orderLifecycle";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { purchaseShippoLabel } from "@/lib/shipping/shippoClient";

/**
 * After a verified carrier purchase, bump the parent retail `FulfillmentGroup` toward `shipped`
 * using validated status edges (handles `pending` → `merch_processing` chaining).
 */
async function promoteRetailGroupAfterShipmentLabel(fulfillmentGroupId: string): Promise<void> {
  const gid = fulfillmentGroupId.trim();
  if (!gid) return;

  const maxSteps = 6;
  for (let step = 0; step < maxSteps; step += 1) {
    const g = await prisma.fulfillmentGroup.findUnique({
      where: { id: gid },
      select: { id: true, pipeline: true, status: true },
    });
    if (!g || g.pipeline !== "RETAIL") return;
    if (g.status === "shipped" || g.status === "completed") return;

    let nextStatus: string | null = null;
    if (g.status === "pending") nextStatus = "merch_processing";
    else if (g.status === "merch_processing" || g.status === "ready_for_pickup") nextStatus = "shipped";
    else return;

    const gate = validateFulfillmentTransition("RETAIL", g.status, nextStatus);
    if (!gate.ok) {
      console.warn("[Shippo retail lift] Transition blocked after label purchase", {
        fulfillmentGroupId: gid,
        from: g.status,
        next: nextStatus,
        reason: gate.reason,
      });
      return;
    }
    await prisma.fulfillmentGroup.update({
      where: { id: gid },
      data: { status: nextStatus },
    });
    if (nextStatus === "shipped") return;
  }
}

export type ShipLabelPurchaseActor = {
  sub: string;
  actorType: "super_admin" | "admin";
};

/** Core Shippo purchase + persistence — shared by `/api/ops/shipping/purchase-label` and super-admin recovery routes. */
export async function runShippoLabelPurchaseForShipment(input: {
  shipmentId: string;
  actor: ShipLabelPurchaseActor;
  emitSourceTag: string;
}): Promise<
  | { ok: true; shipment: Shipment }
  | { ok: false; httpStatus: number; errorCode: string; message?: string; logDetail?: unknown }
> {
  const shipmentId = input.shipmentId.trim();
  if (!shipmentId) {
    return { ok: false, httpStatus: 400, errorCode: "shipment_required" };
  }

  const row = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });
  if (!row) {
    return { ok: false, httpStatus: 404, errorCode: "shipment_not_found" };
  }

  const rateId = row.selectedShippoRateId?.trim();
  if (!rateId) {
    return {
      ok: false,
      httpStatus: 422,
      errorCode: "no_rate_on_file",
      message: "This shipment has no saved carrier rate to purchase.",
    };
  }

  if (row.trackingNumber && row.trackingNumber.trim().length > 0) {
    return {
      ok: false,
      httpStatus: 409,
      errorCode: "already_shipped",
      message: "Tracking is already set on this shipment.",
    };
  }

  const purchased = await purchaseShippoLabel(rateId);
  if (!purchased.ok) {
    console.error(`[Shippo purchase] ${input.emitSourceTag}`, purchased.logDetail);
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: input.actor.actorType,
      actorId: input.actor.sub,
      message: "Shippo label purchase failed after rate selection",
      entities: { shipmentId: row.id },
      detail: {
        reason: "carrier_purchase_failed",
        recoveryTag: input.emitSourceTag,
        logDetailSnippet:
          typeof purchased.logDetail === "string" ? purchased.logDetail.slice(0, 500) : purchased.logDetail,
      },
      source: { handler: input.emitSourceTag },
      sourceTag: input.emitSourceTag,
    });
    return {
      ok: false,
      httpStatus: 502,
      errorCode: "purchase_failed",
      message: "Could not buy the label — verify carrier accounts and rate freshness, then retry.",
      logDetail: purchased.logDetail,
    };
  }

  const metaBase =
    row.metadata && typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  const mergedMeta = {
    ...metaBase,
    labelPurchaseAt: new Date().toISOString(),
    ...(purchased.labelUrl ? { labelUrl: purchased.labelUrl } : {}),
    ...(purchased.transactionId ? { carrierTransactionId: purchased.transactionId } : {}),
  };

  const carrierOut = purchased.carrier?.trim() || row.carrier;

  const hasProofOfPurchase = Boolean(purchased.trackingNumber?.trim() || purchased.labelUrl?.trim());

  let updated: Shipment;
  try {
    updated = await prisma.shipment.update({
      where: { id: row.id },
      data: {
        trackingNumber: purchased.trackingNumber?.trim() || row.trackingNumber,
        carrier: carrierOut ?? null,
        status: hasProofOfPurchase ? "shipped" : row.status,
        shippedAt: hasProofOfPurchase ? new Date() : row.shippedAt,
        metadata: mergedMeta as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error(`[Shippo purchase] ${input.emitSourceTag} DB update`, e);
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.critical,
      actorType: input.actor.actorType,
      actorId: input.actor.sub,
      message: "Unexpected error while saving Shippo label shipment row",
      entities: { shipmentId: row.id },
      detail: {
        reason: "db_update_failed",
        errorName: e instanceof Error ? e.name : typeof e,
      },
      source: { handler: input.emitSourceTag },
      sourceTag: input.emitSourceTag,
    });
    return { ok: false, httpStatus: 500, errorCode: "update_failed" };
  }

  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
    severity: OperationalActivitySeverity.info,
    actorType: input.actor.actorType,
    actorId: input.actor.sub,
    message: "Shippo label purchased for storefront shipment",
    metadata: {
      shipmentId: updated.id,
      carrier: updated.carrier,
      trackingNumber: updated.trackingNumber,
    },
    source: input.emitSourceTag,
  });

  try {
    await promoteRetailGroupAfterShipmentLabel(updated.fulfillmentGroupId);
  } catch (liftErr: unknown) {
    console.warn(`[Shippo purchase] ${input.emitSourceTag} retail fulfillment promotion`, liftErr);
  }

  return { ok: true, shipment: updated };
}
