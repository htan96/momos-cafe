/**
 * Recovery action registry — contracts only for Phase 5.
 *
 * Idempotency: each handler MUST accept a stable idempotency key derived from
 * `{actionId}:{entityId}:{failureEventId}` and reject duplicate side effects within a TTL window.
 *
 * Audit: successful retries MUST append `GovernanceAuditEvent` (super_admin actor) and MAY emit
 * a platform event with lifecycle `processing` → `succeeded` | `failed`.
 */
export type RecoveryActionHandler = "stub" | "route";

export type RecoveryActionDefinition = {
  id: string;
  label: string;
  description: string;
  requiredPermission: "super_admin";
  idempotencyKeyHint: string;
  handler: RecoveryActionHandler;
  /** Populated when handler === 'route' */
  routePath?: string;
  /** Failure subtypes this action applies to (empty = all retryable) */
  applicableSubtypes?: string[];
};

export const RECOVERY_ACTIONS: RecoveryActionDefinition[] = [
  {
    id: "retry_shippo_label",
    label: "Retry Shippo label",
    description: "Re-attempt label purchase for the linked shipment/order.",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_shippo_label:{shipmentId}:{eventId}",
    handler: "route",
    routePath: "/api/ops/shipping/purchase-label",
    applicableSubtypes: ["shipment.label.failed"],
  },
  {
    id: "retry_webhook_reconcile",
    label: "Reconcile webhook",
    description: "Replay Square webhook processing for the correlation id.",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_webhook_reconcile:{webhookEventId}:{eventId}",
    handler: "stub",
    applicableSubtypes: ["payment.webhook.processing_failed", "payment.square.orphan_webhook"],
  },
  {
    id: "retry_payment_reconcile",
    label: "Reconcile payment",
    description: "Re-fetch Square payment state for the commerce order.",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_payment_reconcile:{commerceOrderId}:{eventId}",
    handler: "stub",
    applicableSubtypes: ["payment.failed", "payment.register.failed"],
  },
  {
    id: "resend_email",
    label: "Resend email",
    description: "Re-queue outbound notification for the linked entity.",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "resend_email:{correlationId}:{eventId}",
    handler: "stub",
    applicableSubtypes: ["system.email.send_failed"],
  },
  {
    id: "rerun_catalog_sync",
    label: "Rerun catalog sync",
    description: "Trigger Square catalog hydration.",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "rerun_catalog_sync:{eventId}",
    handler: "route",
    routePath: "/api/square/catalog/sync",
    applicableSubtypes: ["menu.sync.failed"],
  },
];

export function recoveryActionsForSubtype(subtype: string): RecoveryActionDefinition[] {
  return RECOVERY_ACTIONS.filter(
    (a) => !a.applicableSubtypes?.length || a.applicableSubtypes.includes(subtype)
  );
}
