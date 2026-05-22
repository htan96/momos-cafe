/**
 * Consolidated vocabulary for commerce lifecycle authority — classification and explainability only.
 * No runtime orchestration enforcement; pairs with docs/architecture/commerce-lifecycle-authority.md.
 */

export const LIFECYCLE_AUTHORITY_DOMAINS = [
  /** Square / PSP final money state; local PaymentRecord mirrors reconciliation to PSP. */
  "psp_payment",
  /** FulfillmentGroup + operational transitions (kitchen/retail pipelines). */
  "fulfillment",
  /** Carrier / Shippo-derived tracking lifecycle mirrored on Shipment rows. */
  "shipment",
  /** NotificationEvent outbox orchestration — not commerce financial truth. */
  "notification_outbox",
  /** Webhook receipts, replay audits, governance tooling — forensic / recovery overlays. */
  "replay_recovery_audit",
  /** Coarse CommerceOrder.status, dashboards, customer-facing rollup copy. */
  "derived_workflow_ui",
  /** OperationalRefundCase and support-mediated refund choreography before/aside PSP refunds. */
  "operational_support_refund",
] as const;

export type LifecycleAuthorityDomain = (typeof LIFECYCLE_AUTHORITY_DOMAINS)[number];

export const DERIVED_STATE_CLASSIFICATIONS = ["authoritative", "derived", "reconciliation_only"] as const;

/**
 * Whether a persisted field is authoritative system-of-record, derived aggregate/view, or read-only reconciliation.
 */
export type DerivedStateClassification = (typeof DERIVED_STATE_CLASSIFICATIONS)[number];

/**
 * Who should own initiating a guarded transition — primary writer plus optional corroborators.
 */
export type TransitionOwnershipHint = {
  /** Domain that owns the write under normal integrity constraints. */
  primaryDomain: LifecycleAuthorityDomain;
  /** Domains whose truth must agree before widening derived aggregates (explainability-only). */
  contributingDomains?: LifecycleAuthorityDomain[];
  /** Short rationale for operators (not shown to customers). */
  rationale: string;
};
