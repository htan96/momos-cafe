import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";

/** Staff/system outbound transactional send — protected by orchestration middleware */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`email:send:${ip}`, { windowMs: 60_000, max: 30 })) {
    return jsonError(429, "RATE_LIMITED", "Too many requests");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "orders@momosvallejo.com";
  if (!apiKey) {
    console.error("[email/send] RESEND_API_KEY missing");
    return jsonError(503, "EMAIL_UNCONFIGURED", "Outbound email not configured");
  }

  let body: {
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    commerceOrderId?: string | null;
    threadId?: string | null;
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

  let threadId = body.threadId?.trim() || null;
  const commerceOrderId = body.commerceOrderId?.trim() || null;

  try {
    if (!threadId && commerceOrderId) {
      const t = await prisma.emailThread.findFirst({
        where: { commerceOrderId },
        orderBy: { updatedAt: "desc" },
      });
      threadId = t?.id ?? null;
    }

    if (!threadId) {
      return jsonError(
        400,
        "THREAD_CONTEXT_REQUIRED",
        "Provide threadId or commerceOrderId so outbound mail stays threaded"
      );
    }

    const outbound = await prisma.emailMessage.create({
      data: {
        threadId,
        direction: "outbound",
        fromEmail: from,
        toEmails: cleaned as unknown as Prisma.InputJsonValue,
        subject,
        textBody: text ?? null,
        htmlBody: html ?? null,
        deliveryStatus: "queued",
      },
    });

    const resend = new Resend(apiKey);
    const sendPayload =
      text && html
        ? { from, to: cleaned, subject, text, html }
        : html
          ? { from, to: cleaned, subject, html }
          : { from, to: cleaned, subject, text: text! };

    const { data, error } = await resend.emails.send(sendPayload);

    if (error) {
      await prisma.emailMessage.update({
        where: { id: outbound.id },
        data: {
          deliveryStatus: "failed",
          rawPayload: { resendError: error } as Prisma.InputJsonValue,
        },
      });
      console.error("[email/send] Resend error", error);
      return jsonError(502, "RESEND_REJECTED", error.message ?? "Resend rejected send");
    }

    await prisma.emailMessage.update({
      where: { id: outbound.id },
      data: {
        providerMessageId: data?.id,
        deliveryStatus: "sent",
      },
    });

    await appendNotificationEvent(
      "email.outbound.sent",
      {
        threadId,
        messageId: outbound.id,
        resendEmailId: data?.id ?? null,
        to: cleaned,
      } as Prisma.InputJsonValue
    );

    return NextResponse.json({ ok: true, threadId, messageId: outbound.id, resendEmailId: data?.id });
  } catch (e) {
    console.error("[email/send POST]", e);
    return jsonError(500, "EMAIL_SEND_FAILED", "Could not send email");
  }
}
