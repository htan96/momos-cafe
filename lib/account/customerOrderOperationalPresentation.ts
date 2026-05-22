import type {
  OperationalActivityEvent,
  OperationalRefundCaseStatus,
  OperationalSupportIssueStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { CustomerTimelineStep } from "@/components/customer/CustomerTimeline";
import { groupStatusHeadline, pipelineLabel, formatOrderInstant } from "@/lib/account/orderPresentation";
import { isPlatformEventMetadataV1 } from "@/lib/platform/events/metadata";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/** Activity `OperationalActivityEvent.type` values surfaced on the storefront order detail timeline. */
export const CUSTOMER_SAFE_OPERATIONAL_ACTIVITY_TYPES: readonly string[] = [
  OPERATIONAL_EVENT_TYPES.ORDER_CREATED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_PENDING_REGISTERED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
  OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
  PLATFORM_EVENT_SUBTYPE.FULFILLMENT_GROUP_STATUS_CHANGED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
  PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_CREATED,
  PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_UPDATED,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REQUESTED,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REVIEWING,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_APPROVED,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_DENIED,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SUBMITTED_TO_SQUARE,
  PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SQUARE_COMPLETED,
];

/** Prisma `where` helpers — aligns with `@/lib/liveActivity/queryLiveActivityFeed` entity linkage. */
export function operationalActivityScopesCommerceOrder(commerceOrderId: string): Prisma.OperationalActivityEventWhereInput {
  return {
    OR: [
      { metadata: { path: ["entities", "commerceOrderId"], equals: commerceOrderId } },
      { metadata: { path: ["commerceOrderId"], equals: commerceOrderId } },
      { metadata: { path: ["entities", "orderId"], equals: commerceOrderId } },
      { metadata: { path: ["orderId"], equals: commerceOrderId } },
    ],
  };
}

export function operationalActivityForCustomerTimelineWhere(
  commerceOrderId: string
): Prisma.OperationalActivityEventWhereInput {
  return {
    AND: [
      operationalActivityScopesCommerceOrder(commerceOrderId),
      { type: { in: [...CUSTOMER_SAFE_OPERATIONAL_ACTIVITY_TYPES] } },
    ],
  };
}

export const SUPPORT_ISSUE_CUSTOMER_LABEL: Record<OperationalSupportIssueStatus, string> = {
  OPEN: "We’re reviewing your message",
  WAITING_CUSTOMER: "Awaiting your reply",
  REVIEWING: "Our team is working on this",
  ESCALATED: "Handed to a specialist",
  RESOLVED: "Marked resolved",
};

export const REFUND_CASE_CUSTOMER_LABEL: Record<OperationalRefundCaseStatus, string> = {
  REQUESTED: "Refund requested",
  REVIEWING: "Refund request under review",
  APPROVED: "Refund approved",
  DENIED: "Refund declined",
  SUBMITTED_TO_SQUARE: "Refund sent for processing",
  SQUARE_COMPLETED: "Refund processed",
  SQUARE_FAILED: "Refund processing encountered an issue — we’ll follow up",
};

export type CustomerOperationalTimelineEventDto = {
  id: string;
  at: Date;
  title: string;
  detail?: string | undefined;
};

/** Present one persisted activity row — no invented ordering or synthetic checkpoints. */
export function presentCustomerOperationalActivityEvent(row: OperationalActivityEvent): CustomerOperationalTimelineEventDto {
  const base: CustomerOperationalTimelineEventDto = {
    id: row.id,
    at: row.createdAt,
    title: fallbackTitle(row.type),
    detail: undefined,
  };

  const envelope = row.metadata != null ? row.metadata : null;
  if (envelope && typeof envelope === "object" && !Array.isArray(envelope)) {
    const m = envelope as Record<string, unknown>;
    const detail =
      isPlatformEventMetadataV1(m) ?
        ({ ...m.detail } as Record<string, unknown>)
      : m.detail && typeof m.detail === "object" && !Array.isArray(m.detail) ?
        (m.detail as Record<string, unknown>)
      : {};

    switch (row.type) {
      case PLATFORM_EVENT_SUBTYPE.FULFILLMENT_GROUP_STATUS_CHANGED: {
        const pipeline = String(detail.pipeline ?? "");
        const to = String(detail.newStatus ?? "").trim().toLowerCase();
        base.title =
          `${pipelineLabel(pipeline)} — ${to ? groupStatusHeadline(pipeline, to) : "Update"}`;
        break;
      }
      case OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED:
        base.title = "Shipping label printed";
        {
          const car = (detail.carrier ?? m.carrier) as unknown;
          if (typeof car === "string" && car.trim()) base.detail = `${car.trim()} shipment`;
        }
        break;
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED:
      case PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE:
        base.title = shipmentCarrierTitle(row.type);
        if (detail.carrier) base.detail = `Carrier · ${String(detail.carrier)}`;
        break;
      case PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_CREATED:
      case PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_UPDATED:
        base.title =
          row.type === PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_CREATED ?
            "Support ticket opened"
          : "Support ticket updated";
        if (typeof detail.status === "string") {
          const lab = SUPPORT_ISSUE_CUSTOMER_LABEL[detail.status.toUpperCase() as OperationalSupportIssueStatus];
          if (lab) base.detail = lab;
        }
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REQUESTED:
        base.title = REFUND_CASE_CUSTOMER_LABEL.REQUESTED;
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REVIEWING:
        base.title = REFUND_CASE_CUSTOMER_LABEL.REVIEWING;
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_APPROVED:
        base.title = REFUND_CASE_CUSTOMER_LABEL.APPROVED;
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_DENIED:
        base.title = REFUND_CASE_CUSTOMER_LABEL.DENIED;
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SUBMITTED_TO_SQUARE:
        base.title = REFUND_CASE_CUSTOMER_LABEL.SUBMITTED_TO_SQUARE;
        break;
      case PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SQUARE_COMPLETED:
        base.title = REFUND_CASE_CUSTOMER_LABEL.SQUARE_COMPLETED;
        break;
      case OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED:
      case OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED:
      case OPERATIONAL_EVENT_TYPES.PAYMENT_PENDING_REGISTERED:
        base.title =
          row.type === OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED ?
            "Payment confirmed"
          : row.type === OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED ?
            "Payment did not complete"
          : "Payment started";
        if (typeof m.amountCents === "number" && m.amountCents > 0) {
          base.detail = `$${(m.amountCents / 100).toFixed(2)}`;
        }
        break;
      case OPERATIONAL_EVENT_TYPES.ORDER_CREATED:
        base.title = "Order started";
        break;
      default:
        break;
    }
  }

  return base;
}

function fallbackTitle(type: string): string {
  if (type.startsWith("shipment.")) return "Shipment update";
  if (type.startsWith("refund.")) return "Refund update";
  if (type.startsWith("support.")) return "Support update";
  if (type.startsWith("payment.")) return "Payment update";
  if (type.startsWith("fulfillment.")) return "Fulfillment update";
  if (type.startsWith("order.")) return "Order update";
  return "Update";
}

function shipmentCarrierTitle(type: string): string {
  switch (type) {
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED:
      return "Carrier scan recorded";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT:
      return "Package in transit";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY:
      return "Out for delivery";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED:
      return "Delivered";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION:
      return "Carrier reported a delay or exception";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED:
      return "Package returned";
    case PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE:
      return "Delivery issue";
    default:
      return "Shipment update";
  }
}

export function mapActivityRowsToCustomerTimeline(
  rows: OperationalActivityEvent[]
): CustomerOperationalTimelineEventDto[] {
  return rows.map(presentCustomerOperationalActivityEvent);
}

function readShipmentIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  const se = m.entities;
  if (se && typeof se === "object" && !Array.isArray(se)) {
    const sid = (se as Record<string, unknown>).shipmentId;
    if (typeof sid === "string" && sid.trim()) return sid.trim();
  }
  const flat = m.shipmentId;
  if (typeof flat === "string" && flat.trim()) return flat.trim();
  return null;
}

const CUSTOMER_TIMELINE_SHIPMENT_ACTIVITY = new Set<string>([
  OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_TRACKING_UPDATED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_IN_TRANSIT,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_OUT_FOR_DELIVERY,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_DELIVERED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_EXCEPTION,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_RETURNED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_FAILURE,
]);

/**
 * Only **persisted** `OperationalActivityEvent` rows for this shipment (label + carrier subtypes).
 * Returns an empty list when nothing was emitted — callers must not fabricate placeholders.
 */
export function deriveCustomerShipmentOperationalSteps(
  shipmentId: string,
  rows: OperationalActivityEvent[]
): CustomerTimelineStep[] {
  const ours = rows
    .filter((r) => readShipmentIdFromMetadata(r.metadata) === shipmentId)
    .filter((r) => CUSTOMER_TIMELINE_SHIPMENT_ACTIVITY.has(r.type))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return ours.map((r, idx) => {
    const dto = presentCustomerOperationalActivityEvent(r);
    const isLast = idx === ours.length - 1;
    return {
      id: r.id,
      title: dto.title,
      meta: formatOrderInstant(r.createdAt),
      tone: isLast ? "current" : "done",
    };
  });
}
