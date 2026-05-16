import type { CateringInquiry, CateringInquiryStatus } from "@prisma/client";

export type CateringInquiryDetailPayload = {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  guestCount: number;
  eventType: string | null;
  details: string | null;
  createdAt: string;
  status: CateringInquiryStatus;
  assignedTo: string | null;
  lastFollowUpAt: string | null;
  internalNotes: string | null;
  submissionError: string | null;
  contactedAt: string | null;
};

export function toCateringInquiryDetailPayload(row: CateringInquiry): CateringInquiryDetailPayload {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    eventDate: row.eventDate,
    guestCount: row.guestCount,
    eventType: row.eventType,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    assignedTo: row.assignedTo,
    lastFollowUpAt: row.lastFollowUpAt?.toISOString() ?? null,
    internalNotes: row.internalNotes,
    submissionError: row.submissionError,
    contactedAt: row.contactedAt?.toISOString() ?? null,
  };
}
