import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";

function uniq(ids: string[]): string[] {
  return [...new Set(ids.map((x) => x.toLowerCase()))];
}

function extractOrderIds(blob: string): string[] {
  const r =
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
  return uniq(blob.match(r) ?? []);
}

function extractAddresses(blob: unknown): string[] {
  if (!blob) return [];
  if (typeof blob === "string") return [blob];
  if (Array.isArray(blob)) return blob.flatMap(extractAddresses);
  if (typeof blob === "object" && blob !== null && "email" in blob) {
    const e = (blob as { email?: string }).email;
    return typeof e === "string" ? [e] : [];
  }
  return [];
}

/** Flexible parser — Resend evolves payloads; we persist raw JSON for forward-compat */
export async function persistInboundEmailEvent(payload: Record<string, unknown>): Promise<{
  threadId: string;
  messageId: string;
  linkedOrders: string[];
}> {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const from =
    (typeof data.from === "string" && data.from) ||
    extractAddresses(data.from)[0] ||
    "unknown@invalid";
  const to =
    extractAddresses(data.to).length > 0
      ? extractAddresses(data.to)
      : extractAddresses(data.recipients);
  const subject = typeof data.subject === "string" ? data.subject : "";
  const textBody =
    typeof data.text === "string" ? data.text : typeof data.body === "string" ? data.body : null;
  const htmlBody = typeof data.html === "string" ? data.html : null;

  const dedupeKey =
    (typeof data.email_id === "string" && data.email_id) ||
    (typeof data.id === "string" && data.id) ||
    undefined;

  const headers = data.headers as Record<string, unknown> | undefined;
  const pickHeader = (keys: string[]) => {
    if (!headers) return undefined;
    for (const k of keys) {
      const v = headers[k] ?? headers[k.toLowerCase() as keyof typeof headers];
      if (typeof v === "string") return v;
    }
    return undefined;
  };

  const rfcMessageId =
    pickHeader(["Message-ID", "Message-Id", "message-id"]) ??
    (typeof data.message_id === "string" ? data.message_id : null);
  const inReplyTo = pickHeader(["In-Reply-To", "in-reply-to"]);
  const referencesHeader = pickHeader(["References", "references"]);

  if (dedupeKey) {
    const dup = await prisma.emailMessage.findFirst({
      where: {
        OR: [{ providerMessageId: dedupeKey }, ...(rfcMessageId ? [{ rfcMessageId }] : [])],
      },
    });
    if (dup) {
      return { threadId: dup.threadId, messageId: dup.id, linkedOrders: [] };
    }
  }

  let thread =
    (inReplyTo &&
      (
        await prisma.emailMessage.findFirst({
          where: {
            OR: [{ rfcMessageId: inReplyTo.trim() }, { providerMessageId: inReplyTo.trim() }],
          },
          include: { thread: true },
        })
      )?.thread) ??
    null;

  const blobForOrders = `${subject}\n${textBody ?? ""}`;
  const linkedIds = extractOrderIds(blobForOrders);

  if (!thread) {
    const commerceOrderId = linkedIds.length === 1 ? linkedIds[0] : null;
    thread = await prisma.emailThread.create({
      data: {
        subjectSnapshot: subject.slice(0, 512),
        commerceOrderId,
      },
    });
  }

  const msg = await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      direction: "inbound",
      fromEmail: from,
      toEmails: (to.length ? to : ["orders@momosvallejo.com"]) as unknown as Prisma.InputJsonValue,
      subject: subject.slice(0, 2048),
      textBody,
      htmlBody,
      providerMessageId: typeof data.email_id === "string" ? data.email_id : rfcMessageId ?? undefined,
      rfcMessageId: rfcMessageId ?? undefined,
      inReplyTo: inReplyTo ?? undefined,
      referencesHeader: referencesHeader ?? undefined,
      deliveryStatus: "received",
      rawPayload: payload as Prisma.InputJsonValue,
    },
  });

  if (linkedIds.length && thread.commerceOrderId === null && linkedIds.length === 1) {
    await prisma.emailThread.update({
      where: { id: thread.id },
      data: { commerceOrderId: linkedIds[0] },
    });
  }

  for (const oid of linkedIds) {
    await prisma.orderMessageLink.create({
      data: {
        threadId: thread.id,
        messageId: msg.id,
        orderKind: "commerce_order",
        orderId: oid,
      },
    });
  }

  await appendNotificationEvent(
    "email.inbound.received",
    {
      threadId: thread.id,
      messageId: msg.id,
      fromEmail: from,
      linkedOrders: linkedIds,
    } as Prisma.InputJsonValue
  );

  return { threadId: thread.id, messageId: msg.id, linkedOrders: linkedIds };
}
