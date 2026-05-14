/** Stub payloads for outbound domain bus — expand as orchestration lands. */
export type OrderDomainEvent =
  | { domain: "orders"; name: "order.created"; orderId: string; customerId: string | null }
  | { domain: "orders"; name: "order.checkout_started"; orderId: string }
  | { domain: "orders"; name: "order.paid"; orderId: string }
  | { domain: "orders"; name: "order.partially_fulfilled"; orderId: string }
  | { domain: "orders"; name: "order.fulfilled"; orderId: string }
  | { domain: "orders"; name: "order.cancelled"; orderId: string; reason?: string };
