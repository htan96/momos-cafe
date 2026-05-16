/** Persisted `IntegrationHealthSnapshot.systemKey` — keep in sync with check implementations. */
export const INTEGRATION_SYSTEM_KEYS = {
  DATABASE: "database",
  COGNITO: "cognito",
  SQUARE: "square",
  SHIPPO: "shippo",
  EMAIL: "email",
  INTERNAL_API: "internal_api",
} as const;

export type IntegrationSystemKey =
  (typeof INTEGRATION_SYSTEM_KEYS)[keyof typeof INTEGRATION_SYSTEM_KEYS];

export type IntegrationHealthCategory = "data" | "auth" | "commerce" | "shipping" | "comms" | "platform";

export type IntegrationHealthStatus = "healthy" | "degraded" | "offline" | "unknown";

export type IntegrationHealthCheckResult = {
  systemKey: IntegrationSystemKey;
  category: IntegrationHealthCategory;
  currentStatus: IntegrationHealthStatus;
  /** Measured round-trip when a real request succeeded; otherwise null. */
  latencyMs: number | null;
  /** Reserved — only set when derived from stored check history (not used in MVP). */
  failureRate: number | null;
  lastErrorMessage: string | null;
  metadata: Record<string, unknown> | null;
};

/** Display order for Live Operations (stable, not DB order). */
export const INTEGRATION_HEALTH_DISPLAY_ORDER: readonly IntegrationSystemKey[] = [
  INTEGRATION_SYSTEM_KEYS.DATABASE,
  INTEGRATION_SYSTEM_KEYS.COGNITO,
  INTEGRATION_SYSTEM_KEYS.SQUARE,
  INTEGRATION_SYSTEM_KEYS.SHIPPO,
  INTEGRATION_SYSTEM_KEYS.EMAIL,
  INTEGRATION_SYSTEM_KEYS.INTERNAL_API,
];
