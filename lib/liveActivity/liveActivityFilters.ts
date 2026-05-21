import type { LiveActivityEvent, LiveActivityEventKind } from "./types";

/**
 * Canonical filter ids for the command-center Live Activity UI.
 * Maps to `LiveActivityEvent.kind` subsets; `ALL` matches everything.
 */
export const LIVE_ACTIVITY_FILTER_IDS = [
  "ALL",
  "ORDERS",
  "CUSTOMERS",
  "ADMINS",
  "ERRORS",
  "SECURITY",
  "PAYMENTS",
  "DELIVERIES",
] as const;

export type LiveActivityFilterId = (typeof LIVE_ACTIVITY_FILTER_IDS)[number];

export const LIVE_ACTIVITY_FILTER_LABEL: Record<LiveActivityFilterId, string> = {
  ALL: "All Activity",
  ORDERS: "Orders",
  CUSTOMERS: "Customers",
  ADMINS: "Admins",
  ERRORS: "Errors",
  SECURITY: "Security",
  PAYMENTS: "Payments",
  DELIVERIES: "Deliveries",
};

/** Kinds surfaced under the “Errors” chip (operational / fault signals). */
const ERROR_KINDS = new Set<LiveActivityEventKind>([
  "INCIDENT_EVENT",
  "SYSTEM_EVENT",
  "PAYMENT_EVENT",
]);

function kindMatchesFilter(filter: LiveActivityFilterId, kind: LiveActivityEventKind): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "ORDERS":
      return kind === "ORDER_EVENT";
    case "CUSTOMERS":
      return kind === "CUSTOMER_EVENT";
    case "ADMINS":
      return kind === "ADMIN_EVENT";
    case "ERRORS":
      return ERROR_KINDS.has(kind);
    case "SECURITY":
      return kind === "SECURITY_EVENT" || kind === "AUTH_EVENT";
    case "PAYMENTS":
      return kind === "PAYMENT_EVENT";
    case "DELIVERIES":
      return kind === "DELIVERY_EVENT";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function matchesSearch(event: LiveActivityEvent, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [
    event.summary,
    event.detail,
    event.kind,
    event.id,
    event.links?.orderId,
    event.links?.userId,
    event.links?.adminId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function filterLiveActivityEvents(
  events: LiveActivityEvent[],
  filter: LiveActivityFilterId,
  searchQuery: string
): LiveActivityEvent[] {
  return events.filter((e) => kindMatchesFilter(filter, e.kind) && matchesSearch(e, searchQuery));
}
