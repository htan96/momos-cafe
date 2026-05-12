/**
 * Operational messaging extension surface — SES inbound/outbound orchestration lands here later.
 *
 * Data model anchors (already in Prisma):
 * - EmailThread — customer ↔ order conversation shell (optional commerceOrderId, customerId).
 * - EmailMessage — individual inbound/outbound records with fulfillmentGroupId hints.
 * - NotificationEvent — append-only bus for transactional + ops notifications.
 *
 * Keep payment, fulfillment, and messaging adapters loosely coupled: emit events rather than importing senders directly.
 */


/** Future: SES receipt handler normalizes payloads into EmailMessage rows + ConversationParticipant linkage. */
export async function ingestInboundSesPlaceholder(_payload: unknown): Promise<void> {
  // Extension: correlate In-Reply-To / References RFC headers → EmailThread.providerThreadKey
}

/** Future: connect customer-sent mail to FulfillmentGroup + CommerceOrder timelines. */
export async function correlateThreadToFulfillmentPlaceholder(_threadId: string): Promise<void> {
  /* noop */
  void _threadId;
}


/** Example payload shape orchestrators can enqueue before SES/Resend adapters consume. */
export type OrderMessagingBridgePayload = {
  commerceOrder: CommerceOrderSummary;
  /** Free-form routing key for processors (e.g. `order.pickup_ready`). */
  eventKey: string;
};

/** Minimal commerce order envelope for queued messaging processors. */
type CommerceOrderSummary = {
  id: string;
  status: string;
  customerId: string | null;
};

export async function emitNotificationEventPlaceholder(
  payload: Record<string, unknown>
): Promise<void> {
  // Extension: prisma.notificationEvent.create({ data: { type, payload } })
  void payload;
}
