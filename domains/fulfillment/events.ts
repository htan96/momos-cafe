export type FulfillmentDomainEvent =
  | { domain: "fulfillment"; name: "group.status_changed"; groupId: string; orderId: string; pipeline: string }
  | { domain: "fulfillment"; name: "queue.claimed"; queueItemId: string }
  | { domain: "fulfillment"; name: "packing.stage_advanced"; groupId: string; stage: string };
