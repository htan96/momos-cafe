import { Prisma } from "@prisma/client";
import type {
  OperationalActivityEvent,
  OperationalActivitySeverity,
  OperationalFailureTriageState,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyOperationalFailure } from "@/lib/operations/failures/classifyOperationalFailure";
import {
  FAILURE_SUBTYPE_LABELS,
  OPERATIONAL_FAILURE_TYPES,
  isOperationalFailureType,
} from "@/lib/operations/failures/failureSubtypes";
import { redactFailureMetadata } from "@/lib/operations/failures/redactFailureMetadata";
import { recoveryActionsForSubtype } from "@/lib/operations/failures/recoveryActions";
import { readOperationalMetadataEntityIds } from "@/lib/operations/operationalContextLinks";
import type { PlatformEventCategory } from "@/lib/platform/events/taxonomy";
import { isPlatformEventMetadataV1 } from "@/lib/platform/events/metadata";

/** Default list window — aligns with ~90d retention policy (no purge job yet). */
export const OPERATIONAL_FAILURES_DEFAULT_SINCE_DAYS = 90;

export const OPERATIONAL_FAILURE_TRIAGE_ACTIVE_STATES: OperationalFailureTriageState[] = [
  "new",
  "acknowledged",
  "investigating",
];

export const OPERATIONAL_FAILURE_TRIAGE_RESOLVED_STATES: OperationalFailureTriageState[] = [
  "resolved",
  "ignored",
];

export type OperationalFailuresQueryFilters = {
  severity?: OperationalActivitySeverity;
  category?: PlatformEventCategory;
  subtype?: string;
  source?: string;
  since?: Date;
  until?: Date;
  commerceOrderId?: string;
  orderId?: string;
  customerId?: string;
  shipmentId?: string;
  incidentId?: string;
  linkedToActiveIncident?: boolean;
  triageState?: OperationalFailureTriageState;
  lifecycle?: "active" | "resolved" | "untriaged";
  page?: number;
  pageSize?: number;
};

function asStringArrayJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function buildEntityFilter(filters: OperationalFailuresQueryFilters): Prisma.OperationalActivityEventWhereInput[] {
  const clauses: Prisma.OperationalActivityEventWhereInput[] = [];
  const pairs: [string, string | undefined][] = [
    ["commerceOrderId", filters.commerceOrderId],
    ["orderId", filters.orderId ?? filters.commerceOrderId],
    ["customerId", filters.customerId],
    ["shipmentId", filters.shipmentId],
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

async function eventIdsForIncidentFilter(incidentId?: string): Promise<string[]> {
  if (!incidentId) return [];
  const row = await prisma.operationalIncident.findUnique({
    where: { id: incidentId },
    select: { sourceEventIds: true },
  });
  return row ? asStringArrayJson(row.sourceEventIds) : [];
}

async function eventIdsLinkedToActiveIncidents(): Promise<string[]> {
  const incidents = await prisma.operationalIncident.findMany({
    where: { status: { in: ["active", "investigating", "monitoring"] } },
    select: { sourceEventIds: true },
  });
  const ids = new Set<string>();
  for (const row of incidents) {
    for (const id of asStringArrayJson(row.sourceEventIds)) ids.add(id);
  }
  return [...ids];
}

export function buildOperationalFailuresWhere(
  filters: OperationalFailuresQueryFilters,
  opts?: { restrictEventIds?: string[] }
): Prisma.OperationalActivityEventWhereInput {
  const and: Prisma.OperationalActivityEventWhereInput[] = [
    { type: { in: [...OPERATIONAL_FAILURE_TYPES] } },
  ];

  if (filters.subtype) {
    and.push({ type: filters.subtype.trim().toLowerCase() });
  }
  if (filters.severity) {
    and.push({ severity: filters.severity });
  }
  if (filters.source) {
    and.push({ source: { contains: filters.source, mode: "insensitive" } });
  }
  if (filters.since || filters.until) {
    and.push({
      createdAt: {
        ...(filters.since ? { gte: filters.since } : {}),
        ...(filters.until ? { lte: filters.until } : {}),
      },
    });
  }
  if (filters.category) {
    and.push({ metadata: { path: ["category"], equals: filters.category } });
  }

  const entityClauses = buildEntityFilter(filters);
  if (entityClauses.length) and.push(...entityClauses);

  if (opts?.restrictEventIds?.length) {
    and.push({ id: { in: opts.restrictEventIds } });
  }

  return { AND: and };
}

export type OperationalFailureListItem = {
  id: string;
  type: string;
  subtypeLabel: string;
  severity: OperationalActivitySeverity;
  message: string;
  source: string | null;
  createdAt: string;
  category: string;
  classification: ReturnType<typeof classifyOperationalFailure>;
  entityIds: ReturnType<typeof readOperationalMetadataEntityIds>;
  triage: {
    state: OperationalFailureTriageState;
    assignedTo: string | null;
    updatedAt: string | null;
  } | null;
  linkedIncidentIds: string[];
};

function mapListRow(
  row: OperationalActivityEvent,
  triage: { state: OperationalFailureTriageState; assignedTo: string | null; updatedAt: Date } | null,
  linkedIncidentIds: string[]
): OperationalFailureListItem {
  const classification = classifyOperationalFailure({
    type: row.type,
    persistedSeverity: row.severity,
    metadata: row.metadata,
  });
  const subtype = row.type;

  return {
    id: row.id,
    type: row.type,
    subtypeLabel: isOperationalFailureType(subtype) ? FAILURE_SUBTYPE_LABELS[subtype] : subtype,
    severity: row.severity,
    message: row.message,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    category: classification.category,
    classification,
    entityIds: readOperationalMetadataEntityIds(row.metadata),
    triage: triage
      ? {
          state: triage.state,
          assignedTo: triage.assignedTo,
          updatedAt: triage.updatedAt.toISOString(),
        }
      : null,
    linkedIncidentIds,
  };
}

async function loadIncidentLinksByEventId(eventIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!eventIds.length) return map;

  const eventIdSet = new Set(eventIds);
  const incidents = await prisma.operationalIncident.findMany({
    where: { sourceEventIds: { not: Prisma.DbNull } },
    select: { id: true, sourceEventIds: true },
    orderBy: { lastDetectedAt: "desc" },
    take: 200,
  });

  for (const inc of incidents) {
    const src = asStringArrayJson(inc.sourceEventIds);
    for (const eid of src) {
      if (!eventIdSet.has(eid)) continue;
      const prev = map.get(eid) ?? [];
      prev.push(inc.id);
      map.set(eid, prev);
    }
  }
  return map;
}

export async function queryOperationalFailures(filters: OperationalFailuresQueryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  let restrictEventIds: string[] | undefined;

  if (filters.incidentId) {
    restrictEventIds = await eventIdsForIncidentFilter(filters.incidentId);
    if (!restrictEventIds.length) {
      return { items: [], total: 0, page, pageSize };
    }
  } else if (filters.linkedToActiveIncident) {
    restrictEventIds = await eventIdsLinkedToActiveIncidents();
    if (!restrictEventIds.length) {
      return { items: [], total: 0, page, pageSize };
    }
  }

  const sinceDefault = new Date(Date.now() - OPERATIONAL_FAILURES_DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);
  const effectiveFilters = {
    ...filters,
    since: filters.since ?? sinceDefault,
  };

  const baseWhere = buildOperationalFailuresWhere(effectiveFilters, { restrictEventIds });

  if (filters.lifecycle === "untriaged") {
    const triagedIds = await prisma.operationalFailureTriage.findMany({
      select: { activityEventId: true },
    });
    const exclude = triagedIds.map((r) => r.activityEventId);
    const where: Prisma.OperationalActivityEventWhereInput = {
      AND: [baseWhere, ...(exclude.length ? [{ id: { notIn: exclude } }] : [])],
    };
    const [total, rows] = await Promise.all([
      prisma.operationalActivityEvent.count({ where }),
      prisma.operationalActivityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const incidentMap = await loadIncidentLinksByEventId(rows.map((r) => r.id));
    return {
      items: rows.map((r) => mapListRow(r, null, incidentMap.get(r.id) ?? [])),
      total,
      page,
      pageSize,
    };
  }

  let eventIdFilter: string[] | undefined;
  if (filters.triageState) {
    const triageRows = await prisma.operationalFailureTriage.findMany({
      where: { state: filters.triageState },
      select: { activityEventId: true },
    });
    eventIdFilter = triageRows.map((r) => r.activityEventId);
  } else if (filters.lifecycle === "active") {
    const triageRows = await prisma.operationalFailureTriage.findMany({
      where: { state: { in: [...OPERATIONAL_FAILURE_TRIAGE_ACTIVE_STATES] } },
      select: { activityEventId: true },
    });
    eventIdFilter = triageRows.map((r) => r.activityEventId);
  } else if (filters.lifecycle === "resolved") {
    const triageRows = await prisma.operationalFailureTriage.findMany({
      where: { state: { in: [...OPERATIONAL_FAILURE_TRIAGE_RESOLVED_STATES] } },
      select: { activityEventId: true },
    });
    eventIdFilter = triageRows.map((r) => r.activityEventId);
  }

  if (eventIdFilter && !eventIdFilter.length) {
    return { items: [], total: 0, page, pageSize };
  }

  const where: Prisma.OperationalActivityEventWhereInput = {
    AND: [baseWhere, ...(eventIdFilter ? [{ id: { in: eventIdFilter } }] : [])],
  };

  const [total, rows] = await Promise.all([
    prisma.operationalActivityEvent.count({ where }),
    prisma.operationalActivityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const ids = rows.map((r) => r.id);
  const [triageRows, incidentMap] = await Promise.all([
    prisma.operationalFailureTriage.findMany({
      where: { activityEventId: { in: ids } },
    }),
    loadIncidentLinksByEventId(ids),
  ]);
  const triageByEvent = new Map(triageRows.map((t) => [t.activityEventId, t]));

  return {
    items: rows.map((r) =>
      mapListRow(r, triageByEvent.get(r.id) ?? null, incidentMap.get(r.id) ?? [])
    ),
    total,
    page,
    pageSize,
  };
}

export type OperationalFailureDetail = {
  event: {
    id: string;
    type: string;
    severity: OperationalActivitySeverity;
    message: string;
    actorType: string;
    actorId: string | null;
    actorName: string | null;
    source: string | null;
    createdAt: string;
    metadataRedacted: unknown;
    lifecycle: string | null;
    category: string | null;
  };
  classification: ReturnType<typeof classifyOperationalFailure>;
  entityIds: ReturnType<typeof readOperationalMetadataEntityIds>;
  triage: {
    state: OperationalFailureTriageState;
    assignedTo: string | null;
    notes: string | null;
    updatedBy: string | null;
    updatedAt: string;
  } | null;
  linkedIncidents: {
    id: string;
    type: string;
    severity: string;
    status: string;
    title: string;
  }[];
  relatedEvents: {
    id: string;
    type: string;
    severity: OperationalActivitySeverity;
    message: string;
    createdAt: string;
  }[];
  recoveryActions: ReturnType<typeof recoveryActionsForSubtype>;
};

const RELATED_WINDOW_MS = 30 * 60 * 1000;

export async function queryOperationalFailureDetail(eventId: string): Promise<OperationalFailureDetail | null> {
  const row = await prisma.operationalActivityEvent.findUnique({ where: { id: eventId } });
  if (!row || !isOperationalFailureType(row.type)) return null;

  const entityIds = readOperationalMetadataEntityIds(row.metadata);
  const classification = classifyOperationalFailure({
    type: row.type,
    persistedSeverity: row.severity,
    metadata: row.metadata,
  });

  const [triage, allIncidents, relatedEvents] = await Promise.all([
    prisma.operationalFailureTriage.findUnique({ where: { activityEventId: eventId } }),
    prisma.operationalIncident.findMany({
      where: { sourceEventIds: { not: Prisma.DbNull } },
      orderBy: { lastDetectedAt: "desc" },
      select: { id: true, type: true, severity: true, status: true, title: true, sourceEventIds: true },
      take: 200,
    }),
    queryRelatedOperationalEvents(row, entityIds),
  ]);

  const linkedIncidents = allIncidents
    .filter((inc) => asStringArrayJson(inc.sourceEventIds).includes(eventId))
    .map((inc) => ({
      id: inc.id,
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      title: inc.title,
    }));

  const envelope = isPlatformEventMetadataV1(row.metadata) ? row.metadata : null;

  return {
    event: {
      id: row.id,
      type: row.type,
      severity: row.severity,
      message: row.message,
      actorType: row.actorType,
      actorId: row.actorId,
      actorName: row.actorName,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      metadataRedacted: redactFailureMetadata(row.metadata),
      lifecycle: envelope?.lifecycle ?? null,
      category: envelope?.category ?? classification.category,
    },
    classification,
    entityIds,
    triage: triage
      ? {
          state: triage.state,
          assignedTo: triage.assignedTo,
          notes: triage.notes,
          updatedBy: triage.updatedBy,
          updatedAt: triage.updatedAt.toISOString(),
        }
      : null,
    linkedIncidents,
    relatedEvents,
    recoveryActions: recoveryActionsForSubtype(row.type),
  };
}

async function queryRelatedOperationalEvents(
  anchor: OperationalActivityEvent,
  entityIds: ReturnType<typeof readOperationalMetadataEntityIds>
) {
  const windowStart = new Date(anchor.createdAt.getTime() - RELATED_WINDOW_MS);
  const windowEnd = new Date(anchor.createdAt.getTime() + RELATED_WINDOW_MS);

  const or: Prisma.OperationalActivityEventWhereInput[] = [];
  const idPairs: [string, string | null][] = [
    ["commerceOrderId", entityIds.commerceOrderId],
    ["orderId", entityIds.orderId],
    ["customerId", entityIds.customerId],
    ["shipmentId", entityIds.shipmentId],
  ];
  for (const [key, id] of idPairs) {
    if (!id) continue;
    or.push(
      { metadata: { path: ["entities", key], equals: id } },
      { metadata: { path: [key], equals: id } }
    );
  }

  if (!or.length) return [];

  const rows = await prisma.operationalActivityEvent.findMany({
    where: {
      id: { not: anchor.id },
      createdAt: { gte: windowStart, lte: windowEnd },
      OR: or,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, severity: true, message: true, createdAt: true },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function parseOperationalFailuresQuery(searchParams: URLSearchParams): OperationalFailuresQueryFilters {
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "25", 10);
  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");
  const lifecycleRaw = searchParams.get("lifecycle");

  return {
    severity: (searchParams.get("severity") as OperationalActivitySeverity | null) ?? undefined,
    category: (searchParams.get("category") as PlatformEventCategory | null) ?? undefined,
    subtype: searchParams.get("subtype") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    since: sinceRaw ? new Date(sinceRaw) : undefined,
    until: untilRaw ? new Date(untilRaw) : undefined,
    commerceOrderId: searchParams.get("commerceOrderId") ?? undefined,
    orderId: searchParams.get("orderId") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    shipmentId: searchParams.get("shipmentId") ?? undefined,
    incidentId: searchParams.get("incidentId") ?? undefined,
    linkedToActiveIncident: searchParams.get("linkedToActiveIncident") === "true",
    triageState: (searchParams.get("triageState") as OperationalFailureTriageState | null) ?? undefined,
    lifecycle:
      lifecycleRaw === "active" || lifecycleRaw === "resolved" || lifecycleRaw === "untriaged"
        ? lifecycleRaw
        : undefined,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
  };
}
