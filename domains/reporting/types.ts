import type { QueueId } from "@/domains/queues/queueRegistry";

/** Lightweight operational panel shapes — dashboards consume aggregates later. */
export type QueueHealthSnapshot = Readonly<{
  queueId: QueueId;
  depth: number;
  oldestWaitingSeconds?: number;
  slaBreaches24h?: number;
}>;

export type BlockedWorkflowRef = Readonly<{
  workflowKey: string;
  commerceOrderId?: string;
  fulfillmentGroupId?: string;
  reason: string;
  sinceIso: string;
}>;

export type OperationalSnapshot = Readonly<{
  generatedAtIso: string;
  queues: readonly QueueHealthSnapshot[];
  blocked: readonly BlockedWorkflowRef[];
}>;
