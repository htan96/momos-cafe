import type { EmailMessage, OperationalCommunicationNoteKind } from "@prisma/client";
import { OperationalCommunicationNoteVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CustomerOrderCommunicationRowDto = {
  id: string;
  kind: "email_in" | "email_out" | "staff_note";
  occurredAt: Date;
  subjectLine: string;
  preview: string;
};

function truncate(t: string | null | undefined, max: number): string {
  if (t == null) return "";
  const s = t.trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function previewFromMessage(m: Pick<EmailMessage, "textBody" | "htmlBody" | "subject">): string {
  const raw = m.textBody ?? m.htmlBody ?? m.subject ?? "";
  return truncate(raw, 320);
}

export function customerNoteKindSubject(kind: OperationalCommunicationNoteKind): string {
  switch (kind) {
    case "SUPPORT_HANDOFF":
      return "Support handoff";
    case "REFUND_ESCALATION":
      return "Refund coordination";
    case "SHIPMENT_NOTE":
      return "Shipping note";
    case "GENERAL":
    default:
      return "Note from our team";
  }
}

/**
 * Customer-safe comms for an order — real `EmailThread` / `EmailMessage` rows plus
 * `OperationalCommunicationNote` with **`CUSTOMER_VISIBLE`** only (no internals, no webhook stubs).
 */
export async function loadCustomerOrderCommunications(commerceOrderId: string) {
  const [threads, notes] = await Promise.all([
    prisma.emailThread.findMany({
      where: { commerceOrderId },
      orderBy: { updatedAt: "asc" },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.operationalCommunicationNote.findMany({
      where: { commerceOrderId, visibility: OperationalCommunicationNoteVisibility.CUSTOMER_VISIBLE },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const merged: CustomerOrderCommunicationRowDto[] = [];

  for (const t of threads) {
    for (const m of t.messages) {
      const direction = m.direction.toLowerCase();
      merged.push({
        id: `email:${m.id}`,
        kind: direction === "outbound" ? "email_out" : "email_in",
        occurredAt: m.createdAt,
        subjectLine:
          m.subject?.trim() ||
          t.subjectSnapshot?.trim() ||
          (direction === "outbound" ? "Email from Momos" : "Your message"),
        preview: previewFromMessage(m),
      });
    }
  }

  for (const n of notes) {
    merged.push({
      id: `note:${n.id}`,
      kind: "staff_note",
      occurredAt: n.createdAt,
      subjectLine: customerNoteKindSubject(n.kind),
      preview: truncate(n.body, 360),
    });
  }

  merged.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  return merged;
}
