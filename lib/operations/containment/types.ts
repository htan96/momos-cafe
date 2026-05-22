/**
 * **Signal + visibility only** — advisory containment cues for operators.
 * No persistence, no automation, no order/webhook/integration mutation.
 */

import type { LifecycleIntegritySeverity } from "@/lib/commerce/lifecycleIntegrity/types";

/**
 * Aligned with `LifecycleIntegritySeverity` / operational safety cardinal bands (`lib/super-admin/operationalSafety`).
 * `lib/operations/semantics` does not exist in-repo; reuse this ordinal scale for escalation sorting.
 */
export type ContainmentSeverity = LifecycleIntegritySeverity;

/**
 * Stable machine keys for dashboards, docs, and future governance hooks (still non-enforcing).
 */
export type ContainmentSignalKind =
  | "lifecycle.payment_shell_critical_drift"
  | "lifecycle.fulfillment_before_payment_shell"
  | "lifecycle.payment_pipeline_stalled"
  | "lifecycle.refund_linkage_break"
  | "lifecycle.coordinate_review_other_high"
  | "lifecycle.coordinate_review_warning"
  | "webhook.receipt_repeat_replays"
  | "failure_triage.active_queue_pressure"
  | "notifications.dead_letter_attempt_cap"
  | "notifications.operator_requeue_churn";

export type ContainmentRecommendation = {
  kind: ContainmentSignalKind;
  severity: ContainmentSeverity;
  rationale: string[];
  evidenceRefs: string[];
  suggestedOperatorActions: string[];
  /** App-router paths (`/super-admin/...`) and doc paths (`docs/...`). */
  relatedDashboardLinks: string[];
};
