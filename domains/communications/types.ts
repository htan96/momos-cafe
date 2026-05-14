import type { WorkflowId } from "@/domains/communications/workflowIds";

export const COMMUNICATION_CHANNELS = ["email", "sms", "in_app", "phone", "thread"] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

/**
 * Lightweight projection over EmailThread / SES / future adapters — persisted shape lives in Prisma later.
 */
export type CommunicationRecord = Readonly<{
  id: string;
  workflowId?: WorkflowId;
  channel: CommunicationChannel;
  subject?: string;
  /** Correlation anchors */
  commerceOrderId?: string;
  fulfillmentGroupId?: string;
  customerId?: string;
  createdAtIso: string;
}>;
