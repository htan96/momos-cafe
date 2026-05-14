import {
  COMMERCE_ORDER_STATUSES,
  type CommerceOrderStatus,
} from "@/lib/commerce/orderLifecycle";

/**
 * Canonical aggregate commerce lifecycle — delegated to `@/lib/commerce/orderLifecycle` at runtime.
 * Domain layer exposes stable names + a transition matrix for timelines / auditing.
 */
export const ORDER_STATUSES = COMMERCE_ORDER_STATUSES;

export type OrderStatus = CommerceOrderStatus;

export type OrderTransitionActor = "system" | "customer" | "admin" | "ops";

export type OrderTransitionEdge = Readonly<{
  from: OrderStatus;
  to: OrderStatus;
  actor: OrderTransitionActor;
}>;

/**
 * Mirrors `validateOrderStatusTransition`; actor hints are illustrative for audit/timeline stubs.
 */
export const ORDER_TRANSITIONS: readonly OrderTransitionEdge[] = [
  { from: "draft", to: "pending_payment", actor: "customer" },
  { from: "draft", to: "cancelled", actor: "customer" },
  { from: "pending_payment", to: "paid", actor: "system" },
  { from: "pending_payment", to: "cancelled", actor: "admin" },
  { from: "paid", to: "partially_fulfilled", actor: "ops" },
  { from: "paid", to: "fulfilled", actor: "ops" },
  { from: "paid", to: "cancelled", actor: "admin" },
  { from: "partially_fulfilled", to: "fulfilled", actor: "ops" },
  { from: "partially_fulfilled", to: "cancelled", actor: "admin" },
];
