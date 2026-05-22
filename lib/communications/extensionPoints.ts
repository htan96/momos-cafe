/**
 * Operational messaging extension surface — SES inbound/outbound threading + persistence.
 *
 * Production inbound entry points:
 * - `POST /api/email/inbound` — Svix‑verified **Resend** (`persistInboundEmailEvent` → `ingestOperationalInboundEmail`).
 * - `POST /api/email/inbound-ses` — **Amazon SNS** (verified signing cert) + optional internal JSON forwarder (`INTERNAL_API_SECRET`).
 *
 * Unified persistence: `lib/email/ingestOperationalInboundEmail.ts`.
 */


/** @deprecated SES inbound ingestion lives at `POST /api/email/inbound-ses`; see `docs/ses-inbound-operational.md`. */
export async function ingestInboundSesPlaceholder(_payload: unknown): Promise<void> {
  void _payload;
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
