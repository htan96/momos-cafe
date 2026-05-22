import { notificationTypeSupportsOutboundEmail } from "@/lib/email/notificationEmailBridge";
import { sendTransactionalOutbound } from "@/lib/email/sendTransactionalOutbound";
import type { ProcessResult } from "@/lib/notifications/processorContract";

/**
 * Lightweight payload contract for transactional email rows on the notification outbox.
 * Future producers should pin these shapes when enqueueing outbound mail asynchronously.
 */
export type DeliverOutboundEmailPayload = {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  commerceOrderId?: unknown;
  threadId?: unknown;
  replyTo?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

function coerceRecipients(to: unknown): string[] | null {
  if (typeof to === "string") {
    const c = [to.trim()].filter(Boolean);
    return c.length ? c : null;
  }
  if (Array.isArray(to)) {
    const out = (to as unknown[])
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    return out.length ? out : null;
  }
  return null;
}

export type DeliverOutboundEmailOptions = {
  /** Sequential delivery try from `processNotificationOutbox` — SES idempotency key suffix. */
  outboundAttempt?: number;
};

function buildOutboxMailIdempotencyKey(notificationId: string, outboundAttempt: number): string {
  return `notif-${notificationId}:attempt-${outboundAttempt}`;
}

/**
 * Validates `DeliverOutboundEmailPayload` and invokes `sendTransactionalOutbound` directly (no internal HTTP fetch).
 */
export async function deliverOutboundEmail(
  notificationId: string,
  notificationType: string,
  payload: unknown,
  options?: DeliverOutboundEmailOptions
): Promise<ProcessResult> {
  if (!notificationTypeSupportsOutboundEmail(notificationType)) {
    return {
      ok: false,
      notificationId,
      retryable: false,
      errorCode: "unsupported_transport_type",
      message: `notification type "${notificationType}" is not delegated to SES transactional outbox relay`,
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      notificationId,
      retryable: false,
      errorCode: "invalid_payload",
      message: "Outbound email payloads must be plain JSON objects",
    };
  }

  const raw = payload as DeliverOutboundEmailPayload;
  const recipients = coerceRecipients(raw.to);
  const subject = typeof raw.subject === "string" ? raw.subject.trim() : "";

  const textRaw = typeof raw.text === "string" ? raw.text : undefined;
  const htmlRaw = typeof raw.html === "string" ? raw.html : undefined;
  const text = textRaw?.trim() ?? null;
  const html = htmlRaw?.trim() ?? null;

  if (!subject || (!text && !html) || !recipients) {
    return {
      ok: false,
      notificationId,
      retryable: false,
      errorCode: "delivery_validation",
      message: "Outbound email payloads require subject, recipients, and html or text",
    };
  }

  const threadId = typeof raw.threadId === "string" ? raw.threadId.trim() : null;
  const commerceOrderId = typeof raw.commerceOrderId === "string" ? raw.commerceOrderId.trim() : null;
  const replyTo = typeof raw.replyTo === "string" ? raw.replyTo.trim() : undefined;
  const correlationId = typeof raw.correlationId === "string" ? raw.correlationId.trim() : undefined;
  const payloadIdempotency = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : undefined;
  const outboundAttempt = options?.outboundAttempt;
  const idempotencyKey =
    typeof outboundAttempt === "number" && Number.isFinite(outboundAttempt)
      ? buildOutboxMailIdempotencyKey(notificationId, outboundAttempt)
      : payloadIdempotency;

  const routed = await sendTransactionalOutbound({
    to: recipients,
    subject,
    text,
    html,
    threadId: threadId || null,
    commerceOrderId: commerceOrderId || null,
    replyTo,
    correlationId,
    idempotencyKey,
    suppressPlatformEvents: false,
  });

  if (routed.ok) {
    return { ok: true, notificationId, providerMessageId: routed.providerMessageId };
  }

  const retryable = routed.retrySuggested === true;

  return {
    ok: false,
    notificationId,
    retryable,
    errorCode: routed.platformCode.toLowerCase(),
    message: routed.customerMessage ?? routed.platformCode,
  };
}
