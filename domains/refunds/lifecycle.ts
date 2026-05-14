/** Money movement case — parallels chargebacks/manual refunds workflows. */
export const REFUND_CASE_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "rejected",
  "processing",
  "completed",
  "cancelled",
] as const;

export type RefundCaseStatus = (typeof REFUND_CASE_STATUSES)[number];

export type RefundCaseTransitionEdge = Readonly<{
  from: RefundCaseStatus;
  to: RefundCaseStatus;
  actor: "customer" | "payments" | "admin" | "system";
}>;

export const REFUND_CASE_TRANSITIONS: readonly RefundCaseTransitionEdge[] = [
  { from: "requested", to: "under_review", actor: "system" },
  { from: "under_review", to: "approved", actor: "admin" },
  { from: "under_review", to: "rejected", actor: "admin" },
  { from: "approved", to: "processing", actor: "payments" },
  { from: "processing", to: "completed", actor: "payments" },
  { from: "requested", to: "cancelled", actor: "customer" },
];
