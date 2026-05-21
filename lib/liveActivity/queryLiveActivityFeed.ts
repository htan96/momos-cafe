import type { OperationalActivitySeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPERATIONAL_FAILURE_TYPES } from "@/lib/operations/failures/failureSubtypes";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import type { PlatformEventCategory } from "@/lib/platform/events/taxonomy";
import { mapPlatformEventToLiveActivity } from "./mapPlatformEventToLiveActivity";
import {
  LIVE_ACTIVITY_FILTER_IDS,
  type LiveActivityFilterId,
} from "./liveActivityFilters";
import type { LiveActivityEvent, LiveActivityFeedResponse } from "./types";

export const LIVE_ACTIVITY_DEFAULT_LIMIT = 50;
export const LIVE_ACTIVITY_MAX_LIMIT = 100;
export const LIVE_ACTIVITY_DEFAULT_POLLING_MS = 20_000;

export type LiveActivityFeedQuery = {
  cursor?: string;
  limit?: number;
  filter?: LiveActivityFilterId;
  category?: PlatformEventCategory;
  subtype?: string;
  severity?: OperationalActivitySeverity;
  source?: string;
  commerceOrderId?: string;
  orderId?: string;
  customerId?: string;
  shipmentId?: string;
  incidentId?: string;
  since?: Date;
  until?: Date;
};

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.lastIndexOf(":");
    if (sep <= 0) return null;
    const createdAt = new Date(raw.slice(0, sep));
    const id = raw.slice(sep + 1);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function encodeLiveActivityCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}:${id}`, "utf8").toString("base64url");
}

function buildFilterClause(filter: LiveActivityFilterId | undefined): Prisma.OperationalActivityEventWhereInput | null {
  switch (filter) {
    case undefined:
    case "ALL":
      return null;
    case "ORDERS":
      return {
        OR: [
          { metadata: { path: ["category"], equals: "ORDER_EVENT" } },
          { type: { startsWith: "order." } },
          { type: { startsWith: "catering." } },
        ],
      };
    case "CUSTOMERS":
      return {
        OR: [
          { type: OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED },
          { actorType: "customer" },
        ],
      };
    case "ADMINS":
      return {
        OR: [
          { actorType: { in: ["admin", "super_admin"] } },
          { type: { startsWith: "governance." } },
          { type: { startsWith: "platform." } },
          { type: { startsWith: "access." } },
          { type: { startsWith: "user." } },
        ],
      };
    case "ERRORS":
      return {
        OR: [
          { severity: { in: ["error", "critical"] } },
          { type: { in: [...OPERATIONAL_FAILURE_TYPES] } },
          { metadata: { path: ["category"], equals: "INCIDENT_EVENT" } },
        ],
      };
    case "SECURITY":
      return {
        OR: [
          { metadata: { path: ["category"], equals: "SECURITY_EVENT" } },
          { metadata: { path: ["category"], equals: "AUTH_EVENT" } },
          { type: { startsWith: "security." } },
          { type: { startsWith: "auth." } },
        ],
      };
    case "PAYMENTS":
      return {
        OR: [
          { metadata: { path: ["category"], equals: "PAYMENT_EVENT" } },
          { type: { startsWith: "payment." } },
        ],
      };
    case "DELIVERIES":
      return {
        OR: [
          { metadata: { path: ["category"], equals: "SHIPMENT_EVENT" } },
          { type: { startsWith: "shipment." } },
        ],
      };
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function kindsForFilter(filter: LiveActivityFilterId | undefined): LiveActivityEvent["kind"][] | null {
  switch (filter) {
    case undefined:
    case "ALL":
      return null;
    case "ORDERS":
      return ["ORDER_EVENT"];
    case "CUSTOMERS":
      return ["CUSTOMER_EVENT"];
    case "ADMINS":
      return ["ADMIN_EVENT"];
    case "ERRORS":
      return ["INCIDENT_EVENT", "SYSTEM_EVENT", "PAYMENT_EVENT"];
    case "SECURITY":
      return ["SECURITY_EVENT", "AUTH_EVENT"];
    case "PAYMENTS":
      return ["PAYMENT_EVENT"];
    case "DELIVERIES":
      return ["DELIVERY_EVENT"];
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function buildEntityClauses(query: LiveActivityFeedQuery): Prisma.OperationalActivityEventWhereInput[] {
  const clauses: Prisma.OperationalActivityEventWhereInput[] = [];
  const pairs: [string, string | undefined][] = [
    ["commerceOrderId", query.commerceOrderId],
    ["orderId", query.orderId ?? query.commerceOrderId],
    ["customerId", query.customerId],
    ["shipmentId", query.shipmentId],
  ];
  for (const [key, id] of pairs) {
    if (!id) continue;
    clauses.push({
      OR: [
        { metadata: { path: ["entities", key], equals: id } },
        { metadata: { path: [key], equals: id } },
      ],
    });
  }
  return clauses;
}

async function eventIdsForIncident(incidentId?: string): Promise<string[] | null> {
  if (!incidentId) return null;
  const row = await prisma.operationalIncident.findUnique({
    where: { id: incidentId },
    select: { sourceEventIds: true },
  });
  if (!row || !Array.isArray(row.sourceEventIds)) return [];
  return row.sourceEventIds.filter((x): x is string => typeof x === "string");
}

function buildWhere(query: LiveActivityFeedQuery, restrictIds?: string[] | null): Prisma.OperationalActivityEventWhereInput {
  const and: Prisma.OperationalActivityEventWhereInput[] = [];

  if (restrictIds) {
    and.push({ id: { in: restrictIds.length > 0 ? restrictIds : ["__none__"] } });
  }

  if (query.subtype) {
    and.push({ type: query.subtype.trim().toLowerCase() });
  }
  if (query.severity) {
    and.push({ severity: query.severity });
  }
  if (query.source) {
    and.push({ source: { contains: query.source, mode: "insensitive" } });
  }
  if (query.category) {
    and.push({ metadata: { path: ["category"], equals: query.category } });
  }
  if (query.since || query.until) {
    and.push({
      createdAt: {
        ...(query.since ? { gte: query.since } : {}),
        ...(query.until ? { lte: query.until } : {}),
      },
    });
  }

  and.push(...buildEntityClauses(query));

  const filterClause = buildFilterClause(query.filter);
  if (filterClause) and.push(filterClause);

  const decoded = query.cursor ? decodeCursor(query.cursor) : null;
  if (decoded) {
    and.push({
      OR: [
        { createdAt: { lt: decoded.createdAt } },
        { AND: [{ createdAt: decoded.createdAt }, { id: { lt: decoded.id } }] },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

async function buildIncidentCorrelationMap(): Promise<Map<string, string[]>> {
  const incidents = await prisma.operationalIncident.findMany({
    where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
    select: { id: true, sourceEventIds: true },
  });
  const map = new Map<string, string[]>();
  for (const inc of incidents) {
    if (!Array.isArray(inc.sourceEventIds)) continue;
    for (const eventId of inc.sourceEventIds) {
      if (typeof eventId !== "string") continue;
      const prev = map.get(eventId) ?? [];
      prev.push(inc.id);
      map.set(eventId, prev);
    }
  }
  return map;
}

export function parseLiveActivityFeedQuery(searchParams: URLSearchParams): LiveActivityFeedQuery {
  const filterRaw = searchParams.get("filter");
  const filter = LIVE_ACTIVITY_FILTER_IDS.includes(filterRaw as LiveActivityFilterId)
    ? (filterRaw as LiveActivityFilterId)
    : undefined;

  const limitRaw = Number(searchParams.get("limit") ?? LIVE_ACTIVITY_DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(LIVE_ACTIVITY_MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : LIVE_ACTIVITY_DEFAULT_LIMIT;

  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");

  return {
    cursor: searchParams.get("cursor") ?? undefined,
    limit,
    filter,
    category: (searchParams.get("category") as PlatformEventCategory | null) ?? undefined,
    subtype: searchParams.get("subtype") ?? undefined,
    severity: (searchParams.get("severity") as OperationalActivitySeverity | null) ?? undefined,
    source: searchParams.get("source") ?? undefined,
    commerceOrderId: searchParams.get("commerceOrderId") ?? undefined,
    orderId: searchParams.get("orderId") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    shipmentId: searchParams.get("shipmentId") ?? undefined,
    incidentId: searchParams.get("incidentId") ?? undefined,
    since: sinceRaw ? new Date(sinceRaw) : undefined,
    until: untilRaw ? new Date(untilRaw) : undefined,
  };
}

export async function queryLiveActivityFeed(query: LiveActivityFeedQuery): Promise<LiveActivityFeedResponse> {
  const limit = query.limit ?? LIVE_ACTIVITY_DEFAULT_LIMIT;
  const incidentEventIds = await eventIdsForIncident(query.incidentId);
  const where = buildWhere(query, incidentEventIds);

  const [rows, incidentMap] = await Promise.all([
    prisma.operationalActivityEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    }),
    buildIncidentCorrelationMap(),
  ]);

  const mapped = rows.map((row) => mapPlatformEventToLiveActivity(row, incidentMap));
  const kindFilter = kindsForFilter(query.filter);
  const filtered = kindFilter ? mapped.filter((e) => kindFilter.includes(e.kind)) : mapped;

  const hasMore = filtered.length > limit;
  const events = hasMore ? filtered.slice(0, limit) : filtered;
  const last = events[events.length - 1];
  const nextCursor =
    hasMore && last ? encodeLiveActivityCursor(new Date(last.occurredAt), last.id) : null;

  return {
    events,
    nextCursor,
    fetchedAt: new Date().toISOString(),
    pollingIntervalMs: LIVE_ACTIVITY_DEFAULT_POLLING_MS,
  };
}
