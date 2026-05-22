import { OperationalRefundCaseStatus, WebhookProcessingStatus } from "@prisma/client";

import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import {
  OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS,
  OPERATIONAL_PAYMENT_STALE_SAMPLE_CAP,
} from "@/lib/operations/semantics/constants";
import { prisma } from "@/lib/prisma";

/** Default staleness horizon for coordination heuristics (order / payment_record `updated_at`). */
export const DEFAULT_PAYMENT_INTEGRITY_STALE_HOURS = OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS;

/**
 * Bounds `PAYMENT_INTEGRITY_STALE_HOURS` (minimum 1h). Overrides module default ({@link DEFAULT_PAYMENT_INTEGRITY_STALE_HOURS}).
 */
export function readPaymentIntegrityStaleHoursFromEnv(): number {
  const raw = process.env.PAYMENT_INTEGRITY_STALE_HOURS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS;
}

const STALE_SAMPLE_CAP = OPERATIONAL_PAYMENT_STALE_SAMPLE_CAP;
const PAID_LIKE_WITHOUT_COMPLETED_CAP = 40;
const FULFILLMENT_PAYMENT_MISMATCH_CAP = 40;
const ORPHAN_RECEIPT_CAP = 40;
const ORPHAN_OPS_EVENT_CAP = 25;
const REFUND_ODDITY_SAMPLE_CAP = 30;

const PAID_LIKE_ORDER_STATUSES = ["paid", "partially_fulfilled"] as const;

const PRE_PAYMENT_SHELL_STATUSES = ["draft", "pending_payment"] as const;

export async function findStalePendingPaymentOrdersForIntegrity(since: Date) {
  return prisma.commerceOrder.findMany({
    where: {
      status: "pending_payment",
      updatedAt: { lt: since },
    },
    orderBy: { updatedAt: "asc" },
    take: STALE_SAMPLE_CAP,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      totalCents: true,
      customer: { select: { email: true } },
      payments: {
        select: { id: true, status: true, squarePaymentStatus: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
  });
}

export async function findStalePendingPaymentRecordsForIntegrity(since: Date) {
  return prisma.paymentRecord.findMany({
    where: {
      status: "pending",
      updatedAt: { lt: since },
    },
    orderBy: { updatedAt: "asc" },
    take: STALE_SAMPLE_CAP,
    select: {
      id: true,
      orderId: true,
      status: true,
      squarePaymentId: true,
      squarePaymentStatus: true,
      amountCents: true,
      updatedAt: true,
      createdAt: true,
    },
  });
}

export async function countStalePendingPaymentOrdersForIntegrity(since: Date): Promise<number> {
  return prisma.commerceOrder.count({
    where: { status: "pending_payment", updatedAt: { lt: since } },
  });
}

export async function countStalePendingPaymentRecordsForIntegrity(since: Date): Promise<number> {
  return prisma.paymentRecord.count({
    where: { status: "pending", updatedAt: { lt: since } },
  });
}

/** `paid` / `partially_fulfilled` shells with zero `completed` PSP mirror rows — same shape as Operational Safety heuristic, extended status set. */
export async function findPaidLikeOrdersWithoutCompletedPayment() {
  return prisma.commerceOrder.findMany({
    where: {
      status: { in: [...PAID_LIKE_ORDER_STATUSES] },
      payments: { none: { status: "completed" } },
    },
    orderBy: { updatedAt: "desc" },
    take: PAID_LIKE_WITHOUT_COMPLETED_CAP,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      totalCents: true,
      payments: {
        select: { id: true, status: true, squarePaymentId: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });
}

export async function countPaidLikeOrdersWithoutCompletedPayment(): Promise<number> {
  return prisma.commerceOrder.count({
    where: {
      status: { in: [...PAID_LIKE_ORDER_STATUSES] },
      payments: { none: { status: "completed" } },
    },
  });
}

/**
 * Fulfillment progressed beyond `{pending}` while aggregate order still looks pre-settlement —
 * heuristic only (draft admin shells, migrations, races).
 */
export async function findFulfillmentAheadOfPrePaymentShellOrders() {
  return prisma.commerceOrder.findMany({
    where: {
      status: { in: [...PRE_PAYMENT_SHELL_STATUSES] },
      fulfillmentGroups: {
        some: { status: { notIn: ["pending", "cancelled"] } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: FULFILLMENT_PAYMENT_MISMATCH_CAP,
    select: {
      id: true,
      status: true,
      updatedAt: true,
      fulfillmentGroups: {
        select: { id: true, pipeline: true, status: true },
      },
    },
  });
}

export async function countFulfillmentAheadOfPrePaymentShellOrders(): Promise<number> {
  return prisma.commerceOrder.count({
    where: {
      status: { in: [...PRE_PAYMENT_SHELL_STATUSES] },
      fulfillmentGroups: {
        some: { status: { notIn: ["pending", "cancelled"] } },
      },
    },
  });
}

/** Square receipts that reconcile flagged as orphans (same code written by PSP ingress). */
export async function findSquareOrphanPaymentWebhookReceipts(since: Date) {
  return prisma.webhookDeliveryReceipt.findMany({
    where: {
      provider: "square",
      receivedAt: { gte: since },
      OR: [{ processingStatus: WebhookProcessingStatus.failed, errorCode: "ORPHAN_NO_LOCAL_PAYMENT" }, { errorCode: "ORPHAN_NO_LOCAL_PAYMENT" }],
    },
    orderBy: { receivedAt: "desc" },
    take: ORPHAN_RECEIPT_CAP,
    select: {
      id: true,
      externalEventId: true,
      eventType: true,
      receivedAt: true,
      processingStatus: true,
      errorCode: true,
      commerceOrderId: true,
      paymentRecordId: true,
      httpStatus: true,
    },
  });
}

export async function countSquareOrphanPaymentWebhookReceipts(since: Date): Promise<number> {
  return prisma.webhookDeliveryReceipt.count({
    where: {
      provider: "square",
      receivedAt: { gte: since },
      OR: [{ processingStatus: WebhookProcessingStatus.failed, errorCode: "ORPHAN_NO_LOCAL_PAYMENT" }, { errorCode: "ORPHAN_NO_LOCAL_PAYMENT" }],
    },
  });
}

export async function findOperationalOrphanWebhookEvents(since: Date) {
  return prisma.operationalActivityEvent.findMany({
    where: {
      type: PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: ORPHAN_OPS_EVENT_CAP,
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      createdAt: true,
      metadata: true,
    },
  });
}

export async function countOperationalOrphanWebhookEvents(since: Date): Promise<number> {
  return prisma.operationalActivityEvent.count({
    where: {
      type: PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
      createdAt: { gte: since },
    },
  });
}

export type RefundLinkageOddityReason = "missing_payment_record" | "payment_order_mismatch";

export type OperationalRefundLinkageOddityRow = {
  id: string;
  status: OperationalRefundCaseStatus;
  commerceOrderId: string;
  paymentRecordId: string | null;
  linkedOrderId: string | null;
  paymentRecordStatus: string | null;
  amountCents: number | null;
  updatedAt: Date;
  reasonTag: RefundLinkageOddityReason;
};

/** Full scan — table is bounded operational volume; favors accurate counts over sampling bias. */
export async function scanOperationalRefundLinkageOddities(): Promise<{
  totalOddities: number;
  sampleRows: OperationalRefundLinkageOddityRow[];
}> {
  const raw = await prisma.operationalRefundCase.findMany({
    where: {
      status: { in: [OperationalRefundCaseStatus.APPROVED, OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      commerceOrderId: true,
      paymentRecordId: true,
      amountCents: true,
      updatedAt: true,
      paymentRecord: {
        select: { id: true, orderId: true, status: true },
      },
    },
  });

  let totalOddities = 0;
  const sampleRows: OperationalRefundLinkageOddityRow[] = [];

  for (const row of raw) {
    const missing = row.paymentRecordId == null || row.paymentRecord == null;
    const mismatch =
      !missing && row.paymentRecord?.orderId != null && row.paymentRecord.orderId !== row.commerceOrderId;
    if (!missing && !mismatch) continue;

    totalOddities++;
    if (sampleRows.length < REFUND_ODDITY_SAMPLE_CAP) {
      sampleRows.push({
        id: row.id,
        status: row.status,
        commerceOrderId: row.commerceOrderId,
        paymentRecordId: row.paymentRecordId,
        linkedOrderId: row.paymentRecord?.orderId ?? null,
        paymentRecordStatus: row.paymentRecord?.status ?? null,
        amountCents: row.amountCents,
        updatedAt: row.updatedAt,
        reasonTag: missing ? "missing_payment_record" : "payment_order_mismatch",
      });
    }
  }

  return { totalOddities, sampleRows };
}
