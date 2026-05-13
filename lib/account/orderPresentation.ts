export type DashboardOrderGroup = {
  id: string;
  pipeline: string;
  status: string;
  estimatedReadyAt: Date | null;
  pickupWindow?: { label: string; startsAt: Date; endsAt: Date } | null;
  shipments: {
    id: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: Date | null;
    shippingService: string | null;
    updatedAt: Date;
    createdAt: Date;
  }[];
};

export type DashboardPayment = {
  id: string;
  status: string;
  amountCents: number;
  capturedAt: Date | null;
  createdAt: Date;
  squarePaymentId: string | null;
};

export type DashboardOrderBrief = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  totalCents: number;
  metadata: Record<string, unknown> | null;
  fulfillmentGroups: DashboardOrderGroup[];
  payments: DashboardPayment[];
};

/** Stable friendly order number derived from UUID (deterministic display only). */
export function orderDisplayNumber(orderId: string): number {
  let n = 0;
  for (let i = 0; i < orderId.length; i++) {
    n = (n + orderId.charCodeAt(i) * (i + 1)) >>> 0;
  }
  return 1000 + (n % 9000);
}

export function pipelineLabel(pipeline: string): string {
  const p = pipeline.trim().toUpperCase();
  if (p === "KITCHEN") return "Café pickup";
  if (p === "RETAIL") return "Shop & shipment";
  if (p === "CATERING") return "Catering";
  return pipeline;
}

/** One-line fulfillment story for dashboards and checkout-adjacent copy. */
export function groupStatusHeadline(pipeline: string, status: string): string {
  const pl = pipeline.toUpperCase();

  if (pl === "KITCHEN") {
    switch (status) {
      case "pending":
        return "Kitchen is getting your pickup together";
      case "kitchen_preparing":
        return "In the kitchen — almost there";
      case "ready_for_pickup":
        return "Ready for pickup";
      case "completed":
        return "Pickup complete";
      case "cancelled":
        return "Kitchen order cancelled";
      default:
        return "Café pickup update";
    }
  }

  if (pl === "RETAIL") {
    switch (status) {
      case "pending":
        return "Shop order received";
      case "merch_processing":
        return "We're preparing shop items";
      case "ready_for_pickup":
        return "Shop pickup is ready";
      case "shipped":
        return "Shipped — tracking updates below";
      case "completed":
        return "Shop order complete";
      case "cancelled":
        return "Shop order cancelled";
      default:
        return "Shop order update";
    }
  }

  if (pl === "CATERING") {
    switch (status) {
      case "completed":
        return "Catering complete";
      case "cancelled":
        return "Catering declined";
      default:
        return "Catering coordination";
    }
  }

  return "Order update";
}

export function formatOrderInstant(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(d);
}

export function formatOrderTimeOnly(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
    timeZone,
  }).format(d);
}

export function isDashboardActiveOrder(order: DashboardOrderBrief): boolean {
  if (["draft", "pending_payment", "cancelled"].includes(order.status)) return false;
  if (order.status === "fulfilled") return false;
  const groups = order.fulfillmentGroups;
  if (groups.length === 0) {
    return order.status === "paid" || order.status === "partially_fulfilled";
  }
  const allTerminal = groups.every((g) => g.status === "completed" || g.status === "cancelled");
  if (order.status === "partially_fulfilled") return true;
  return !allTerminal;
}

export type CustomerTimelineTone = "done" | "current" | "muted";

export interface CustomerTimelineEvent {
  id: string;
  at: Date;
  title: string;
  detail?: string;
  tone: CustomerTimelineTone;
}

function paidTimestamp(order: DashboardOrderBrief): Date | null {
  const meta = order.metadata ?? {};
  const paidAtRaw = meta.paidAt;
  if (typeof paidAtRaw === "string") {
    const d = new Date(paidAtRaw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const cap = order.payments.map((p) => p.capturedAt).filter(Boolean) as Date[];
  if (cap.length > 0) {
    return cap.reduce((a, b) => (a > b ? a : b));
  }
  return null;
}

/**
 * Synthetic customer timeline — merges coarse order state, fulfillment, shipments, payments.
 * (Future: NotificationEvent log + inbound email timestamps.)
 */
export function buildCustomerOrderTimeline(order: DashboardOrderBrief): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];

  events.push({
    id: `${order.id}-placed`,
    at: order.createdAt,
    title: "Order received",
    detail:
      order.status === "draft" || order.status === "pending_payment"
        ? "We're waiting on payment confirmation."
        : undefined,
    tone: "done",
  });

  const pt = paidTimestamp(order);
  if (pt && !["draft", "pending_payment"].includes(order.status)) {
    events.push({
      id: `${order.id}-paid`,
      at: pt,
      title: "Payment confirmed",
      detail: undefined,
      tone: "done",
    });
  }

  order.fulfillmentGroups.forEach((g, idx) => {
    events.push({
      id: `${g.id}-${g.pipeline}-lifecycle`,
      at: new Date(order.createdAt.getTime() + (idx + 1) * 1000),
      title: `${pipelineLabel(g.pipeline)} — ${groupStatusHeadline(g.pipeline, g.status)}`,
      detail: g.estimatedReadyAt
        ? `Target ready around ${formatOrderInstant(g.estimatedReadyAt)}`
        : g.pickupWindow?.label,
      tone: g.status === "completed" ? "done" : "current",
    });

    const primaryShipment = g.shipments[0];
    if (primaryShipment?.trackingNumber) {
      events.push({
        id: `${primaryShipment.id}-track`,
        at: primaryShipment.updatedAt ?? primaryShipment.createdAt,
        title: "Tracking available",
        detail: `${primaryShipment.carrier ?? "Carrier"} · ${primaryShipment.trackingNumber}`,
        tone: "done",
      });
    }
    if (primaryShipment?.shippedAt) {
      events.push({
        id: `${primaryShipment.id}-ship`,
        at: primaryShipment.shippedAt,
        title: "Shipped",
        detail: primaryShipment.shippingService ?? undefined,
        tone: "done",
      });
    }
  });

  if (order.status === "fulfilled") {
    events.push({
      id: `${order.id}-fulfilled`,
      at: order.updatedAt,
      title: "All set",
      detail: "Every part of this order is wrapped up.",
      tone: "done",
    });
  }

  if (order.status === "cancelled") {
    events.push({
      id: `${order.id}-cancel`,
      at: order.updatedAt,
      title: "Order cancelled",
      tone: "muted",
    });
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  const lastIdx = events.length - 1;
  return events.map((e, i) => ({
    ...e,
    tone:
      e.tone === "muted"
        ? "muted"
        : i === lastIdx
          ? "current"
          : ("done" as CustomerTimelineTone),
  }));
}
