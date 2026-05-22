import type {
  CafeOrder,
  NotificationEvent,
  OperationalActivityEvent,
  WebhookDeliveryReceipt,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import {
  operationalIncidentWhereForOrder,
  readCateringInquiryIdFromCommerceMetadata,
} from "@/lib/operations/operationalContextLinks";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import {
  WEBHOOK_OPS_EVENT_TYPES,
} from "@/lib/operations/queryWebhookOpsActivityForCommerceOrder";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { prisma } from "@/lib/prisma";
import {
  collectWebhookSyncHints,
  readSquareOrderIdFromJson,
} from "@/lib/commerce/squareOperationalVisibility";
import { buildCommerceOrderOperationalActivityWhere } from "./buildCommerceOrderOperationalActivityWhere";
import { readOrderConsoleMetadataStrings } from "./readOrderConsoleMetadata";
import type { CommunicationTimelineEntryDto } from "@/lib/operations/communications/buildOperationalCommunicationTimeline";
import { buildOperationalCommunicationTimeline } from "@/lib/operations/communications/buildOperationalCommunicationTimeline";

const SHIPMENT_CONSOLE_PLATFORM_SUBTYPES = [
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_ORPHAN,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_UNHANDLED_EVENT,
] as const satisfies readonly string[];

/** Canonical types surfaced on commerce order timelines (payments, fulfillment failures, drafts, webhooks). */
const ORDER_CONSOLE_CORE_TYPES = [
  OPERATIONAL_EVENT_TYPES.ORDER_CREATED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
  OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
  OPERATIONAL_EVENT_TYPES.FULFILLMENT_APPROVED,
  PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
  PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_QUOTE_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
  ...SHIPMENT_CONSOLE_PLATFORM_SUBTYPES,
  PLATFORM_EVENT_SUBTYPE.ORDER_DRAFT_CREATE_FAILED,
  PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
  PLATFORM_EVENT_SUBTYPE.PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP,
  PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
] as const satisfies readonly string[];

const ORDER_CONSOLE_ACTIVITY_TYPES = [...new Set([...ORDER_CONSOLE_CORE_TYPES, ...WEBHOOK_OPS_EVENT_TYPES])];

export const operationalOrderConsoleInclude = {
  customer: { select: { id: true, email: true, phone: true, authMetadata: true } },
  items: { orderBy: { title: "asc" } },
  payments: { orderBy: { createdAt: "desc" } },
  fulfillmentGroups: {
    orderBy: { id: "asc" },
    include: {
      pickupWindow: { select: { label: true, startsAt: true, endsAt: true } },
      shipments: { orderBy: { createdAt: "desc" } },
    },
  },
  emailThreads: {
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subjectSnapshot: true,
      commerceOrderId: true,
    },
  },
} satisfies Prisma.CommerceOrderInclude;

const operationalConsoleSupportIssueSelect = {
  id: true,
  status: true,
  title: true,
  summary: true,
  resolutionNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const operationalConsoleRefundCaseSelect = {
  id: true,
  status: true,
  reason: true,
  internalNotes: true,
  amountCents: true,
  squareRefundId: true,
  paymentRecordId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type OperationalConsoleSupportIssue = Prisma.OperationalSupportIssueGetPayload<{
  select: typeof operationalConsoleSupportIssueSelect;
}>;

export type OperationalConsoleRefundCase = Prisma.OperationalRefundCaseGetPayload<{
  select: typeof operationalConsoleRefundCaseSelect;
}>;

export type OperationalOrderConsoleOrder = Prisma.CommerceOrderGetPayload<{
  include: typeof operationalOrderConsoleInclude;
}>;

export type OperationalTimelineEntry =
  | { kind: "activity"; ts: Date; id: string; row: OperationalActivityEvent }
  | { kind: "webhook_receipt"; ts: Date; id: string; row: WebhookDeliveryReceipt }
  | { kind: "notification"; ts: Date; id: string; row: NotificationEvent };

export type OperationalOrderConsoleSnapshot = {
  order: OperationalOrderConsoleOrder | null;
  orderSquareOrderId: string | undefined;
  webhookSyncLines: string[];
  metaLabels: ReturnType<typeof readOrderConsoleMetadataStrings>;
  cateringInquiryId: string | null | undefined;
  isCateringPipeline: boolean;
  /** True when heuristic / metadata suggests Square payment drift (`PAYMENT_SQUARE_ORPHAN_WEBHOOK` or metadata orphan hints). */
  orphanPaymentSignals: boolean;
  /** MIXED fulfillment mode or both kitchen + retail groups. */
  mixedKitchenRetailBadge: boolean;
  activityTimeline: OperationalActivityEvent[];
  webhookReceipts: WebhookDeliveryReceipt[];
  notifications: NotificationEvent[];
  unifiedTimeline: OperationalTimelineEntry[];
  /** Email threads, internal notes, notification outbox slices, SES/Resend receipts — chronological. */
  communicationTimeline: CommunicationTimelineEntryDto[];
  supportIssues: OperationalConsoleSupportIssue[];
  refundCases: OperationalConsoleRefundCase[];
  relatedIncidents: Awaited<ReturnType<typeof prisma.operationalIncident.findMany>>;
  legacyCafeOrders: CafeOrder[];
  shippingLabelPolicy: {
    /** Mirrors `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` — surfaced to SSR clients for label UX. */
    requireFulfillmentApprovalForShippoLabels: boolean;
  };
};

function dedupeActivityById(events: OperationalActivityEvent[]): OperationalActivityEvent[] {
  const map = new Map<string, OperationalActivityEvent>();
  for (const e of events) map.set(e.id, e);
  return [...map.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function detectOrphanPaymentSignals(
  order: OperationalOrderConsoleOrder,
  activity: OperationalActivityEvent[]
): boolean {
  if (
    activity.some(
      (e) =>
        e.type.includes("orphan") ||
        e.type === PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK ||
        e.type === PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED
    )
  ) {
    return true;
  }
  const scanJson = (meta: unknown): boolean => {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
    const o = meta as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      const kl = k.toLowerCase();
      if (kl.includes("orphan") && v !== false && v != null) return true;
    }
    return false;
  };
  if (scanJson(order.metadata)) return true;
  return order.payments.some((p) => scanJson(p.metadata));
}

function mergeUnifiedTimeline(
  activity: OperationalActivityEvent[],
  receipts: WebhookDeliveryReceipt[],
  notifications: NotificationEvent[]
): OperationalTimelineEntry[] {
  const out: OperationalTimelineEntry[] = [];
  for (const row of activity) {
    out.push({ kind: "activity", ts: row.createdAt, id: `a:${row.id}`, row });
  }
  for (const row of receipts) {
    out.push({ kind: "webhook_receipt", ts: row.receivedAt, id: `w:${row.id}`, row });
  }
  for (const row of notifications) {
    out.push({ kind: "notification", ts: row.createdAt, id: `n:${row.id}`, row });
  }
  out.sort((x, y) => {
    const d = x.ts.getTime() - y.ts.getTime();
    if (d !== 0) return d;
    return x.id.localeCompare(y.id);
  });
  return out;
}

export type LoadOperationalOrderConsoleOptions = {
  /** Super-admin advanced panel only — optional DB hit for `cafe_orders` by email + metadata id. */
  includeLegacyCafeLookup?: boolean;
};

export async function loadOperationalOrderConsole(
  orderId: string,
  opts?: LoadOperationalOrderConsoleOptions
): Promise<OperationalOrderConsoleSnapshot | null> {
  if (!OPS_ENTITY_UUID_RE.test(orderId)) return null;

  const order = await prisma.commerceOrder.findUnique({
    where: { id: orderId },
    include: operationalOrderConsoleInclude,
  });

  if (!order) return null;

  const orderSquareOrderId = readSquareOrderIdFromJson(order.metadata);
  const metaLabels = readOrderConsoleMetadataStrings(order.metadata);
  const webhookSyncLines = [
    ...collectWebhookSyncHints("CommerceOrder", order.metadata),
    ...order.payments.flatMap((p) => collectWebhookSyncHints("PaymentRecord", p.metadata)),
  ];

  const shipmentIds = order.fulfillmentGroups.flatMap((g) => g.shipments.map((s) => s.id));
  const paymentIds = order.payments.map((p) => p.id);

  const scopeWhere = buildCommerceOrderOperationalActivityWhere({
    orderId: order.id,
    shipmentIds,
    paymentIds,
  });

  const activityWhere: Prisma.OperationalActivityEventWhereInput = {
    AND: [{ type: { in: [...ORDER_CONSOLE_ACTIVITY_TYPES] } }, scopeWhere],
  };

  const cateringInquiryId = readCateringInquiryIdFromCommerceMetadata(order.metadata);
  const isCateringPipeline = order.fulfillmentGroups.some(
    (g) => g.pipeline.trim().toUpperCase() === "CATERING"
  );

  const hasKitchen = order.fulfillmentGroups.some((g) => g.pipeline.trim().toUpperCase() === "KITCHEN");
  const hasRetail = order.fulfillmentGroups.some((g) => g.pipeline.trim().toUpperCase() === "RETAIL");
  const mixedKitchenRetailBadge =
    order.fulfillmentMode === "MIXED" || (hasKitchen && hasRetail);

  const notificationWhere: Prisma.NotificationEventWhereInput = {
    OR: [
      { payload: { path: ["commerceOrderId"], equals: order.id } },
      { payload: { path: ["orderId"], equals: order.id } },
      { payload: { path: ["entities", "commerceOrderId"], equals: order.id } },
    ],
  };

  const receiptWhere: Prisma.WebhookDeliveryReceiptWhereInput =
    paymentIds.length > 0
      ? {
          OR: [{ commerceOrderId: order.id }, { paymentRecordId: { in: paymentIds } }],
        }
      : { commerceOrderId: order.id };

  const [activityRaw, webhookReceipts, notifications, relatedIncidents, communicationTimeline, supportIssues, refundCases] =
    await Promise.all([
    prisma.operationalActivityEvent.findMany({
      where: activityWhere,
      orderBy: { createdAt: "asc" },
      take: 320,
    }),
    prisma.webhookDeliveryReceipt.findMany({
      where: receiptWhere,
      orderBy: { receivedAt: "asc" },
      take: 80,
    }),
    prisma.notificationEvent.findMany({
      where: notificationWhere,
      orderBy: { createdAt: "desc" },
      take: 28,
    }),
    prisma.operationalIncident.findMany({
      where: operationalIncidentWhereForOrder(order.id),
      orderBy: { lastDetectedAt: "desc" },
      take: 25,
    }),
    buildOperationalCommunicationTimeline(order.id),
    prisma.operationalSupportIssue.findMany({
      where: { commerceOrderId: order.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: operationalConsoleSupportIssueSelect,
    }),
    prisma.operationalRefundCase.findMany({
      where: { commerceOrderId: order.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: operationalConsoleRefundCaseSelect,
    }),
  ]);

  const activityTimeline = dedupeActivityById(activityRaw);
  const orphanPaymentSignals = detectOrphanPaymentSignals(order, activityTimeline);

  const notificationsAsc = [...notifications].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let legacyCafeOrders: CafeOrder[] = [];
  if (opts?.includeLegacyCafeLookup) {
    const email = order.customer?.email?.trim();
    const byMetaId = metaLabels.legacyCafeOrderId;
    const idCandidates: string[] = [];
    if (byMetaId && OPS_ENTITY_UUID_RE.test(byMetaId)) idCandidates.push(byMetaId);
    const byRow = await Promise.all(
      idCandidates.map((id) => prisma.cafeOrder.findUnique({ where: { id } }))
    );
    legacyCafeOrders = byRow.filter(Boolean) as CafeOrder[];

    if (email) {
      const rawMatch = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id
        FROM cafe_orders
        WHERE LOWER(customer->>'email') = LOWER(${email})
        ORDER BY created_at DESC
        LIMIT 8
      `;
      const ids = rawMatch.map((r) => r.id).filter((id) => OPS_ENTITY_UUID_RE.test(id));
      if (ids.length) {
        const rows = await prisma.cafeOrder.findMany({ where: { id: { in: ids } } });
        const map = new Map(rows.map((r) => [r.id, r]));
        const ordered = ids.map((id) => map.get(id)).filter(Boolean) as CafeOrder[];
        const merged = new Map<string, CafeOrder>();
        for (const r of [...legacyCafeOrders, ...ordered]) merged.set(r.id, r);
        legacyCafeOrders = [...merged.values()].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      }
    }
  }

  const unifiedTimeline = mergeUnifiedTimeline(activityTimeline, webhookReceipts, notificationsAsc);

  return {
    order,
    orderSquareOrderId,
    webhookSyncLines,
    metaLabels,
    cateringInquiryId,
    isCateringPipeline,
    orphanPaymentSignals,
    mixedKitchenRetailBadge,
    activityTimeline,
    webhookReceipts,
    notifications: notificationsAsc,
    unifiedTimeline,
    communicationTimeline,
    supportIssues,
    refundCases,
    relatedIncidents,
    legacyCafeOrders,
    shippingLabelPolicy: {
      requireFulfillmentApprovalForShippoLabels:
        process.env.SHIPPO_REQUIRE_FULFILLMENT_APPROVAL?.trim() === "true",
    },
  };
}

export { loadOperationalOrderConsole as loadOperationalOrderConsoleModel };
