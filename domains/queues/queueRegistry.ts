/** Named operational queues correlating ops console partitions + future worker pools. */
export const QUEUE_IDS = [
  "commerce_checkout_finalize",
  "kitchen_fulfillment",
  "retail_packing",
  "shipping_labels",
  "email_transactional",
  "email_internal_ops",
  "support_triage",
  "catering_followup",
  "payments_settlement",
  "notifications_outbox",
] as const;

export type QueueId = (typeof QUEUE_IDS)[number];

export type QueueDomainOwnership =
  | "orders"
  | "fulfillment"
  | "shipping"
  | "communications"
  | "support"
  | "catering"
  | "reporting";

export type QueueMetadata = Readonly<{
  id: QueueId;
  owningDomain: QueueDomainOwnership;
  /** SLA hint expressed as human guidance — workers enforce separately. */
  slaHintMinutes?: number;
  peakRisk?: "low" | "medium" | "high";
}>;

export const QUEUE_REGISTRY: Record<QueueId, QueueMetadata> = {
  commerce_checkout_finalize: {
    id: "commerce_checkout_finalize",
    owningDomain: "orders",
    slaHintMinutes: 5,
    peakRisk: "high",
  },
  kitchen_fulfillment: { id: "kitchen_fulfillment", owningDomain: "fulfillment", slaHintMinutes: 20 },
  retail_packing: { id: "retail_packing", owningDomain: "fulfillment", slaHintMinutes: 45 },
  shipping_labels: { id: "shipping_labels", owningDomain: "shipping", slaHintMinutes: 30 },
  email_transactional: { id: "email_transactional", owningDomain: "communications", slaHintMinutes: 10 },
  email_internal_ops: { id: "email_internal_ops", owningDomain: "communications", slaHintMinutes: 60 },
  support_triage: { id: "support_triage", owningDomain: "support", slaHintMinutes: 120 },
  catering_followup: { id: "catering_followup", owningDomain: "catering", slaHintMinutes: 240 },
  payments_settlement: { id: "payments_settlement", owningDomain: "orders", slaHintMinutes: 1440 },
  notifications_outbox: {
    id: "notifications_outbox",
    owningDomain: "communications",
    slaHintMinutes: 2,
    peakRisk: "medium",
  },
};
