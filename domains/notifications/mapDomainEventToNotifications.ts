import type { WorkflowId } from "@/domains/communications/workflowIds";
import type { DomainEvent } from "@/domains/events/aggregate";

export type NotificationFanoutChannels = Readonly<{
  emailTemplates?: readonly WorkflowId[];
  /** Future: in-app feed topic keys */
  inAppTopics?: readonly string[];
  /** Future: Twilio / SNS routing keys */
  smsRoutes?: readonly string[];
}>;

/**
 * Skeleton router — implementations will template-map per event name after worker land.
 */
export function mapDomainEventToNotifications(_event: DomainEvent): NotificationFanoutChannels {
  return {};
}
