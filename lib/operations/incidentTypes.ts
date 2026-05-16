/** Persisted `OperationalIncident.type` values — keep in sync with detection rules in `incidentDetection.ts`. */
export const INCIDENT_TYPES = {
  PAYMENT_FAILURE_SPIKE: "PAYMENT_FAILURE_SPIKE",
  /** Active integration row went from `healthy` → `degraded` or `offline` (deduped per `systemKey`). */
  INTEGRATION_DEGRADED: "INTEGRATION_DEGRADED",
} as const;

export type IncidentType = (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

export const OPERATIONAL_INCIDENT_ACTIVE_STATUSES = [
  "active",
  "investigating",
  "monitoring",
] as const;

export type OperationalIncidentActiveStatus = (typeof OPERATIONAL_INCIDENT_ACTIVE_STATUSES)[number];
