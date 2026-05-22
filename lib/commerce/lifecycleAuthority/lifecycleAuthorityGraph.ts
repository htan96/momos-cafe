import type { LifecycleAuthorityDomain } from "./types";

/**
 * Directed explainability edges: `from` is upstream / constraining authority for operational decisions about `to`.
 * This is documentation-oriented static data — not enforced at runtime.
 */
export type LifecycleAuthorityDependencyEdge = {
  readonly from: LifecycleAuthorityDomain;
  readonly to: LifecycleAuthorityDomain;
  /** Operator-facing wording; keep short. */
  readonly description: string;
};

export const LIFECYCLE_AUTHORITY_DEPENDENCY_EDGES: readonly LifecycleAuthorityDependencyEdge[] = [
  {
    from: "psp_payment",
    to: "derived_workflow_ui",
    description: "Coarse order status transitions that imply paid/settled posture must align with PSP-backed payment mirrors.",
  },
  {
    from: "psp_payment",
    to: "fulfillment",
    description: "Advancing fulfillment before payment settles is intentionally gated in healthy flows.",
  },
  {
    from: "fulfillment",
    to: "shipment",
    description: "Labels and carrier rows hang off FulfillmentGroup operational progress.",
  },
  {
    from: "shipment",
    to: "notification_outbox",
    description: "Carrier updates often enqueue downstream customer comms indirectly via orchestration keyed on shipment/order.",
  },
  {
    from: "psp_payment",
    to: "notification_outbox",
    description: "Payment webhooks enqueue work items; draining the outbox is orchestration-over-truth.",
  },
  {
    from: "replay_recovery_audit",
    to: "psp_payment",
    description: "Replay/reconcile paths may mutate payment mirrors — super-admin audited side effects.",
  },
  {
    from: "replay_recovery_audit",
    to: "shipment",
    description: "Shippo webhook replay/recovery aligns local shipment projections with upstream carrier ingestion.",
  },
  {
    from: "psp_payment",
    to: "operational_support_refund",
    description: "Refund cases must reconcile to tangible PaymentRecords before PSP submission.",
  },
  {
    from: "operational_support_refund",
    to: "derived_workflow_ui",
    description: "Refunds ultimately influence customer-visible money posture indirectly via PSP + bookkeeping.",
  },
] as const;

/** Short bullets stitched into loaders / dashboards (cheap static copy). */
export const LIFECYCLE_AUTHORITY_GRAPH_BULLETS: readonly string[] = [
  "PSP / Square truth constrains coarse CommerceOrder.status and fulfillment progression in healthy deployments.",
  "Fulfillment pipelines own kitchen/retail group status; outbound Shipment mirrors carrier/Shippo authority.",
  "NotificationEvent rows describe orchestration backlog — not PSP or carrier source-of-record.",
  "Replay / recovery overlays (super-admin audited) deliberately sit above PSP and carrier mirrors for corrective writes.",
];
