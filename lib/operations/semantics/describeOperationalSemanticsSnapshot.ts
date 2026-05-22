import { readPaymentIntegrityStaleHoursFromEnv } from "@/lib/super-admin/paymentIntegrity/queries";
import { OPERATIONAL_MS_PER_DAY, OPERATIONAL_MS_PER_HOUR } from "./constants";
import { OPERATIONAL_THRESHOLD_GROUPS } from "./thresholdGroups";

function fmtMs(ms: number): string {
  if (ms >= OPERATIONAL_MS_PER_DAY && ms % OPERATIONAL_MS_PER_DAY === 0) return `${ms / OPERATIONAL_MS_PER_DAY}d`;
  if (ms >= OPERATIONAL_MS_PER_HOUR && ms % OPERATIONAL_MS_PER_HOUR === 0) return `${ms / OPERATIONAL_MS_PER_HOUR}h`;
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000}m`;
  return `${ms}ms`;
}

/** Operator escalation: deterministic heuristics, human judgment before mutating commerce state — see docs. */
export function operationalEscalationGuidelines(): string[] {
  return [
    "Treat Operational Safety / integrity surfaces as mirrored heuristics; Square/Shippo/SES dashboards remain authorities for financial and deliverability truth.",
    "Escalate in order: confirm env/readiness drift → correlate webhook receipts vs outbox backlog → replay only via documented super-admin replay paths (never mute verification).",
    "Pager/webhook escalation is intentionally out of scope — operator-led review with repeatable thresholds (this module).",
  ];
}

/**
 * Read-only string lines suitable for dashboards (readiness,safety previews). No Postgres; payment stale hours reads env like production loaders.
 */
export function describeOperationalSemanticsSnapshot(): string[] {
  const g = OPERATIONAL_THRESHOLD_GROUPS;
  const staleHoursEffective = readPaymentIntegrityStaleHoursFromEnv();

  return [
    `[paymentIntegrity] Stale PSP/shell horizon: effective ${staleHoursEffective}h (env PAYMENT_INTEGRITY_STALE_HOURS · default ${g.paymentIntegrity.staleShellAndPspRowDefaultHours}h)`,
    `[paymentIntegrity] Orphan Square receipt lookback: ${fmtMs(g.paymentIntegrity.orphanSquareReceiptLookbackMs)}`,
    `[operationalSafety] Webhook receipt rollup: ${fmtMs(g.operationalSafety.webhookReceiptRollupLookbackMs)}`,
    `[operationalSafety] Pending payment order staleness (${fmtMs(g.operationalSafety.stalePendingCommerceOrderPaymentMs)} on updated_at)`,
    `[operationalSafety] Pending payment record staleness (${fmtMs(g.operationalSafety.stalePendingPaymentRecordMs)} on updated_at)`,
    `[operationalSafety] Stuck notifications (${fmtMs(g.operationalSafety.stuckNotificationWithoutProcessedAtMs)} created_at horizon, processed_at null)`,
    `[notificationHealth] Backlog freshness buckets vs ${fmtMs(g.notificationHealthUi.pendingFreshLessThanMs)} / ${fmtMs(g.notificationHealthUi.dayWindowMs)} / ${fmtMs(g.notificationHealthUi.thirtyDayWindowMs)}`,
    `[notificationOutbox] Processing lease TTL: ${fmtMs(g.notificationOutbox.processingLeaseMs)} (cron clears stale started_processing_at)`,
    `[notificationOutbox] Retry budget: ≤${String(g.notificationOutbox.retryMaxAttempts)} attempts · base backoff ${fmtMs(g.notificationOutbox.retryBaseDelayMs)} (mirror of lib/notifications/processorContract.ts DEFAULT_NOTIFICATION_RETRY_POLICY)`,
    `[lifecycleScanner] Ignore terminal-order notification drift younger than ${fmtMs(g.lifecycleScanners.terminalOrderNotificationIgnoreYoungerThanMs)}`,
    `[lifecycleScanner] Mid-transit shipment stale without update ${fmtMs(g.lifecycleScanners.shipmentMidTransitStaleWithoutUpdateMs)}`,
    `[lifecycleScanner] Shippo orphan receipt window ${fmtMs(g.lifecycleScanners.shippoOrphanReceiptWindowMs)}`,
    `[shipments] Shippo ops visibility window ${fmtMs(g.shipmentWebhooks.trailingOpsReceiptVisibilityMs)}`,
    `[opsDash] Paid/partial fulfillment “stuck” hint when order.updatedAt older than ${fmtMs(g.opsDashboards.stalePaidFulfillmentHintMs)}`,
    ...operationalEscalationGuidelines().map((s) => `[escalation] ${s}`),
  ];
}
