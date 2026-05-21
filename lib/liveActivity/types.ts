/**
 * Canonical event model for Super Admin → Live Activity.
 * Wire a server action, route handler, or WebSocket consumer to map backend payloads into these unions.
 */

export type LiveActivitySeverity = "info" | "notice" | "warning" | "error" | "critical";

export type LiveActivityEventKind =
  | "ORDER_EVENT"
  | "PAYMENT_EVENT"
  | "AUTH_EVENT"
  | "ADMIN_EVENT"
  | "CUSTOMER_EVENT"
  | "DELIVERY_EVENT"
  | "SYSTEM_EVENT"
  | "SECURITY_EVENT"
  | "INCIDENT_EVENT";

/** Optional deep-link targets for super-admin ops routes. */
export type LiveActivityEventLinks = {
  userId?: string;
  orderId?: string;
  adminId?: string;
  customerId?: string;
  shipmentId?: string;
};

export type LiveActivityJumpLink = { href: string; label: string };

type LiveActivityEventBase = {
  id: string;
  severity: LiveActivitySeverity;
  /** ISO 8601 timestamp from the authoritative source. */
  occurredAt: string;
  summary: string;
  /** Persisted dotted subtype (`OperationalActivityEvent.type`). */
  subtype: string;
  links?: LiveActivityEventLinks;
  jumpLinks?: LiveActivityJumpLink[];
  source?: string | null;
  actorLabel?: string | null;
  /** Active incidents whose `sourceEventIds` include this row. */
  incidentIds?: string[];
};

export type LiveActivityOrderEvent = LiveActivityEventBase & {
  kind: "ORDER_EVENT";
  detail?: string;
};

export type LiveActivityPaymentEvent = LiveActivityEventBase & {
  kind: "PAYMENT_EVENT";
  detail?: string;
};

export type LiveActivityAuthEvent = LiveActivityEventBase & {
  kind: "AUTH_EVENT";
  detail?: string;
};

export type LiveActivityAdminEvent = LiveActivityEventBase & {
  kind: "ADMIN_EVENT";
  detail?: string;
};

export type LiveActivityCustomerEvent = LiveActivityEventBase & {
  kind: "CUSTOMER_EVENT";
  detail?: string;
};

export type LiveActivityDeliveryEvent = LiveActivityEventBase & {
  kind: "DELIVERY_EVENT";
  detail?: string;
};

export type LiveActivitySystemEvent = LiveActivityEventBase & {
  kind: "SYSTEM_EVENT";
  detail?: string;
};

export type LiveActivitySecurityEvent = LiveActivityEventBase & {
  kind: "SECURITY_EVENT";
  detail?: string;
};

export type LiveActivityIncidentEvent = LiveActivityEventBase & {
  kind: "INCIDENT_EVENT";
  detail?: string;
};

export type LiveActivityEvent =
  | LiveActivityOrderEvent
  | LiveActivityPaymentEvent
  | LiveActivityAuthEvent
  | LiveActivityAdminEvent
  | LiveActivityCustomerEvent
  | LiveActivityDeliveryEvent
  | LiveActivitySystemEvent
  | LiveActivitySecurityEvent
  | LiveActivityIncidentEvent;

/** Surface / connection state for the feed header (no fabricated uptime or SLA metrics). */
export type LiveActivitySurfaceState = "standing_by" | "monitoring" | "paused" | "stale";

export type LiveActivityFeedResponse = {
  events: LiveActivityEvent[];
  nextCursor: string | null;
  fetchedAt: string;
  pollingIntervalMs: number;
};

export type LiveActivitySnapshotIncident = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  lastDetectedAt: string | null;
};

export type LiveActivitySnapshotsResponse = {
  fetchedAt: string;
  activeIncidents: { count: number; top: LiveActivitySnapshotIncident[] };
  degradedIntegrations: {
    systemKey: string;
    currentStatus: string;
    lastErrorMessage: string | null;
  }[];
  failedPaymentsToday: number;
  webhookFailuresCount: number;
  authFailureSpike: { count: number; threshold: number; elevated: boolean };
  notificationBacklog: number;
  queueHealth: {
    lateOrStuckFulfillment: number;
    pendingOrchestrationEvents: number;
  };
};

/**
 * Future hook points when wiring polling, SSE, or WebSocket — keep serialization boundary explicit
 * (cursor opaque string from API, interval in ms, optional ws url).
 */
export type LiveActivityFeedState = {
  events: LiveActivityEvent[];
  /** Opaque pagination cursor from the upstream feed. */
  cursor: string | null;
  /** Preferred client polling interval once a source exists (server may override). */
  pollingIntervalMs: number | null;
  /** Optional WebSocket URL when the feed moves to push. */
  websocketUrl: string | null;
  /** Client or server hint that long-lived subscriptions persist across navigations. */
  persistSubscription: boolean;
};
