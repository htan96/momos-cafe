import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";
import { sendTransactionalOutbound } from "@/lib/email/sendTransactionalOutbound";

/** Staff/system outbound transactional send — protected by orchestration middleware (`INTERNAL_API_SECRET`). */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`email:send:${ip}`, { windowMs: 60_000, max: 30 })) {
    return jsonError(429, "RATE_LIMITED", "Too many requests");
  }

  let body: {
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    commerceOrderId?: string | null;
    threadId?: string | null;
    replyTo?: string | null;
    correlationId?: string | null;
    idempotencyKey?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(400, "INVALID_JSON", "Expected JSON body");
  }

  const subject = body.subject?.trim();
  const text = body.text?.trim();
  const html = body.html?.trim();
  const toRaw = body.to;
  const recipients = Array.isArray(toRaw) ? toRaw : toRaw ? [toRaw] : [];
  const cleaned = recipients.map((x) => x.trim()).filter(Boolean);

  if (!subject || (!text && !html) || cleaned.length === 0) {
    return jsonError(400, "VALIDATION_ERROR", "to, subject, and text or html required");
  }

  const result = await sendTransactionalOutbound({
    to: cleaned,
    subject,
    text,
    html,
    commerceOrderId: body.commerceOrderId?.trim(),
    threadId: body.threadId?.trim(),
    replyTo: body.replyTo?.trim() ?? undefined,
    correlationId: body.correlationId?.trim() ?? undefined,
    idempotencyKey: body.idempotencyKey?.trim() ?? undefined,
    suppressPlatformEvents: false,
  });

  if (result.ok) {
    const legacySesAlias =
      result.transport === "ses" ? { sesMessageId: result.providerMessageId } : {};
    const legacyResendAlias =
      result.transport === "resend" ? { resendEmailId: result.providerMessageId } : {};
    return NextResponse.json({
      ok: true,
      transport: result.transport,
      threadId: result.threadId,
      messageId: result.outboundMessageId,
      providerMessageId: result.providerMessageId,
      ...legacySesAlias,
      /** Historical Resend-sent rows replay only. */
      ...legacyResendAlias,
    });
  }

  return jsonError(
    result.httpStatus,
    result.platformCode,
    result.customerMessage ?? result.platformCode,
    result.detail
  );
}
