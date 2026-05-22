import type {
  CateringInquiryStatus,
  OperationalActivityEvent,
  OperationalActivitySeverity,
  OperationalRefundCaseStatus,
  OperationalSupportIssueStatus,
} from "@prisma/client";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";
import type { WorkflowTimelineStep } from "@/components/operations/WorkflowTimeline";
import type { OpsAlert } from "@/lib/operations/adminOperationalTypes";
import { prisma } from "@/lib/prisma";
import { opsFulfillmentGroupInclude, opsLoadTodayQueues } from "@/lib/ops/queries";
import { OPS_FULFILLMENT_PROGRAM, classifyFulfillmentProgram } from "@/lib/ops/fulfillmentPrograms";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

const TERMINAL_FULFILLMENT = ["completed", "cancelled"] as const;

const SHIPPING_TIMELINE_TYPES: string[] = [
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_QUOTE_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_ORPHAN,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_UNHANDLED_EVENT,
];

/** Short relative age label for operational surfaces (never a synthetic SLA). */
export function formatOpsRelativeAge(from: Date | null, nowMs = Date.now()): string {
  if (!from) return "—";
  const ms = nowMs - from.getTime();
  if (ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function formatAdminDt(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenId(uuid: string, head = 8): string {
  const s = uuid.replace(/-/g, "");
  return s.slice(0, Math.min(head, s.length)).toUpperCase();
}

function fulfillmentGroupRowStatusVariant(status: string): OpsStatusVariant {
  if (status === "cancelled") return "denied";
  if (status === "shipped") return "delivered";
  if (status === "pending") return "queued";
  if (status === "merch_processing") return "in_progress";
  return "in_progress";
}

function activitySeverityVariant(severity: OperationalActivitySeverity): OpsStatusVariant {
  if (severity === "critical" || severity === "error") return "exception";
  if (severity === "warning") return "blocked";
  return "in_progress";
}

export function supportStatusVariant(s: OperationalSupportIssueStatus): OpsStatusVariant {
  switch (s) {
    case "OPEN":
      return "open";
    case "WAITING_CUSTOMER":
      return "blocked";
    case "REVIEWING":
      return "in_progress";
    case "ESCALATED":
      return "exception";
    case "RESOLVED":
      return "closed";
    default:
      return "open";
  }
}

export function refundStatusVariant(s: OperationalRefundCaseStatus): OpsStatusVariant {
  switch (s) {
    case "REQUESTED":
      return "queued";
    case "REVIEWING":
      return "in_progress";
    case "APPROVED":
      return "scheduled";
    case "DENIED":
      return "denied";
    case "SUBMITTED_TO_SQUARE":
      return "routing";
    case "SQUARE_COMPLETED":
      return "refunded";
    case "SQUARE_FAILED":
      return "exception";
    default:
      return "queued";
  }
}

function cateringStatusVariant(s: CateringInquiryStatus): OpsStatusVariant {
  switch (s) {
    case "new":
      return "queued";
    case "contacted":
    case "quoted":
      return "in_progress";
    case "booked":
      return "scheduled";
    case "closed":
      return "delivered";
    case "failed_submission":
      return "exception";
    default:
      return "queued";
  }
}

function notificationCategoryLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("refund") || t.includes("payment")) return "Finance & payments";
  if (t.includes("shipment") || t.includes("ship") || t.includes("label")) return "Shipping & labels";
  if (t.includes("email") || t.includes("mail")) return "Email";
  return "Orchestration";
}

export function notificationVariant(processedAt: Date | null, type: string): OpsStatusVariant {
  if (!processedAt) return "exception";
  const t = type.toLowerCase();
  if (t.includes("failed") || t.includes("error")) return "blocked";
  return "delivered";
}

export type AdminQueueSummary = {
  id: string;
  name: string;
  depth: number;
  oldestWait: string;
  slaHint: string;
  assignee: string | null;
  status: OpsStatusVariant;
};

export type AdminFulfillmentTableRow = {
  id: string;
  slot: string;
  orderRef: string;
  items: string;
  eta: string;
  station: string;
  variant: OpsStatusVariant;
};

export type AdminShipmentExceptionRow = {
  id: string;
  orderRef: string;
  carrier: string;
  code: string;
  detail: string;
  attemptedAt: string;
  variant: OpsStatusVariant;
};

export type AdminCateringColumn = {
  id: string;
  title: string;
  hint: string;
  cards: {
    id: string;
    title: string;
    guest: string;
    pickupWindow: string;
    headcount: string;
    variant: OpsStatusVariant;
  }[];
};

/** Queue depth cards derived from Prisma — no invented SLA percentages. */
export async function loadAdminQueueSummaries(): Promise<AdminQueueSummary[]> {
  const [
    openGroupCount,
    openGroupOldest,
    labelPendingCount,
    labelPendingOldest,
    cateringOpenCount,
    cateringOldest,
    supportOpenCount,
    supportOldest,
    shipmentExceptionCount,
    shipmentExceptionOldest,
    refundOpenCount,
    refundOldest,
    commFailedCount,
    commFailedOldest,
  ] = await Promise.all([
    prisma.fulfillmentGroup.count({
      where: {
        status: { notIn: [...TERMINAL_FULFILLMENT] },
        order: { status: { in: ["paid", "partially_fulfilled"] } },
      },
    }),
    prisma.fulfillmentGroup.findFirst({
      where: {
        status: { notIn: [...TERMINAL_FULFILLMENT] },
        order: { status: { in: ["paid", "partially_fulfilled"] } },
      },
      orderBy: { order: { updatedAt: "asc" } },
      select: { order: { select: { updatedAt: true } } },
    }),
    prisma.shipment.count({
      where: {
        OR: [{ trackingNumber: null }, { trackingNumber: "" }],
        fulfillmentGroup: {
          pipeline: "RETAIL",
          status: { notIn: [...TERMINAL_FULFILLMENT] },
          order: { status: { in: ["paid", "partially_fulfilled"] } },
        },
      },
    }),
    prisma.shipment.findFirst({
      where: {
        OR: [{ trackingNumber: null }, { trackingNumber: "" }],
        fulfillmentGroup: {
          pipeline: "RETAIL",
          status: { notIn: [...TERMINAL_FULFILLMENT] },
          order: { status: { in: ["paid", "partially_fulfilled"] } },
        },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.cateringInquiry.count({
      where: { status: { in: ["new", "contacted", "quoted", "booked"] } },
    }),
    prisma.cateringInquiry.findFirst({
      where: { status: { in: ["new", "contacted", "quoted", "booked"] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.operationalSupportIssue.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.operationalSupportIssue.findFirst({
      where: { status: { not: "RESOLVED" } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.shipment.count({ where: { status: { in: ["exception", "return_initiated"] } } }),
    prisma.shipment.findFirst({
      where: { status: { in: ["exception", "return_initiated"] } },
      orderBy: { updatedAt: "asc" },
      select: { updatedAt: true },
    }),
    prisma.operationalRefundCase.count({
      where: { status: { notIn: ["SQUARE_COMPLETED", "DENIED"] } },
    }),
    prisma.operationalRefundCase.findFirst({
      where: { status: { notIn: ["SQUARE_COMPLETED", "DENIED"] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.emailMessage.count({ where: { deliveryStatus: "failed" } }),
    prisma.emailMessage.findFirst({
      where: { deliveryStatus: "failed" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const mk = (
    id: string,
    name: string,
    depth: number,
    oldest: Date | null,
    slaHint: string,
    status: OpsStatusVariant
  ): AdminQueueSummary => ({
    id,
    name,
    depth,
    oldestWait: formatOpsRelativeAge(oldest),
    slaHint,
    assignee: null,
    status: depth === 0 ? "muted" : status,
  });

  return [
    mk(
      "q-pack",
      "Fulfillment groups",
      openGroupCount,
      openGroupOldest?.order.updatedAt ?? null,
      "Open packing/ship groups on paid or partially fulfilled orders.",
      "in_progress"
    ),
    mk(
      "q-label",
      "Labels pending",
      labelPendingCount,
      labelPendingOldest?.createdAt ?? null,
      "Retail shipments without a tracking number (label not purchased or attached).",
      "awaiting_label"
    ),
    mk(
      "q-catering",
      "Catering inquiries",
      cateringOpenCount,
      cateringOldest?.createdAt ?? null,
      "Inquiries not yet closed (new through booked).",
      "scheduled"
    ),
    mk(
      "q-support",
      "Support issues",
      supportOpenCount,
      supportOldest?.createdAt ?? null,
      "OperationalSupportIssue rows excluding resolved.",
      "blocked"
    ),
    mk(
      "q-exc",
      "Shipment exceptions",
      shipmentExceptionCount,
      shipmentExceptionOldest?.updatedAt ?? null,
      "Shipments in exception or return_initiated.",
      "exception"
    ),
    mk(
      "q-refund",
      "Refunds in flight",
      refundOpenCount,
      refundOldest?.createdAt ?? null,
      "Refund cases not completed or denied in Square.",
      "queued"
    ),
    mk(
      "q-comms",
      "Failed email deliveries",
      commFailedCount,
      commFailedOldest?.createdAt ?? null,
      "EmailMessage rows with deliveryStatus failed (lifetime count).",
      "exception"
    ),
  ];
}

export async function loadAdminOperationalAlerts(): Promise<OpsAlert[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [incidents, errorEvents] = await Promise.all([
    prisma.operationalIncident.findMany({
      where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
      orderBy: { lastDetectedAt: "desc" },
      take: 5,
      select: { id: true, title: true, severity: true },
    }),
    prisma.operationalActivityEvent.findMany({
      where: { severity: { in: ["error", "critical"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, message: true, severity: true },
    }),
  ]);

  const alerts: OpsAlert[] = [];
  for (const inc of incidents) {
    const sev = inc.severity.toLowerCase();
    const level: OpsAlert["level"] =
      sev === "critical" || sev === "high" ? "urgent" : sev === "warning" ? "watch" : "info";
    alerts.push({
      id: `inc-${inc.id}`,
      level,
      message: inc.title,
      href: "/super-admin/live",
      hrefLabel: "Incident feed",
    });
  }
  for (const row of errorEvents) {
    alerts.push({
      id: `evt-${row.id}`,
      level: row.severity === "critical" ? "urgent" : "watch",
      message: row.message,
      href: "/super-admin/operations/failures",
      hrefLabel: "Failures",
    });
  }
  return alerts.slice(0, 8);
}

export async function loadAdminRecentActivitySteps(take: number): Promise<WorkflowTimelineStep[]> {
  const rows = await prisma.operationalActivityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(12, Math.max(1, take)),
    select: { id: true, type: true, message: true, createdAt: true, severity: true },
  });
  return rows
    .slice()
    .reverse()
    .map((row) => opsActivityToTimelineStep(row, row.severity));
}

export function opsActivityToTimelineStep(
  row: Pick<OperationalActivityEvent, "id" | "type" | "message" | "createdAt">,
  severity: OperationalActivitySeverity
): WorkflowTimelineStep {
  return {
    id: row.id,
    label: row.type,
    meta: row.message,
    at: formatAdminDt(row.createdAt),
    variant: activitySeverityVariant(severity),
  };
}

export async function loadAdminShipmentExceptionRows(limit: number): Promise<AdminShipmentExceptionRow[]> {
  const rows = await prisma.shipment.findMany({
    where: { status: { in: ["exception", "return_initiated"] } },
    orderBy: { updatedAt: "desc" },
    take: Math.min(20, Math.max(1, limit)),
    select: {
      id: true,
      carrier: true,
      status: true,
      notes: true,
      updatedAt: true,
      shippingService: true,
      fulfillmentGroup: { select: { order: { select: { id: true } } } },
    },
  });

  return rows.map((s) => {
    const oid = s.fulfillmentGroup.order?.id;
    const orderRef = oid ? `Order · ${shortenId(oid)}` : "Order · —";
    const carrier = [s.carrier, s.shippingService].filter(Boolean).join(" · ") || "Carrier · —";
    return {
      id: s.id,
      orderRef,
      carrier,
      code: s.status.toUpperCase(),
      detail: (s.notes?.trim()?.length ? s.notes.trim() : "No shipment notes recorded.") ?? "No shipment notes recorded.",
      attemptedAt: formatAdminDt(s.updatedAt),
      variant: "exception" as OpsStatusVariant,
    };
  });
}

export async function loadAdminFulfillmentWorkload() {
  const queues = await opsLoadTodayQueues();
  const pendingLabel = queues.shipmentsPendingLabel.slice(0, 12);

  const groupRowsRaw = await prisma.fulfillmentGroup.findMany({
    where: {
      status: { notIn: [...TERMINAL_FULFILLMENT] },
      order: { status: { in: ["paid", "partially_fulfilled"] } },
    },
    take: 20,
    orderBy: { order: { updatedAt: "desc" } },
    include: opsFulfillmentGroupInclude,
  });

  const tableRows: AdminFulfillmentTableRow[] = [];
  let slot = 0;
  for (const g of groupRowsRaw) {
    slot++;
    const titles = g.items
      .map((fi) => {
        const t = fi.orderItem?.title ?? "Item";
        const q = fi.orderItem?.quantity ?? 1;
        return `${t} ×${q}`;
      })
      .slice(0, 4);
    const items = titles.length ? titles.join("; ") : "—";
    const eta =
      g.estimatedReadyAt != null
        ? formatAdminDt(g.estimatedReadyAt)
        : `Updated ${formatOpsRelativeAge(g.order.updatedAt)} ago`;
    const program = classifyFulfillmentProgram(g.pipeline, g.items);
    tableRows.push({
      id: g.id,
      slot: `G-${slot.toString().padStart(2, "0")}`,
      orderRef: `Order · ${shortenId(g.orderId)}`,
      items,
      eta,
      station: `${program} · ${g.pipeline}`,
      variant: fulfillmentGroupRowStatusVariant(g.status),
    });
  }

  const batches = pendingLabel.map((s) => {
    const grp = s.fulfillmentGroup;
    const order = grp.order;
    const awaiting =
      !s.selectedShippoRateId?.trim()?.length ||
      !(s.carrier ?? "").trim().length ||
      !(s.trackingNumber ?? "").trim()?.length;

    const variant: OpsStatusVariant =
      grp.status === "merch_processing" ? "in_progress" : awaiting ? "awaiting_label" : "queued";

    return {
      id: `Lbl-${shortenId(s.id)}`,
      orders: 1,
      skuMix: `Group · ${shortenId(grp.id)} · ${
        order.totalCents != null ? `$${(order.totalCents / 100).toFixed(2)}` : "—"
      }`,
      station: `${s.carrier ?? "Shipment"} · ${grp.status}`,
      queuedAt: formatAdminDt(s.createdAt),
      variant,
    };
  });

  const kitchenAttention = queues.lateOrStuck.filter(
    (g) =>
      classifyFulfillmentProgram(g.pipeline, g.items) !== OPS_FULFILLMENT_PROGRAM.SHIP ||
      g.pipeline === "KITCHEN"
  ).length;
  const retailShipAttention = queues.shipsToday.filter(
    (g) => g.program === OPS_FULFILLMENT_PROGRAM.SHIP
  ).length;

  const metrics = {
    coldChainOrLateStuckAttention: queues.lateOrStuck.length,
    kitchenAttentionEstimate: kitchenAttention,
    retailShipAttentionEstimate: retailShipAttention,
    labelPendingCount: pendingLabel.length,
  };

  return { tableRows, batches, metrics, queues };
}

export async function loadAdminCateringKanban(): Promise<AdminCateringColumn[]> {
  const rows = await prisma.cateringInquiry.findMany({
    take: 120,
    orderBy: { createdAt: "desc" },
  });

  const columns: { id: string; title: string; hint: string; statuses: CateringInquiryStatus[] }[] = [
    { id: "col-new", title: "New", hint: "Needs first contact", statuses: ["new"] },
    {
      id: "col-active",
      title: "In conversation",
      hint: "Contacted or quoted",
      statuses: ["contacted", "quoted"],
    },
    { id: "col-booked", title: "Booked", hint: "Confirmed event", statuses: ["booked"] },
    {
      id: "col-done",
      title: "Closed / failed",
      hint: "Completed or submission failed",
      statuses: ["closed", "failed_submission"],
    },
  ];

  return columns.map((col) => ({
    id: col.id,
    title: col.title,
    hint: col.hint,
    cards: rows
      .filter((r) => col.statuses.includes(r.status))
      .map((r) => ({
        id: r.id,
        title: `${r.name} · ${r.guestCount} guests`,
        guest: `${r.email}${r.phone ? ` · ${r.phone}` : ""}`,
        pickupWindow: r.eventDate,
        headcount: `${r.guestCount} guests`,
        variant: cateringStatusVariant(r.status),
      })),
  }));
}

export async function loadAdminSupportIssues(take: number) {
  return prisma.operationalSupportIssue.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(50, Math.max(1, take)),
    include: {
      customer: { select: { email: true, phone: true } },
      commerceOrder: { select: { id: true } },
    },
  });
}

export async function loadAdminRefundCases(take: number) {
  return prisma.operationalRefundCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(50, Math.max(1, take)),
    include: { commerceOrder: { select: { id: true } } },
  });
}

export async function loadAdminCommunicationsThreads(limit: number) {
  return prisma.emailThread.findMany({
    take: Math.min(40, Math.max(1, limit)),
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { email: true } },
      commerceOrder: { select: { id: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 4 },
    },
  });
}

export async function loadAdminNotificationFeedRows(take: number) {
  return prisma.notificationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(60, Math.max(1, take)),
    select: { id: true, type: true, createdAt: true, processedAt: true, payload: true },
  });
}

export function groupAdminNotificationRows(
  rows: Awaited<ReturnType<typeof loadAdminNotificationFeedRows>>
) {
  const buckets = new Map<string, typeof rows>();
  for (const row of rows) {
    const cat = notificationCategoryLabel(row.type);
    const prev = buckets.get(cat) ?? [];
    prev.push(row);
    buckets.set(cat, prev);
  }
  return [...buckets.entries()].map(([category, items]) => ({ category, items }));
}

export async function loadAdminCatalogProductRows(take: number) {
  return prisma.productCache.findMany({
    take: Math.min(60, Math.max(1, take)),
    orderBy: { syncedAt: "desc" },
    include: {
      variants: { take: 1, orderBy: { syncedAt: "desc" } },
    },
  });
}

export async function loadAdminReportingCounts() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [
    openFulfillmentGroups,
    pendingLabelShipments,
    shipmentExceptions,
    openSupport,
    openRefunds,
    failedEmailMessages,
    paymentFailuresToday,
    notificationBacklog,
  ] = await Promise.all([
    prisma.fulfillmentGroup.count({
      where: {
        status: { notIn: [...TERMINAL_FULFILLMENT] },
        order: { status: { in: ["paid", "partially_fulfilled"] } },
      },
    }),
    prisma.shipment.count({
      where: {
        OR: [{ trackingNumber: null }, { trackingNumber: "" }],
        fulfillmentGroup: {
          pipeline: "RETAIL",
          status: { notIn: [...TERMINAL_FULFILLMENT] },
          order: { status: { in: ["paid", "partially_fulfilled"] } },
        },
      },
    }),
    prisma.shipment.count({ where: { status: { in: ["exception", "return_initiated"] } } }),
    prisma.operationalSupportIssue.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.operationalRefundCase.count({
      where: { status: { notIn: ["SQUARE_COMPLETED", "DENIED"] } },
    }),
    prisma.emailMessage.count({ where: { deliveryStatus: "failed" } }),
    prisma.operationalActivityEvent.count({
      where: {
        type: { in: [OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED, PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED] },
        createdAt: { gte: todayStart },
      },
    }),
    prisma.notificationEvent.count({ where: { processedAt: null } }),
  ]);

  return {
    openFulfillmentGroups,
    pendingLabelShipments,
    shipmentExceptions,
    openSupport,
    openRefunds,
    failedEmailMessages,
    paymentFailuresToday,
    notificationBacklog,
  };
}

export async function loadAdminShippingContext() {
  const [settings, exceptionRows, timelineRows, pendingLabelCount, openRetailShipGroups] =
    await Promise.all([
      prisma.catalogSyncState.findUnique({ where: { id: "singleton" } }),
      loadAdminShipmentExceptionRows(8),
      prisma.operationalActivityEvent.findMany({
        where: { type: { in: SHIPPING_TIMELINE_TYPES } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, type: true, message: true, createdAt: true, severity: true },
      }),
      prisma.shipment.count({
        where: {
          OR: [{ trackingNumber: null }, { trackingNumber: "" }],
          fulfillmentGroup: {
            pipeline: "RETAIL",
            status: { notIn: [...TERMINAL_FULFILLMENT] },
            order: { status: { in: ["paid", "partially_fulfilled"] } },
          },
        },
      }),
      prisma.fulfillmentGroup.count({
        where: {
          pipeline: "RETAIL",
          status: { notIn: [...TERMINAL_FULFILLMENT] },
          order: { status: { in: ["paid", "partially_fulfilled", "pending_payment"] } },
        },
      }),
    ]);

  const timeline = [...timelineRows].reverse().map((r) => opsActivityToTimelineStep(r, r.severity));

  return {
    settings,
    exceptionRows,
    timeline,
    pendingLabelCount,
    openRetailShipGroups,
  };
}

export async function loadAdminSupportBacklogSummary() {
  const [open, oldest] = await Promise.all([
    prisma.operationalSupportIssue.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.operationalSupportIssue.findFirst({
      where: { status: { not: "RESOLVED" } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  return {
    open,
    oldestWaiting: formatOpsRelativeAge(oldest?.createdAt ?? null),
  };
}

/**
 * Single fan-out for `/admin` home — shares domain sources with queues page but does not reuse `opsLoadTodayQueues()`
 * (`lib/ops/queries`). Treat both as parity candidates during `/ops` → `/admin` consolidation.
 */
export async function loadAdminHomeDashboard() {
  const [
    queueSummaries,
    alerts,
    activitySteps,
    shipmentExceptions,
    cateringKanban,
    fulfillmentWorkload,
    supportSummary,
  ] = await Promise.all([
    loadAdminQueueSummaries(),
    loadAdminOperationalAlerts(),
    loadAdminRecentActivitySteps(8),
    loadAdminShipmentExceptionRows(6),
    loadAdminCateringKanban(),
    loadAdminFulfillmentWorkload(),
    loadAdminSupportBacklogSummary(),
  ]);

  const queueHighlight = queueSummaries.slice(0, 4);
  const nextPackPreview = fulfillmentWorkload.tableRows.slice(0, 2);
  const labelBatchPreview = fulfillmentWorkload.batches[0] ?? null;

  return {
    queueSummaries,
    queueHighlight,
    alerts,
    activitySteps,
    shipmentExceptions,
    cateringKanban,
    nextPackPreview,
    labelBatchPreview,
    supportSummary,
  };
}
