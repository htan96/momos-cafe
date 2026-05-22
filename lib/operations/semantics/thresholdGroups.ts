import type { OperationalFourTierSeverity } from "./severity";
import * as C from "./constants";

/**
 * Threshold groups for dashboards, docs, and [`describeOperationalSemanticsSnapshot`](../describeOperationalSemanticsSnapshot.ts).
 * Values here are logical names over `constants.ts`; env-driven horizons are described in prose + resolved at snapshot time.
 */
export const OPERATIONAL_THRESHOLD_GROUPS = {
  paymentIntegrity: {
    /** Keyed `.env.example`: `PAYMENT_INTEGRITY_STALE_HOURS` (hours, min 1). */
    staleShellAndPspRowDefaultHours: C.OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS,
    staleSnapshotDefaultMs: C.OPERATIONAL_STALE_PAYMENT_SNAPSHOT_DEFAULT_MS,
    orphanSquareReceiptLookbackMs: C.OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS,
    staleSamplesCap: C.OPERATIONAL_PAYMENT_STALE_SAMPLE_CAP,
    uiCountElevatesToHigh: C.OPERATIONAL_PAYMENT_INTEGRITY_UI_COUNT_HIGH_THRESHOLD,
    /** Three-tier ladder: ordinal map `PAYMENT_INTEGRITY_UI_SEVERITY_RANK` in `./severity.ts`. */
    uiSeverityLadderUi: ["INFO", "WARNING", "HIGH"] as const satisfies readonly string[],
    /** Lifecycle / coordination uses four tiers (see `./severity.ts`). */
    coordinationSeverityLadderFour: ["CRITICAL", "HIGH", "WARNING", "INFO"] as const satisfies readonly OperationalFourTierSeverity[],
  },
  operationalSafety: {
    webhookReceiptRollupLookbackMs: C.OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS,
    stalePendingCommerceOrderPaymentMs: C.OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS,
    stalePendingPaymentRecordMs: C.OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS,
    stuckNotificationWithoutProcessedAtMs: C.OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS,
  },
  notificationHealthUi: {
    pendingFreshLessThanMs: C.OPERATIONAL_NOTIFICATION_HEALTH_PENDING_FRESH_WINDOW_MS,
    dayWindowMs: C.OPERATIONAL_NOTIFICATION_HEALTH_DAY_WINDOW_MS,
    thirtyDayWindowMs: C.OPERATIONAL_NOTIFICATION_HEALTH_THIRTY_DAY_WINDOW_MS,
  },
  notificationOutbox: {
    processingLeaseMs: C.OPERATIONAL_NOTIFICATION_OUTBOX_SINGLE_FLIGHT_LEASE_MS,
    retryMaxAttempts: C.OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS,
    retryBaseDelayMs: C.OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_BASE_DELAY_MS,
  },
  lifecycleScanners: {
    terminalOrderNotificationIgnoreYoungerThanMs: C.OPERATIONAL_LIFECYCLE_NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS,
    shipmentMidTransitStaleWithoutUpdateMs: C.OPERATIONAL_LIFECYCLE_SHIPMENT_MID_TRANSIT_STALE_MS,
    shippoOrphanReceiptWindowMs: C.OPERATIONAL_LIFECYCLE_SHIPPO_ORPHAN_RECEIPT_WINDOW_MS,
  },
  shipmentWebhooks: {
    trailingOpsReceiptVisibilityMs: C.OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS,
  },
  opsDashboards: {
    stalePaidFulfillmentHintMs: C.OPERATIONAL_OPS_FULFILLMENT_GROUP_STALE_ORDER_UPDATE_MS,
  },
} as const;

export type OperationalThresholdGroups = typeof OPERATIONAL_THRESHOLD_GROUPS;
