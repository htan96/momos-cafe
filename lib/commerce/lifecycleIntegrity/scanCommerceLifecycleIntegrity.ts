import {
  OPERATIONAL_LIFECYCLE_NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS,
  OPERATIONAL_LIFECYCLE_SHIPMENT_MID_TRANSIT_STALE_MS,
  OPERATIONAL_LIFECYCLE_SHIPPO_ORPHAN_RECEIPT_WINDOW_MS,
} from "@/lib/operations/semantics/constants";
import { prisma } from "@/lib/prisma";

import type { LifecycleIntegrityFinding } from "./types";

/** Input rows produced by super-admin payment-integrity queries (read-only samples + refund scan). */
export type LifecycleIntegrityPaymentSnapshot = {
  paidLikeWithoutCompleted: Array<{
    id: string;
    status: string;
    updatedAt: Date;
    payments: Array<{ id: string; status: string; squarePaymentId: string | null }>;
  }>;
  stalePendingPaymentOrders: Array<{
    id: string;
    status: string;
    updatedAt: Date;
    totalCents: number;
    payments: Array<{ id: string; status: string; squarePaymentStatus: string | null }>;
  }>;
  stalePendingPaymentRecords: Array<{
    id: string;
    orderId: string | null;
    status: string;
    squarePaymentId: string | null;
    amountCents: number;
    updatedAt: Date;
  }>;
  fulfillmentAheadOfPrePayment: Array<{
    id: string;
    status: string;
    updatedAt: Date;
    fulfillmentGroups: Array<{ id: string; pipeline: string; status: string }>;
  }>;
  refundOddities: Array<{
    id: string;
    commerceOrderId: string;
    paymentRecordId: string | null;
    linkedOrderId: string | null;
    reasonTag: "missing_payment_record" | "payment_order_mismatch";
  }>;
};

const SHIPMENT_TRACKING_SAMPLE_CAP = 40;
const SHIPMENT_STALE_TRANSIT_SAMPLE_CAP = 35;
const SHIPPO_ORPHAN_RECEIPT_CAP = 30;
const NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS = OPERATIONAL_LIFECYCLE_NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS;
const NOTIFICATION_PENDING_SAMPLE_CAP = 60;

const ADVANCE_SHIPMENT_STATUSES_NO_TRACK = new Set([
  "in_transit",
  "out_for_delivery",
  "delivered",
  "shipped",
]);

const MID_TRANSIT_STALE_STATUSES = new Set(["in_transit", "out_for_delivery", "manifested"]);

const TERMINAL_ORDER_STATUSES = new Set(["fulfilled", "cancelled"]);

/** Notification types that normally drain quickly after payment wiring; still heuristic-only. */
const PAYMENT_OUTBOX_TYPES_STALE_ON_TERMINAL_ORDER = new Set(["commerce.payment.square_webhook"]);

function findingsFromPaymentSnapshots(snap: LifecycleIntegrityPaymentSnapshot): LifecycleIntegrityFinding[] {
  const out: LifecycleIntegrityFinding[] = [];

  for (const row of snap.paidLikeWithoutCompleted) {
    out.push({
      code: "PAID_LIKE_ORDER_WITHOUT_COMPLETED_PAYMENT",
      severity: "CRITICAL",
      category: "PAYMENT",
      message: `Order status ${row.status} but no PaymentRecord with status completed (local mirror drift).`,
      entityRefs: { commerceOrderId: row.id },
      remediationHint: "Correlate with Square Dashboard and payment-integrity dashboard before any manual transition.",
    });
  }

  for (const row of snap.stalePendingPaymentOrders) {
    out.push({
      code: "STALE_PENDING_PAYMENT_ORDER_SHELL",
      severity: "HIGH",
      category: "PAYMENT",
      message: `Order pending_payment beyond configured stale horizon (updated ${row.updatedAt.toISOString()}).`,
      entityRefs: { commerceOrderId: row.id },
      remediationHint: "Check abandoned checkouts, webhook delivery, and PaymentRecord rows for this order.",
    });
  }

  for (const row of snap.stalePendingPaymentRecords) {
    const oid = row.orderId;
    const orderHint = oid ? `${oid.slice(0, 8)}…` : "unknown";
    out.push({
      code: "STALE_PENDING_PAYMENT_RECORD",
      severity: "HIGH",
      category: "PAYMENT",
      message: `PaymentRecord still pending beyond stale horizon (order ${orderHint}).`,
      entityRefs: { ...(oid ? { commerceOrderId: oid } : {}), paymentRecordId: row.id },
      remediationHint: "Compare Square payment state vs local row; see payment-integrity stale PSP row section.",
    });
  }

  for (const row of snap.fulfillmentAheadOfPrePayment) {
    const advanced = row.fulfillmentGroups.filter((g) => g.status !== "pending" && g.status !== "cancelled");
    const fg = advanced[0];
    out.push({
      code: "FULFILLMENT_PROGRESS_PRE_PAYMENT_SHELL",
      severity: "HIGH",
      category: "FULFILLMENT",
      message: `Fulfillment group advanced (${fg?.status ?? "?"}) while order still ${row.status}.`,
      entityRefs: { commerceOrderId: row.id, fulfillmentGroupId: fg?.id },
      remediationHint: "Often migration or race; confirm payment-integrity and order operations timelines.",
    });
  }

  for (const row of snap.refundOddities) {
    const isMissing = row.reasonTag === "missing_payment_record";
    out.push({
      code: isMissing ? "REFUND_CASE_MISSING_PAYMENT_LINK" : "REFUND_CASE_PAYMENT_ORDER_MISMATCH",
      severity: "HIGH",
      category: "REFUND",
      message: isMissing
        ? "Approved/submitted refund case without a resolvable PaymentRecord link."
        : `Refund case payment row order ${row.linkedOrderId ?? "?"} does not match case commerceOrderId.`,
      entityRefs: {
        commerceOrderId: row.commerceOrderId,
        paymentRecordId: row.paymentRecordId ?? undefined,
        refundCaseId: row.id,
      },
      remediationHint: "Re-link payment on the refund case or void/replace the shell before Square submission.",
    });
  }

  return out;
}

async function scanShipmentAndWebhookFindings(): Promise<LifecycleIntegrityFinding[]> {
  const out: LifecycleIntegrityFinding[] = [];
  const now = Date.now();

  const noTracking = await prisma.shipment.findMany({
    where: {
      OR: [{ trackingNumber: null }, { trackingNumber: "" }],
      status: { in: [...ADVANCE_SHIPMENT_STATUSES_NO_TRACK] },
    },
    orderBy: { updatedAt: "desc" },
    take: SHIPMENT_TRACKING_SAMPLE_CAP,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      fulfillmentGroupId: true,
      fulfillmentGroup: { select: { orderId: true } },
    },
  });

  for (const s of noTracking) {
    out.push({
      code: "SHIPMENT_ADVANCED_BUCKET_WITHOUT_TRACKING_NUMBER",
      severity: "WARNING",
      category: "SHIPMENT",
      message: `Shipment status ${s.status} but tracking_number empty — may be pre-label or webhook lag.`,
      entityRefs: {
        shipmentId: s.id,
        commerceOrderId: s.fulfillmentGroup.orderId,
        fulfillmentGroupId: s.fulfillmentGroupId,
      },
      remediationHint: "Confirm label purchase flow and Shippo tracking ingest; may false-positive for manual carriers.",
    });
  }

  const staleCutoff = new Date(now - OPERATIONAL_LIFECYCLE_SHIPMENT_MID_TRANSIT_STALE_MS);
  const staleMid = await prisma.shipment.findMany({
    where: {
      status: { in: [...MID_TRANSIT_STALE_STATUSES] },
      updatedAt: { lt: staleCutoff },
    },
    orderBy: { updatedAt: "asc" },
    take: SHIPMENT_STALE_TRANSIT_SAMPLE_CAP,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      fulfillmentGroupId: true,
      fulfillmentGroup: { select: { orderId: true } },
    },
  });

  for (const s of staleMid) {
    out.push({
      code: "SHIPMENT_MID_TRANSIT_STALE_UPDATE",
      severity: "INFO",
      category: "SHIPMENT",
      message: `Shipment ${s.status} without row update for 72h+ (last update ${s.updatedAt.toISOString()}).`,
      entityRefs: {
        shipmentId: s.id,
        commerceOrderId: s.fulfillmentGroup.orderId,
        fulfillmentGroupId: s.fulfillmentGroupId,
      },
      remediationHint: "Carrier may be idle or webhooks delayed; compare Shippo dashboard and Shippo webhooks ops page.",
    });
  }

  const orphanSince = new Date(now - OPERATIONAL_LIFECYCLE_SHIPPO_ORPHAN_RECEIPT_WINDOW_MS);
  const orphanReceipts = await prisma.webhookDeliveryReceipt.findMany({
    where: {
      provider: "shippo",
      receivedAt: { gte: orphanSince },
      errorCode: "ORPHAN_NO_LOCAL_SHIPMENT",
    },
    orderBy: { receivedAt: "desc" },
    take: SHIPPO_ORPHAN_RECEIPT_CAP,
    select: {
      id: true,
      receivedAt: true,
      eventType: true,
      commerceOrderId: true,
    },
  });

  for (const r of orphanReceipts) {
    out.push({
      code: "SHIPPO_WEBHOOK_ORPHAN_NO_LOCAL_SHIPMENT",
      severity: "WARNING",
      category: "WEBHOOK",
      message: `Shippo receipt could not link to a local Shipment (${r.eventType ?? "unknown event"}).`,
      entityRefs: { commerceOrderId: r.commerceOrderId ?? undefined },
      remediationHint: "See Shippo webhooks operations page; cross-check tracking / transaction ids vs shipment metadata.",
    });
  }

  return out;
}

function readCommerceOrderIdFromNotificationPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const o = payload as Record<string, unknown>;
  const raw = o.commerceOrderId ?? o.commerce_order_id;
  return typeof raw === "string" && raw.length >= 32 ? raw : null;
}

async function scanNotificationFindings(): Promise<LifecycleIntegrityFinding[]> {
  const out: LifecycleIntegrityFinding[] = [];
  const minCreatedBefore = new Date(Date.now() - NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS);

  const pending = await prisma.notificationEvent.findMany({
    where: {
      processedAt: null,
      type: { in: [...PAYMENT_OUTBOX_TYPES_STALE_ON_TERMINAL_ORDER] },
      createdAt: { lt: minCreatedBefore },
    },
    orderBy: { createdAt: "asc" },
    take: NOTIFICATION_PENDING_SAMPLE_CAP,
    select: { id: true, type: true, createdAt: true, payload: true },
  });

  if (pending.length === 0) return out;

  const orderIds = [...new Set(pending.map((p) => readCommerceOrderIdFromNotificationPayload(p.payload)).filter(Boolean))] as string[];

  if (orderIds.length === 0) return out;

  const orders = await prisma.commerceOrder.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true },
  });
  const statusById = new Map(orders.map((o) => [o.id, o.status]));

  for (const row of pending) {
    const oid = readCommerceOrderIdFromNotificationPayload(row.payload);
    if (!oid) continue;
    const st = statusById.get(oid);
    if (!st || !TERMINAL_ORDER_STATUSES.has(st)) continue;

    out.push({
      code: "NOTIFICATION_OUTBOX_PENDING_ORDER_TERMINAL",
      severity: "WARNING",
      category: "NOTIFICATION",
      message: `Notification type ${row.type} still pending while commerce order is terminal (${st}) — may be backlog or abandoned enqueue.`,
      entityRefs: { notificationId: row.id, commerceOrderId: oid },
      remediationHint:
        "Conservative signal: verify notification outbox health and whether this type should still send for terminal orders. False positives if drain is intentionally paused.",
    });
  }

  return out;
}

/**
 * Assembles **read-only** lifecycle integrity findings from payment/fulfillment/refund samples plus local shipment / notification scans.
 * Callers supply `LifecycleIntegrityPaymentSnapshot` from `lib/super-admin/paymentIntegrity/queries` (or equivalent reads).
 */
export async function scanCommerceLifecycleIntegrity(
  paymentSnapshot: LifecycleIntegrityPaymentSnapshot
): Promise<LifecycleIntegrityFinding[]> {
  const [paymentRelated, shipHook, notif] = await Promise.all([
    Promise.resolve(findingsFromPaymentSnapshots(paymentSnapshot)),
    scanShipmentAndWebhookFindings(),
    scanNotificationFindings(),
  ]);
  return [...paymentRelated, ...shipHook, ...notif];
}
