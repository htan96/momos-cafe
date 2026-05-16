/** Append-only governance audit verbs (stored in `GovernanceAuditEvent.actionType`). */
export const GOVERNANCE_AUDIT_ACTION_TYPES = [
  "MAINTENANCE_UPDATED",
  "PLATFORM_FEATURE_UPDATED",
  "GOVERNANCE_CONTROL_UPDATED",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "PERSPECTIVE_CHANGED",
  "SESSION_TERMINATED",
] as const;

export type GovernanceAuditActionType = (typeof GOVERNANCE_AUDIT_ACTION_TYPES)[number];
