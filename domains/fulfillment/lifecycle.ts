import type { FulfillmentGroupStatus } from "@/lib/commerce/orderLifecycle";

/** Per-group pipeline row status — production source: `FulfillmentGroup.status` strings. */
export type FulfillmentGroupLifecycleStatus = FulfillmentGroupStatus;

/**
 * Operational queue row state (kitchen run / packing station) — not identical to FulfillmentGroup status.
 */
export const FULFILLMENT_QUEUE_STATES = [
  "queued",
  "claimed",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const;

export type FulfillmentQueueState = (typeof FULFILLMENT_QUEUE_STATES)[number];

/** Packing-centric workflow stages — separate from carrier shipping / labels. */
export const PACKING_STAGES = [
  "not_started",
  "staging",
  "picking",
  "packing",
  "qc",
  "ready_for_handoff",
] as const;

export type PackingWorkflowStage = (typeof PACKING_STAGES)[number];

export type PackingStageTransition = Readonly<{
  from: PackingWorkflowStage;
  to: PackingWorkflowStage;
  actor: "packer" | "system" | "qa";
}>;

export const PACKING_STAGE_TRANSITIONS: readonly PackingStageTransition[] = [
  { from: "not_started", to: "staging", actor: "system" },
  { from: "staging", to: "picking", actor: "packer" },
  { from: "picking", to: "packing", actor: "packer" },
  { from: "packing", to: "qc", actor: "packer" },
  { from: "qc", to: "ready_for_handoff", actor: "qa" },
];
