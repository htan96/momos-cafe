import type { CateringInquiry } from "@prisma/client";

/** JSON shape for `/api/admin/catering-inquiries` — snake_case for older admin UI compatibility. */
export function mapCateringInquiryToApi(row: CateringInquiry) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    event_date: row.eventDate,
    guest_count: row.guestCount,
    event_type: row.eventType,
    details: row.details,
    created_at: row.createdAt.toISOString(),
    status: row.status,
    assigned_to: row.assignedTo,
    last_follow_up_at: row.lastFollowUpAt?.toISOString() ?? null,
    internal_notes: row.internalNotes,
    submission_error: row.submissionError,
    contacted_at: row.contactedAt?.toISOString() ?? null,
  };
}
