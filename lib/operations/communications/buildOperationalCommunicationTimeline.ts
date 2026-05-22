import type { EmailMessage, EmailThread, NotificationEvent, OperationalCommunicationNote, WebhookDeliveryReceipt } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { notificationPayloadLinksCommerceOrder } from "@/lib/operations/communications/notificationPayloadLinksCommerceOrder";

const NOTIFICATION_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
const EMAILISH_WEBHOOK_PROVIDERS = new Set(["ses", "resend"]);

export type CommunicationTimelineEmailMessageDto = {
  kind: "email_message";
  id: string;
  ts: string;
  threadId: string;
  threadSubjectSnapshot: string | null;
  messageId: string;
  direction: string;
  fromEmail: string;
  toEmailsSummary: string;
  subject: string | null;
  bodyPreview: string | null;
  deliveryStatus: string;
};

export type CommunicationTimelineInternalNoteDto = {
  kind: "internal_note";
  id: string;
  ts: string;
  noteKind: string;
  visibility: string;
  body: string;
  authorStaffSub: string | null;
  supportIssueId: string | null;
};

export type CommunicationTimelineNotificationDto = {
  kind: "notification_event";
  id: string;
  ts: string;
  type: string;
  processedAt: string | null;
  payload: unknown;
};

export type CommunicationTimelineWebhookDto = {
  kind: "webhook_delivery";
  id: string;
  ts: string;
  provider: string;
  eventType: string | null;
  processingStatus: string;
  signatureValid: boolean;
  commerceOrderId: string | null;
  paymentRecordId: string | null;
};

export type CommunicationTimelineEntryDto =
  | CommunicationTimelineEmailMessageDto
  | CommunicationTimelineInternalNoteDto
  | CommunicationTimelineNotificationDto
  | CommunicationTimelineWebhookDto;

function previewText(raw: string | null | undefined, max = 1800): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function summarizeToEmails(raw: Jsonish): string {
  try {
    const s = JSON.stringify(raw);
    return s.length > 600 ? `${s.slice(0, 600)}…` : s;
  } catch {
    return "(unserializable)";
  }
}

type Jsonish = EmailMessage["toEmails"];

function messageToDto(thread: Pick<EmailThread, "id" | "subjectSnapshot">, m: EmailMessage): CommunicationTimelineEmailMessageDto {
  return {
    kind: "email_message",
    id: `email:${m.id}`,
    ts: m.createdAt.toISOString(),
    threadId: thread.id,
    threadSubjectSnapshot: thread.subjectSnapshot,
    messageId: m.id,
    direction: m.direction,
    fromEmail: m.fromEmail,
    toEmailsSummary: summarizeToEmails(m.toEmails),
    subject: m.subject,
    bodyPreview: previewText(m.textBody ?? m.htmlBody ?? undefined),
    deliveryStatus: m.deliveryStatus,
  };
}

/** Server-computed chronological merge for commerce order timelines (RSC + ops API). */
export async function buildOperationalCommunicationTimeline(
  commerceOrderId: string
): Promise<CommunicationTimelineEntryDto[]> {
  if (!OPS_ENTITY_UUID_RE.test(commerceOrderId)) return [];

  const since = new Date(Date.now() - NOTIFICATION_LOOKBACK_MS);

  const payments = await prisma.paymentRecord.findMany({
    where: { orderId: commerceOrderId },
    select: { id: true },
  });
  const paymentIds = payments.map((p) => p.id);

  const receiptWhere =
    paymentIds.length > 0 ?
      {
        AND: [
          { OR: [{ commerceOrderId }, { paymentRecordId: { in: paymentIds } }] },
          { provider: { in: [...EMAILISH_WEBHOOK_PROVIDERS] } },
        ],
      }
    : { AND: [{ commerceOrderId }, { provider: { in: [...EMAILISH_WEBHOOK_PROVIDERS] } }] };

  const [threads, notes, notificationCandidates, receipts] = await Promise.all([
    prisma.emailThread.findMany({
      where: { commerceOrderId },
      orderBy: { updatedAt: "asc" },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.operationalCommunicationNote.findMany({
      where: { commerceOrderId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.notificationEvent.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ type: { startsWith: "email." } }, { type: { startsWith: "commerce." } }],
      },
      orderBy: { createdAt: "desc" },
      take: 480,
    }),
    prisma.webhookDeliveryReceipt.findMany({
      where: receiptWhere,
      orderBy: { receivedAt: "asc" },
      take: 80,
    }),
  ]);

  const notifications: NotificationEvent[] = [];
  for (const n of notificationCandidates) {
    if (notifications.length >= 120) break;
    if (notificationPayloadLinksCommerceOrder(n.payload, commerceOrderId)) {
      notifications.push(n);
    }
  }
  notifications.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const emailDtos: CommunicationTimelineEmailMessageDto[] = [];
  for (const t of threads) {
    for (const m of t.messages) {
      emailDtos.push(messageToDto(t, m));
    }
  }

  const noteDtos: CommunicationTimelineInternalNoteDto[] = notes.map((n: OperationalCommunicationNote) => ({
    kind: "internal_note" as const,
    id: `note:${n.id}`,
    ts: n.createdAt.toISOString(),
    noteKind: n.kind,
    visibility: n.visibility,
    body: n.body,
    authorStaffSub: n.authorStaffSub,
    supportIssueId: n.supportIssueId,
  }));

  const notifDtos: CommunicationTimelineNotificationDto[] = notifications.map((n) => ({
    kind: "notification_event" as const,
    id: `notif:${n.id}`,
    ts: n.createdAt.toISOString(),
    type: n.type,
    processedAt: n.processedAt ? n.processedAt.toISOString() : null,
    payload: n.payload,
  }));

  const receiptDtos: CommunicationTimelineWebhookDto[] = receipts.map((r: WebhookDeliveryReceipt) => ({
    kind: "webhook_delivery" as const,
    id: `rcv:${r.id}`,
    ts: r.receivedAt.toISOString(),
    provider: r.provider,
    eventType: r.eventType,
    processingStatus: r.processingStatus,
    signatureValid: r.signatureValid,
    commerceOrderId: r.commerceOrderId,
    paymentRecordId: r.paymentRecordId,
  }));

  const merged: CommunicationTimelineEntryDto[] = [...emailDtos, ...noteDtos, ...notifDtos, ...receiptDtos];
  merged.sort((a, b) => {
    const cmp = Date.parse(a.ts) - Date.parse(b.ts);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
  return merged;
}
