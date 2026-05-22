import { WebhookProcessingStatus } from "@prisma/client";
import type { GovernanceControlKey } from "@/lib/governance/controlKeys";
import { loadGovernanceControlRowsUncached } from "@/lib/governance/governanceControls";
import { PLATFORM_FEATURE_DEFINITIONS, type PlatformFeatureKey } from "@/lib/platform/governanceFeatures";
import { loadPlatformFeatureStateUncached } from "@/lib/platform/platformFeatureState";
import {
  OPERATIONAL_MS_PER_DAY,
  OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS,
  OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS,
  OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS,
  OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS,
} from "@/lib/operations/semantics/constants";
import { prisma } from "@/lib/prisma";

export type OperationalSafetySeverity = "CRITICAL" | "HIGH" | "WARNING" | "INFO";

const WEBHOOK_LOOKBACK_DAYS = OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS / OPERATIONAL_MS_PER_DAY;

/** `commerce_orders.pending_payment` stale heuristic — **`updated_at` older than this many hours** (not `created_at`). */
export const SAFETY_PENDING_PAYMENT_STALE_HOURS =
  OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS / (60 * 60 * 1000);

/** `payment_records.pending` staleness heuristic — PSP row not terminal but **`updated_at` untouched** beyond this horizon. */
export const SAFETY_PAYMENT_PENDING_STALE_HOURS =
  OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS / (60 * 60 * 1000);

/** `NotificationEvent` backlog heuristic — **`processed_at` missing** and **`created_at` older than this many hours**. */
export const SAFETY_NOTIFICATION_STUCK_HOURS =
  OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS / (60 * 60 * 1000);

const FAILURE_TYPE_RECENT_ROWS = 50;

/**
 * Operational safety aggregates for super-admin only.
 *
 * **Query assumptions**
 *
 * | Surface | Interpretation |
 * | ------- | ------------- |
 * | `pending_payment` + stale `updatedAt` | Order shell still awaiting settlement; staleness keyed on **`updated_at`**, comparable to storefront shell churn cadence (`{@link SAFETY_PENDING_PAYMENT_STALE_HOURS}h`). |
 * | `pending_payment` + completed `payment_records` | Lifecycle mismatch heuristic — PSP shows `completed` but aggregate order stayed in `pending_payment`. |
 * | Paid drift (`paid` without `completed` PaymentRecord) | Order claims `paid` but no linked `payment_records` row succeeded — conservative reconciliation signal. |
 * | Fulfillment drift (`fulfilled` + non-terminal groups) | `FulfillmentGroup.status ∉ {completed, cancelled}` while `commerce_orders.status === fulfilled`. |
 * | Notifications | Stuck backlog = **`processed_at` IS NULL AND `created_at` < now − {@link SAFETY_NOTIFICATION_STUCK_HOURS}h** (`started_processing_at` lease handled elsewhere). Outbox **`_process.attempts`** / **`delivery_attempt`** surfaced from JSON payloads in UI — not indexed in SQL. |
 * | Webhook receipts | **`received_at`** trailing **`{@link WEBHOOK_LOOKBACK_DAYS}` days** counts for PSP rows (`square`, `shippo`). Inbound mail today records **`provider = resend`** — SES receipts only appear once that pathway writes **`WebhookDeliveryReceipt`**. |
 *
 * Rows are **read-only heuristics** — label as possible drift where shown.
 */

export type SeveritySummaryCounts = Record<OperationalSafetySeverity, number>;

export type GovernanceFlagSnapshot = {
  key: GovernanceControlKey;
  enabled: boolean;
  title: string;
  updatedAt: string;
  lastModifiedBy: string | null;
};

export type PlatformFeatureFlagSnapshot = {
  key: PlatformFeatureKey;
  enabled: boolean;
  title: string;
  updatedAt: string;
  updatedBy: string | null;
};

export type WebhookProviderRollup = {
  provider: string;
  failed: number;
  ignored: number;
  processed: number;
  accepted: number;
  total: number;
};

export type OperationalSafetyDashboard = {
  generatedAt: string;
  aggregation: OperationalSafetyAggregation;
  summary: SeveritySummaryCounts;
  payments: {
    squareFailedReceipts: Awaited<ReturnType<typeof loadSquareFailedReceipts>>;
    stalePendingPaymentRecords: Awaited<ReturnType<typeof loadStalePendingPaymentRecords>>;
    stalePendingPaymentOrders: Awaited<ReturnType<typeof loadStalePendingPaymentOrders>>;
    pendingPaymentWithCompletedRecord: Awaited<ReturnType<typeof loadPendingPaymentWithCompletedPayment>>;
  };
  webhooks: {
    lookbackDays: number;
    providerRollups: WebhookProviderRollup[];
    recentProblemReceipts: Awaited<ReturnType<typeof loadRecentProblemWebhookReceipts>>;
    distinctProvidersInLookback: string[];
  };
  notifications: {
    stuckCount: number;
    stuckRows: Awaited<ReturnType<typeof loadStuckNotificationEvents>>;
    recentFailureOrDeliveryTypes: Awaited<ReturnType<typeof loadRecentNotificationTypeMatches>>;
  };
  lifecycleDrift: {
    paidWithoutCompletedPayment: Awaited<ReturnType<typeof loadPaidWithoutCompletedPayment>>;
    fulfilledWithActiveGroups: Awaited<ReturnType<typeof loadFulfilledWithActiveGroups>>;
  };
  governance: {
    controls: GovernanceFlagSnapshot[];
    platformFeatures: PlatformFeatureFlagSnapshot[];
  };
};

export type OperationalSafetyAggregation = {
  paidWithoutCompletedPayment: number;
  pendingPaymentVsPaymentMismatch: number;
  stalePendingOrders2h: number;
  stalePaymentRecordsPending2h: number;
  fulfillmentDriftFulfilled: number;
  stuckNotifications1hPlus: number;
  squareWebhookFailed14d: number;
  shippoWebhookFailed14d: number;
  squareWebhookIgnored14d: number;
  shippoWebhookIgnored14d: number;
  governanceRestrictionsEnabled: number;
};

async function loadSquareFailedReceipts() {
  return prisma.webhookDeliveryReceipt.findMany({
    where: {
      provider: "square",
      processingStatus: WebhookProcessingStatus.failed,
    },
    orderBy: { receivedAt: "desc" },
    take: 50,
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

async function loadStalePendingPaymentRecords(since: Date) {
  return prisma.paymentRecord.findMany({
    where: {
      status: "pending",
      updatedAt: { lt: since },
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
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

async function loadStalePendingPaymentOrders(since: Date) {
  return prisma.commerceOrder.findMany({
    where: {
      status: "pending_payment",
      updatedAt: { lt: since },
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
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

async function loadPendingPaymentWithCompletedPayment() {
  return prisma.commerceOrder.findMany({
    where: {
      status: "pending_payment",
      payments: {
        some: { status: "completed" },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: 30,
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

async function loadPaidWithoutCompletedPayment() {
  return prisma.commerceOrder.findMany({
    where: {
      status: "paid",
      payments: {
        none: { status: "completed" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
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

async function loadFulfilledWithActiveGroups() {
  return prisma.commerceOrder.findMany({
    where: {
      status: "fulfilled",
      fulfillmentGroups: {
        some: {
          status: { notIn: ["completed", "cancelled"] },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
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

async function loadStuckNotificationEvents(stuckBefore: Date) {
  return prisma.notificationEvent.findMany({
    where: {
      processedAt: null,
      createdAt: { lt: stuckBefore },
    },
    orderBy: { createdAt: "asc" },
    take: 75,
    select: {
      id: true,
      type: true,
      createdAt: true,
      startedProcessingAt: true,
      processedAt: true,
      payload: true,
    },
  });
}

async function loadRecentNotificationTypeMatches() {
  return prisma.notificationEvent.findMany({
    where: {
      OR: [
        { type: { contains: "failed", mode: "insensitive" } },
        { type: { contains: "delivery", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: FAILURE_TYPE_RECENT_ROWS,
    select: {
      id: true,
      type: true,
      createdAt: true,
      processedAt: true,
      startedProcessingAt: true,
      payload: true,
    },
  });
}

async function loadRecentProblemWebhookReceipts(since: Date) {
  return prisma.webhookDeliveryReceipt.findMany({
    where: {
      provider: { in: ["square", "shippo"] },
      processingStatus: { in: [WebhookProcessingStatus.failed, WebhookProcessingStatus.ignored] },
      receivedAt: { gte: since },
    },
    orderBy: { receivedAt: "desc" },
    take: 80,
    select: {
      id: true,
      provider: true,
      externalEventId: true,
      eventType: true,
      receivedAt: true,
      processingStatus: true,
      errorCode: true,
      commerceOrderId: true,
    },
  });
}

function rollupWebhookStatuses(
  rows: { provider: string; processingStatus: WebhookProcessingStatus; _count: { _all: number } }[]
): WebhookProviderRollup[] {
  const map = new Map<string, WebhookProviderRollup>();
  for (const r of rows) {
    const cur =
      map.get(r.provider) ??
      ({
        provider: r.provider,
        failed: 0,
        ignored: 0,
        processed: 0,
        accepted: 0,
        total: 0,
      } satisfies WebhookProviderRollup);
    cur.total += r._count._all;
    if (r.processingStatus === WebhookProcessingStatus.failed) cur.failed += r._count._all;
    else if (r.processingStatus === WebhookProcessingStatus.ignored) cur.ignored += r._count._all;
    else if (r.processingStatus === WebhookProcessingStatus.processed) cur.processed += r._count._all;
    else if (r.processingStatus === WebhookProcessingStatus.accepted) cur.accepted += r._count._all;
    map.set(r.provider, cur);
  }
  return [...map.values()].sort((a, b) => a.provider.localeCompare(b.provider));
}

function buildGovernanceSnapshots(
  rows: Awaited<ReturnType<typeof loadGovernanceControlRowsUncached>>
): GovernanceFlagSnapshot[] {
  return rows
    .map((row) => {
      const md =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const titleFromMeta = typeof md.title === "string" ? md.title : row.key.replace(/_/g, " ");
      return {
        key: row.key,
        enabled: row.enabled,
        title: titleFromMeta,
        updatedAt: row.updatedAt.toISOString(),
        lastModifiedBy: row.lastModifiedBy,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Derives UX severity cards from Postgres counts (no mocks). Bands are ordinal — not exhaustive of every surfaced row. */
function buildSeveritySummary(agg: OperationalSafetyAggregation): SeveritySummaryCounts {
  const CRITICAL = agg.paidWithoutCompletedPayment + agg.pendingPaymentVsPaymentMismatch;
  const HIGH =
    agg.stuckNotifications1hPlus +
    agg.stalePendingOrders2h +
    agg.stalePaymentRecordsPending2h +
    agg.squareWebhookFailed14d +
    agg.shippoWebhookFailed14d;
  const WARNING = agg.fulfillmentDriftFulfilled + agg.governanceRestrictionsEnabled;
  const INFO = agg.squareWebhookIgnored14d + agg.shippoWebhookIgnored14d;

  return { CRITICAL, HIGH, WARNING, INFO };
}

export function readNotificationOutboxAttempts(payload: unknown): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const proc = (payload as Record<string, unknown>)._process;
  if (!proc || typeof proc !== "object" || Array.isArray(proc)) return null;
  const p = proc as Record<string, unknown>;
  const attempts = p.attempts ?? p.delivery_attempt;
  return typeof attempts === "number" && Number.isFinite(attempts) ? attempts : null;
}

export async function loadOperationalSafetyDashboard(): Promise<OperationalSafetyDashboard> {
  const now = Date.now();
  const webhookSince = new Date(now - OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS);
  const pendingStaleSince = new Date(now - OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS);
  const stuckNotificationBefore = new Date(now - OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS);
  const paymentStaleSince = new Date(now - OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS);

  const [
    squareFailedReceiptRows,
    stalePendingRecords,
    stalePendingOrdersRows,
    pendingWithCompletedPayment,
    paidWithoutCompletedPayment,
    fulfilledWithActiveGroupsRows,
    stuckRows,
    recentTypeMatches,
    recentProblemWebhookRows,
    webhookGrouped,
    distinctWebhookProvidersRows,
    paidWithoutCompletedCount,
    pendingPaymentMismatchCount,
    fulfillmentDriftCount,
    stalePendingOrdersCount,
    stalePendingRecordsCount,
    squareFailedWindowCount,
    shippoFailedWindowCount,
    webhookIgnoredSquare,
    webhookIgnoredShippo,
    stuckNotificationsCount,
    governanceRows,
    platformState,
  ] = await Promise.all([
    loadSquareFailedReceipts(),
    loadStalePendingPaymentRecords(paymentStaleSince),
    loadStalePendingPaymentOrders(pendingStaleSince),
    loadPendingPaymentWithCompletedPayment(),
    loadPaidWithoutCompletedPayment(),
    loadFulfilledWithActiveGroups(),
    loadStuckNotificationEvents(stuckNotificationBefore),
    loadRecentNotificationTypeMatches(),
    loadRecentProblemWebhookReceipts(webhookSince),
    prisma.webhookDeliveryReceipt.groupBy({
      by: ["provider", "processingStatus"],
      where: {
        provider: { in: ["square", "shippo"] },
        receivedAt: { gte: webhookSince },
      },
      _count: { _all: true },
    }),
    prisma.webhookDeliveryReceipt.findMany({
      where: { receivedAt: { gte: webhookSince } },
      distinct: ["provider"],
      select: { provider: true },
    }),
    prisma.commerceOrder.count({
      where: { status: "paid", payments: { none: { status: "completed" } } },
    }),
    prisma.commerceOrder.count({
      where: { status: "pending_payment", payments: { some: { status: "completed" } } },
    }),
    prisma.commerceOrder.count({
      where: {
        status: "fulfilled",
        fulfillmentGroups: { some: { status: { notIn: ["completed", "cancelled"] } } },
      },
    }),
    prisma.commerceOrder.count({
      where: { status: "pending_payment", updatedAt: { lt: pendingStaleSince } },
    }),
    prisma.paymentRecord.count({
      where: { status: "pending", updatedAt: { lt: paymentStaleSince } },
    }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: "square",
        processingStatus: WebhookProcessingStatus.failed,
        receivedAt: { gte: webhookSince },
      },
    }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: "shippo",
        processingStatus: WebhookProcessingStatus.failed,
        receivedAt: { gte: webhookSince },
      },
    }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: "square",
        processingStatus: WebhookProcessingStatus.ignored,
        receivedAt: { gte: webhookSince },
      },
    }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: "shippo",
        processingStatus: WebhookProcessingStatus.ignored,
        receivedAt: { gte: webhookSince },
      },
    }),
    prisma.notificationEvent.count({
      where: { processedAt: null, createdAt: { lt: stuckNotificationBefore } },
    }),
    loadGovernanceControlRowsUncached(),
    loadPlatformFeatureStateUncached(),
  ]);

  const governanceSnapshots = buildGovernanceSnapshots(governanceRows);
  const restrictiveKeys = new Set<GovernanceControlKey>([
    "checkout_disabled",
    "ordering_disabled",
    "storefront_read_only",
    "maintenance_mode",
    "menu_hidden",
    "registrations_disabled",
  ]);
  const governanceRestrictionsEnabled = governanceSnapshots.filter((g) => restrictiveKeys.has(g.key) && g.enabled).length;

  const aggregation: OperationalSafetyAggregation = {
    paidWithoutCompletedPayment: paidWithoutCompletedCount,
    pendingPaymentVsPaymentMismatch: pendingPaymentMismatchCount,
    stalePendingOrders2h: stalePendingOrdersCount,
    stalePaymentRecordsPending2h: stalePendingRecordsCount,
    fulfillmentDriftFulfilled: fulfillmentDriftCount,
    stuckNotifications1hPlus: stuckNotificationsCount,
    squareWebhookFailed14d: squareFailedWindowCount,
    shippoWebhookFailed14d: shippoFailedWindowCount,
    squareWebhookIgnored14d: webhookIgnoredSquare,
    shippoWebhookIgnored14d: webhookIgnoredShippo,
    governanceRestrictionsEnabled,
  };

  const platformFeatureSnapshots: PlatformFeatureFlagSnapshot[] = (
    Object.keys(platformState) as PlatformFeatureKey[]
  )
    .map((key) => ({
      key,
      enabled: platformState[key].enabled,
      title: PLATFORM_FEATURE_DEFINITIONS[key].title,
      updatedAt: platformState[key].updatedAt.toISOString(),
      updatedBy: platformState[key].updatedBy,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    generatedAt: new Date(now).toISOString(),
    aggregation,
    summary: buildSeveritySummary(aggregation),
    payments: {
      squareFailedReceipts: squareFailedReceiptRows,
      stalePendingPaymentRecords: stalePendingRecords,
      stalePendingPaymentOrders: stalePendingOrdersRows,
      pendingPaymentWithCompletedRecord: pendingWithCompletedPayment,
    },
    webhooks: {
      lookbackDays: WEBHOOK_LOOKBACK_DAYS,
      providerRollups: rollupWebhookStatuses(webhookGrouped),
      recentProblemReceipts: recentProblemWebhookRows,
      distinctProvidersInLookback: distinctWebhookProvidersRows.map((r) => r.provider).sort(),
    },
    notifications: {
      stuckCount: stuckNotificationsCount,
      stuckRows,
      recentFailureOrDeliveryTypes: recentTypeMatches,
    },
    lifecycleDrift: {
      paidWithoutCompletedPayment,
      fulfilledWithActiveGroups: fulfilledWithActiveGroupsRows,
    },
    governance: {
      controls: governanceSnapshots,
      platformFeatures: platformFeatureSnapshots,
    },
  };
}
