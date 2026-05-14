/** Values suitable for persisted audit_logs.action later. */
export const AUDIT_ACTION_TYPES = [
  "session.login",
  "session.logout",
  "order.status.changed",
  "fulfillment.transition",
  "shipment.created",
  "settings.updated",
  "role.assertion_failed",
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export type SecuritySignalStub =
  | { kind: "auth.anomaly_geo"; severity: "low" | "medium" | "high"; detail?: string }
  | { kind: "auth.rate_limited"; path: string; ipHash?: string }
  | { kind: "payments.chargeback_suspected"; merchantRef?: string };
