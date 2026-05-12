import type { FulfillmentPipeline } from "@/types/commerce";

/** Aggregate commerce order — coarse lifecycle */
export const COMMERCE_ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
] as const;

export type CommerceOrderStatus = (typeof COMMERCE_ORDER_STATUSES)[number];

/** Per-pipeline fulfillment rows — independent readiness */
export const KITCHEN_FULFILLMENT_STATUSES = [
  "pending",
  "kitchen_preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type KitchenFulfillmentStatus = (typeof KITCHEN_FULFILLMENT_STATUSES)[number];

export const RETAIL_FULFILLMENT_STATUSES = [
  "pending",
  "merch_processing",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type RetailFulfillmentStatus = (typeof RETAIL_FULFILLMENT_STATUSES)[number];

export type FulfillmentGroupStatus =
  | KitchenFulfillmentStatus
  | RetailFulfillmentStatus;

const KITCHEN_EDGES: Record<string, readonly string[]> = {
  pending: ["kitchen_preparing", "cancelled"],
  kitchen_preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const RETAIL_EDGES: Record<string, readonly string[]> = {
  pending: ["merch_processing", "cancelled"],
  merch_processing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["shipped", "completed", "cancelled"],
  shipped: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isKitchenFulfillmentStatus(s: string): s is KitchenFulfillmentStatus {
  return (KITCHEN_FULFILLMENT_STATUSES as readonly string[]).includes(s);
}

export function isRetailFulfillmentStatus(s: string): s is RetailFulfillmentStatus {
  return (RETAIL_FULFILLMENT_STATUSES as readonly string[]).includes(s);
}

export function initialFulfillmentStatus(): FulfillmentGroupStatus {
  return "pending";
}

export function validateFulfillmentTransition(
  pipeline: FulfillmentPipeline,
  from: string,
  to: string
): { ok: true } | { ok: false; reason: string } {
  const edges =
    pipeline === "KITCHEN"
      ? KITCHEN_EDGES[from] ?? null
      : RETAIL_EDGES[from] ?? null;
  if (!edges) return { ok: false, reason: `unknown_from_status:${from}` };
  if (!edges.includes(to)) {
    return {
      ok: false,
      reason: `illegal_transition:${pipeline}:${from}->${to}`,
    };
  }
  return { ok: true };
}

export function validateOrderStatusTransition(
  from: CommerceOrderStatus,
  to: CommerceOrderStatus
): { ok: true } | { ok: false; reason: string } {
  const edges: Record<string, readonly CommerceOrderStatus[]> = {
    draft: ["pending_payment", "cancelled"],
    pending_payment: ["paid", "cancelled"],
    paid: ["partially_fulfilled", "fulfilled", "cancelled"],
    partially_fulfilled: ["fulfilled", "cancelled"],
    fulfilled: [],
    cancelled: [],
  };
  const allowed = edges[from];
  if (!allowed) return { ok: false, reason: `unknown_order_status:${from}` };
  if (!allowed.includes(to))
    return { ok: false, reason: `illegal_order_transition:${from}->${to}` };
  return { ok: true };
}
