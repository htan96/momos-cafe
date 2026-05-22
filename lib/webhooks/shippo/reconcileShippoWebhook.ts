import type { Prisma, Shipment } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { mapShippoTrackingStatusToSignal } from "./mapShippoTrackingToPlatform";
import { peekShippoWebhookEnvelope, readShippoTrackingPayload } from "./shippoWebhookParse";

export type ShippoWebhookReconcileContext = {
  receiptId?: string | null;
  correlation?: { requestId?: string };
};

export type ShippoWebhookReconcileResult = {
  ignored: boolean;
  reason?: string;
  orphanEmitted?: boolean;
  commerceOrderId?: string | null;
  eventOutcome?: string;
};

function shipmentWhereForPeek(peek: ReturnType<typeof peekShippoWebhookEnvelope>): Prisma.ShipmentWhereInput | null {
  const tn = peek.trackingNumber?.trim();
  const txn = peek.shippoTransactionId?.trim();
  /** Shippo labels persist `carrierTransactionId` / `shippoTransactionId` on `Shipment.metadata`. */
  const or: Prisma.ShipmentWhereInput[] = [];
  const txCandidates = [...new Set([txn].filter(Boolean) as string[])];

  for (const t of txCandidates) {
    const tid = t.trim();
    if (!tid) continue;
    or.push({ metadata: { path: ["shippoTransactionId"], equals: tid } });
    or.push({ metadata: { path: ["carrierTransactionId"], equals: tid } });
  }

  if (tn) {
    or.push({ trackingNumber: tn });
  }

  if (or.length === 0) return null;
  return { OR: or };
}

export async function resolveShippoWebhookPeekLink(peek: ReturnType<typeof peekShippoWebhookEnvelope>): Promise<{
  shipmentId: string | null;
  commerceOrderId: string | null;
}> {
  const row = await findLocalShipment(peek);
  return {
    shipmentId: row?.id ?? null,
    commerceOrderId: row?.fulfillmentGroup.orderId ?? null,
  };
}

async function findLocalShipment(
  peek: ReturnType<typeof peekShippoWebhookEnvelope>
): Promise<(Shipment & { fulfillmentGroup: { orderId: string } }) | null> {
  const whereRoot = shipmentWhereForPeek(peek);
  if (!whereRoot) return null;

  const carrierNeedle = peek.carrier?.trim().toUpperCase();

  /** Prefer rows whose carrier aligns with Shippo webhook when multiple rows share a tracking/trans id. */
  const candidates = await prisma.shipment.findMany({
    where: whereRoot,
    take: 8,
    include: { fulfillmentGroup: { select: { orderId: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (candidates.length === 0) return null;
  if (!carrierNeedle) return candidates[0] ?? null;

  const needle = carrierNeedle.toUpperCase();
  const exact = candidates.find((c) => (c.carrier ?? "").trim().toUpperCase() === needle);
  return exact ?? candidates[0];
}

function readStatusDetailsSnippet(track: Record<string, unknown>): string | undefined {
  const ts = track.tracking_status;
  if (!ts || typeof ts !== "object" || Array.isArray(ts)) return undefined;
  const sd = (ts as Record<string, unknown>).status_details ?? (ts as Record<string, unknown>).statusDetails;
  return typeof sd === "string" ? sd.trim().slice(0, 500) : undefined;
}

async function persistShipmentCarrierUpdate(
  row: Shipment,
  peek: ReturnType<typeof peekShippoWebhookEnvelope>,
  shipStatusBucket: string | undefined
): Promise<void> {
  if (!shipStatusBucket) return;
  const tn = peek.trackingNumber?.trim();
  const car = peek.carrier?.trim() || row.carrier;

  /** Idempotent merges — webhook replays overwrite with same values safely. */
  const data: Prisma.ShipmentUpdateInput = {
    status: shipStatusBucket,
  };
  if (tn) data.trackingNumber = tn;
  if (car) data.carrier = car;

  if (shipStatusBucket === "delivered") {
    data.shippedAt = row.shippedAt ?? new Date();
  }

  await prisma.shipment.update({
    where: { id: row.id },
    data,
  });
}

/**
 * Persist platform timeline entries + hydrate `Shipment` when the webhook maps to storefront tracking payloads.
 *
 * Caller owns `WebhookDeliveryReceipt` lifecycle (`processingStatus`).
 */
export async function reconcileShippoWebhook(
  body: Record<string, unknown>,
  ctx: ShippoWebhookReconcileContext = {}
): Promise<ShippoWebhookReconcileResult> {
  const peek = peekShippoWebhookEnvelope(body);
  const eventLower = peek.shippoWebhookEventRaw?.trim().toLowerCase() ?? "";

  /** Allow bare Tracking JSON without `event` field (`track_updated` implied). */
  if (peek.shippoWebhookEventRaw && eventLower !== "track_updated") {
    await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_UNHANDLED_EVENT,
      category: "SHIPMENT_EVENT",
      lifecycle: "processing",
      severity: OperationalActivitySeverity.info,
      actorType: "service",
      message: `Shippo webhook event type acknowledged but not orchestrated (${peek.shippoWebhookEventRaw})`,
      correlation: ctx.correlation,
      detail: {
        receiptId: ctx.receiptId ?? undefined,
        shippoEvent: peek.shippoWebhookEventRaw,
        trackingNumber: peek.trackingNumber ?? undefined,
      },
      source: { handler: "reconcileShippoWebhook" },
      sourceTag: "webhooks.shippo",
    });
    return { ignored: true, reason: "unhandled_event_type", commerceOrderId: null, eventOutcome: "ignored" };
  }

  const trackBlob = readShippoTrackingPayload(body);
  if (!trackBlob || (!peek.trackingNumber && !peek.shippoTransactionId)) {
    return {
      ignored: true,
      reason: "no_tracking_hints",
      commerceOrderId: null,
      eventOutcome: "ignored",
    };
  }

  const plat = mapShippoTrackingStatusToSignal(peek.carrierStatusUpper);
  const shipmentRow = await findLocalShipment(peek);

  if (!shipmentRow) {
    await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_ORPHAN,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Shippo tracking webhook referenced no matching local storefront shipment row",
      correlation: ctx.correlation,
      detail: {
        receiptId: ctx.receiptId ?? undefined,
        trackingNumber: peek.trackingNumber ?? undefined,
        carrier: peek.carrier ?? undefined,
        shippoTransactionId: peek.shippoTransactionId ?? undefined,
        carrierStatusUpper: peek.carrierStatusUpper ?? undefined,
      },
      source: { handler: "reconcileShippoWebhook" },
      sourceTag: "webhooks.shippo",
    });

    return {
      ignored: false,
      orphanEmitted: true,
      commerceOrderId: null,
      reason: "ORPHAN_NO_LOCAL_SHIPMENT",
      eventOutcome: "orphan",
    };
  }

  const commerceOrderId = shipmentRow.fulfillmentGroup.orderId;
  await persistShipmentCarrierUpdate(shipmentRow, peek, plat.shipmentStatus);

  const statusDetails = readStatusDetailsSnippet(trackBlob);

  await emitPlatformEvent({
    subtype: plat.subtype,
    category: "SHIPMENT_EVENT",
    lifecycle: plat.lifecycle,
    severity: plat.severity,
    actorType: "service",
    message: describeShippoTimelineMessage(peek.carrierStatusUpper, peek.trackingNumber, peek.carrier),
    correlation: ctx.correlation,
    entities: { commerceOrderId, shipmentId: shipmentRow.id },
    detail: {
      receiptId: ctx.receiptId ?? undefined,
      carrierStatusUpper: peek.carrierStatusUpper ?? undefined,
      trackingNumber: peek.trackingNumber ?? undefined,
      carrier: peek.carrier ?? undefined,
      shippoSignal: plat.signal,
      statusDetails,
    },
    source: { handler: "reconcileShippoWebhook" },
    sourceTag: "webhooks.shippo",
  });

  return {
    ignored: false,
    commerceOrderId,
    orphanEmitted: false,
    eventOutcome: "processed",
  };
}

function describeShippoTimelineMessage(
  statusUpper?: string | null,
  tracking?: string | null,
  carrier?: string | null
): string {
  const tk = tracking ? ` (${tracking.slice(0, 12)}…)` : "";
  const car = carrier ? `${carrier.trim()} · ` : "";
  return `Shipment tracking update — ${car}${statusUpper ?? "UPDATE"}${tk}`;
}
