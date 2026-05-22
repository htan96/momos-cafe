/** Append-only governance audit verbs (stored in `GovernanceAuditEvent.actionType`). */
export const GOVERNANCE_AUDIT_ACTION_TYPES = [
  "MAINTENANCE_UPDATED",
  "PLATFORM_FEATURE_UPDATED",
  "GOVERNANCE_CONTROL_UPDATED",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "PERSPECTIVE_CHANGED",
  "SESSION_TERMINATED",
  "USER_ROLE_CHANGED",
  "ADMIN_PROMOTED",
  "ADMIN_DEMOTED",
  "OPERATIONAL_FAILURE_TRIAGE_UPDATED",
  "OPERATIONS_SHIPPO_LABEL_RECOVERY_ATTEMPTED",
  "OPERATIONS_SHIPPO_LABEL_RECOVERY_SUCCEEDED",
  "OPERATIONS_CATALOG_SYNC_SUCCEEDED",
  "OPERATIONS_CATALOG_SYNC_FAILED",
  "OPERATIONS_SQUARE_PAYMENT_LOOKUP_RECONCILE",
  /** Cognito global sign-out / token revoke not wired — audit-only stub (see revoke-sessions API route). */
  "CUSTOMER_COGNITO_SESSION_REVOKE_DEFERRED",
  "OPERATIONAL_INCIDENT_UPDATED",
  /** Ops/super-admin `OperationalSupportIssue` create/update lifecycle. */
  "OPERATIONAL_SUPPORT_ISSUE_UPDATED",
  /** Ops/super-admin `OperationalRefundCase` create/update lifecycle (approval + Square hook). */
  "OPERATIONAL_REFUND_CASE_UPDATED",
  /** Ops desk internal coordination note pinned to timelines. */
  "OPERATIONAL_COMMUNICATION_NOTE_CREATED",
  "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
  "OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE",
  /** Ops/super-admin: release stale `started_processing_at` lease or deliberate dead-letter rewind (risky — see docs on route). */
  "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
] as const;

export type GovernanceAuditActionType = (typeof GOVERNANCE_AUDIT_ACTION_TYPES)[number];
