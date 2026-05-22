import {
  OPERATIONAL_MS_PER_DAY,
  OPERATIONAL_MS_PER_HOUR,
  OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS,
} from "@/lib/operations/semantics/constants";
import {
  paymentIntegritySeverityFromCount,
  type PaymentIntegrityUiSeverity,
} from "@/lib/operations/semantics/severity";
import {
  countFulfillmentAheadOfPrePaymentShellOrders,
  countOperationalOrphanWebhookEvents,
  countPaidLikeOrdersWithoutCompletedPayment,
  countSquareOrphanPaymentWebhookReceipts,
  countStalePendingPaymentOrdersForIntegrity,
  countStalePendingPaymentRecordsForIntegrity,
  findFulfillmentAheadOfPrePaymentShellOrders,
  findOperationalOrphanWebhookEvents,
  findPaidLikeOrdersWithoutCompletedPayment,
  findSquareOrphanPaymentWebhookReceipts,
  findStalePendingPaymentOrdersForIntegrity,
  findStalePendingPaymentRecordsForIntegrity,
  readPaymentIntegrityStaleHoursFromEnv,
  scanOperationalRefundLinkageOddities,
  type OperationalRefundLinkageOddityRow,
} from "@/lib/super-admin/paymentIntegrity/queries";

/**
 * Super-admin **coordination** visibility for commerce payments — read-only Postgres summaries.
 *
 * **Square is the PSP authority.** Amounts, captures, refunds, and dispute outcomes are not derived or
 * reconciled here; these checks are **heuristic local mirror** signals only (stale shells, lifecycle drift,
 * webhook orphan receipts). Always validate against Square Dashboard + operational playbooks before acting.
 *
 * @module
 */

/** UI severity for category headers — ordinal bands on row counts (not currency truth). */
export type { PaymentIntegrityUiSeverity };
export { paymentIntegritySeverityFromCount };

export type PaymentIntegrityRefundOddityRow = Omit<OperationalRefundLinkageOddityRow, "updatedAt"> & {
  updatedAt: string;
};

export type PaymentIntegrityCategoryKey =
  | "stalePendingPaymentOrders"
  | "paidLikeWithoutCompletedPayment"
  | "fulfillmentBeforePaymentShell"
  | "stalePendingPaymentRecords"
  | "orphanWebhookLinkage"
  | "refundLinkageOddities";

export type PaymentIntegrityReport = {
  generatedAt: string;
  staleHoursConfigured: number;
  orphanReceiptLookbackDays: number;
  counts: {
    stalePendingPaymentOrders: number;
    paidLikeWithoutCompletedPayment: number;
    fulfillmentBeforePaymentShell: number;
    stalePendingPaymentRecords: number;
    squareOrphanWebhookReceipts: number;
    orphanOperationalActivityEvents: number;
    refundLinkageOddities: number;
  };
  /** Max count driving the orphan linkage section badge (receipts ∪ ops events). */
  orphanLinkageDisplayCount: number;
  severityByCategory: Record<PaymentIntegrityCategoryKey, PaymentIntegrityUiSeverity>;
  rows: {
    stalePendingPaymentOrders: Awaited<ReturnType<typeof findStalePendingPaymentOrdersForIntegrity>>;
    paidLikeWithoutCompletedPayment: Awaited<ReturnType<typeof findPaidLikeOrdersWithoutCompletedPayment>>;
    fulfillmentBeforePaymentShell: Awaited<ReturnType<typeof findFulfillmentAheadOfPrePaymentShellOrders>>;
    stalePendingPaymentRecords: Awaited<ReturnType<typeof findStalePendingPaymentRecordsForIntegrity>>;
    squareOrphanWebhookReceipts: Awaited<ReturnType<typeof findSquareOrphanPaymentWebhookReceipts>>;
    orphanOperationalActivityEvents: Awaited<ReturnType<typeof findOperationalOrphanWebhookEvents>>;
    refundLinkageOddities: PaymentIntegrityRefundOddityRow[];
  };
};

function mapRefundRows(rows: OperationalRefundLinkageOddityRow[]): PaymentIntegrityRefundOddityRow[] {
  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function loadPaymentIntegrityReport(): Promise<PaymentIntegrityReport> {
  const now = Date.now();
  const staleHours = readPaymentIntegrityStaleHoursFromEnv();
  const staleSince = new Date(now - staleHours * OPERATIONAL_MS_PER_HOUR);
  const orphanSince = new Date(now - OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS);

  const refundScanPromise = scanOperationalRefundLinkageOddities();

  const [
    stalePendingOrders,
    stalePendingRecords,
    paidLikeRows,
    fulfillmentShellRows,
    orphanReceipts,
    orphanOpsEvents,
    cStaleOrders,
    cStaleRecords,
    cPaidLike,
    cFulfillment,
    cOrphanReceipts,
    cOrphanOps,
    refundScan,
  ] = await Promise.all([
    findStalePendingPaymentOrdersForIntegrity(staleSince),
    findStalePendingPaymentRecordsForIntegrity(staleSince),
    findPaidLikeOrdersWithoutCompletedPayment(),
    findFulfillmentAheadOfPrePaymentShellOrders(),
    findSquareOrphanPaymentWebhookReceipts(orphanSince),
    findOperationalOrphanWebhookEvents(orphanSince),
    countStalePendingPaymentOrdersForIntegrity(staleSince),
    countStalePendingPaymentRecordsForIntegrity(staleSince),
    countPaidLikeOrdersWithoutCompletedPayment(),
    countFulfillmentAheadOfPrePaymentShellOrders(),
    countSquareOrphanPaymentWebhookReceipts(orphanSince),
    countOperationalOrphanWebhookEvents(orphanSince),
    refundScanPromise,
  ]);

  const cRefundOddities = refundScan.totalOddities;

  const orphanLinkageDisplayCount = Math.max(cOrphanReceipts, cOrphanOps);

  const severityByCategory: Record<PaymentIntegrityCategoryKey, PaymentIntegrityUiSeverity> = {
    stalePendingPaymentOrders: paymentIntegritySeverityFromCount(cStaleOrders),
    paidLikeWithoutCompletedPayment: paymentIntegritySeverityFromCount(cPaidLike),
    fulfillmentBeforePaymentShell: paymentIntegritySeverityFromCount(cFulfillment),
    stalePendingPaymentRecords: paymentIntegritySeverityFromCount(cStaleRecords),
    orphanWebhookLinkage: paymentIntegritySeverityFromCount(orphanLinkageDisplayCount),
    refundLinkageOddities: paymentIntegritySeverityFromCount(cRefundOddities),
  };

  return {
    generatedAt: new Date(now).toISOString(),
    staleHoursConfigured: staleHours,
    orphanReceiptLookbackDays: OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS / OPERATIONAL_MS_PER_DAY,
    counts: {
      stalePendingPaymentOrders: cStaleOrders,
      paidLikeWithoutCompletedPayment: cPaidLike,
      fulfillmentBeforePaymentShell: cFulfillment,
      stalePendingPaymentRecords: cStaleRecords,
      squareOrphanWebhookReceipts: cOrphanReceipts,
      orphanOperationalActivityEvents: cOrphanOps,
      refundLinkageOddities: cRefundOddities,
    },
    orphanLinkageDisplayCount,
    severityByCategory,
    rows: {
      stalePendingPaymentOrders: stalePendingOrders,
      paidLikeWithoutCompletedPayment: paidLikeRows,
      fulfillmentBeforePaymentShell: fulfillmentShellRows,
      stalePendingPaymentRecords: stalePendingRecords,
      squareOrphanWebhookReceipts: orphanReceipts,
      orphanOperationalActivityEvents: orphanOpsEvents,
      refundLinkageOddities: mapRefundRows(refundScan.sampleRows),
    },
  };
}
