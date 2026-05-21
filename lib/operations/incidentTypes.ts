/** Persisted `OperationalIncident.type` values — keep in sync with detection rules in `incidentDetection.ts`. */
export const INCIDENT_TYPES = {
  PAYMENT_FAILURE_SPIKE: "PAYMENT_FAILURE_SPIKE",
  AUTH_FAILURE_SPIKE: "AUTH_FAILURE_SPIKE",
  SHIPPO_OUTAGE: "SHIPPO_OUTAGE",
  WEBHOOK_FAILURE_LOOP: "WEBHOOK_FAILURE_LOOP",
  NOTIFICATION_BACKLOG: "NOTIFICATION_BACKLOG",
  /** Active integration row went from `healthy` → `degraded` or `offline` (deduped per `systemKey`). */
  INTEGRATION_DEGRADED: "INTEGRATION_DEGRADED",
  /** Email provider probe or repeated send failures indicate delivery degradation. */
  EMAIL_DELIVERY_DEGRADED: "EMAIL_DELIVERY_DEGRADED",
} as const;

export type IncidentType = (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

export const OPERATIONAL_INCIDENT_ACTIVE_STATUSES = [
  "active",
  "investigating",
  "monitoring",
] as const;

export type OperationalIncidentActiveStatus = (typeof OPERATIONAL_INCIDENT_ACTIVE_STATUSES)[number];
