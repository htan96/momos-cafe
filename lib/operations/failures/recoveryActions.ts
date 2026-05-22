/**
 * Recovery action registry — contracts for Operations → Failures detail panel.
 *
 * Idempotency: each handler SHOULD accept a stable idempotency key derived from
 * `{actionId}:{entityId}:{failureEventId}` once side-effect routes land.
 *
 * Audit: successful retries append `GovernanceAuditEvent` on super-admin routes
 * (`/api/super-admin/operations/recovery/*`).
 */
export type RecoveryActionHandler = "stub" | "route" | "super_admin_api";

export type RecoveryActionDefinition = {
  id: string;
  label: string;
  description: string;
  requiredPermission: "super_admin";
  idempotencyKeyHint: string;
  handler: RecoveryActionHandler;
  /** Populated when handler === 'route' (legacy ops session paths) */
  routePath?: string;
  /** Preferred super-admin JSON API (session cookie auth) */
  superAdminApiPath?: string;
  httpMethod?: "POST" | "GET" | "PATCH";
  /** Failure subtypes this action applies to (empty = all retryable) */
  applicableSubtypes?: string[];
};

export const RECOVERY_RESEND_EMAIL_TOOLTIP =
  "`POST /api/email/send` expects explicit to/subject/html and a thread id (or commerceOrderId to discover a thread). There is no allow-listed template idempotency path — staff must resend from the email console to avoid duplicate customer mail.";

export const RECOVERY_ACTIONS: RecoveryActionDefinition[] = [
  {
    id: "retry_shippo_label",
    label: "Retry Shippo label",
    description: "Re-attempt label purchase for the linked shipment/order (super-admin audited).",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_shippo_label:{shipmentId}:{eventId}",
    handler: "super_admin_api",
    superAdminApiPath: "/api/super-admin/operations/recovery/shippo-label",
    httpMethod: "POST",
    applicableSubtypes: ["shipment.label.failed"],
  },
  {
    id: "retry_webhook_reconcile",
    label: "Reconcile webhook",
    description:
      "Re-fetch Square payment by id / payment record id and rerun local reconcile (read-only PSP GET; audited).",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_webhook_reconcile:{webhookEventId}:{eventId}",
    handler: "super_admin_api",
    superAdminApiPath: "/api/super-admin/operations/recovery/square-payment-lookup",
    httpMethod: "POST",
    applicableSubtypes: ["payment.webhook.processing_failed", "payment.square.orphan_webhook"],
  },
  {
    id: "retry_payment_reconcile",
    label: "Reconcile payment",
    description:
      "Re-fetch Square payment for the commerce order / payment row and rerun local reconcile (read-only PSP GET; audited).",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "retry_payment_reconcile:{commerceOrderId}:{eventId}",
    handler: "super_admin_api",
    superAdminApiPath: "/api/super-admin/operations/recovery/square-payment-lookup",
    httpMethod: "POST",
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
    description: "Trigger Square catalog hydration (super-admin; bypasses internal secret header).",
    requiredPermission: "super_admin",
    idempotencyKeyHint: "rerun_catalog_sync:{eventId}",
    handler: "super_admin_api",
    superAdminApiPath: "/api/super-admin/operations/recovery/catalog-sync",
    httpMethod: "POST",
    applicableSubtypes: ["menu.sync.failed"],
  },
];

export type RecoveryActionExecutionRequest = {
  actionId: string;
  /** Super-admin recovery routes only today */
  shipmentId?: string;
  commerceOrderId?: string;
  failureEventId?: string;
};

/**
 * Placeholder for eventual server-orchestrated recovery fan-out. Today individual
 * routes own side effects; callers should prefer `superAdminApiPath` fetches.
 */
export async function executeRecoveryAction(_request: RecoveryActionExecutionRequest): Promise<never> {
  throw new Error("executeRecoveryAction is not wired — call /api/super-admin/operations/recovery/* directly");
}

export function recoveryActionsForSubtype(subtype: string): RecoveryActionDefinition[] {
  return RECOVERY_ACTIONS.filter(
    (a) => !a.applicableSubtypes?.length || a.applicableSubtypes.includes(subtype)
  );
}
