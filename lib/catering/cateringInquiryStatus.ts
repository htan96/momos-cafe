import type { CateringInquiryStatus } from "@prisma/client";

export const CATERING_INQUIRY_STATUS_VALUES: readonly CateringInquiryStatus[] = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "closed",
  "failed_submission",
] as const;

export function isCateringInquiryStatus(value: string): value is CateringInquiryStatus {
  return (CATERING_INQUIRY_STATUS_VALUES as readonly string[]).includes(value);
}

export const CATERING_INQUIRY_STATUS_LABELS: Record<CateringInquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  closed: "Closed",
  failed_submission: "Failed submission",
};

/** Short admin-facing explanations surfaced on catering pipeline hover (card + dropdown help). */
export const CATERING_INQUIRY_STATUS_TOOLTIP: Record<CateringInquiryStatus, string> = {
  new:
    "Fresh web intake—we have the request but no staff member has replied on this thread yet.",
  contacted:
    "Someone on the team has reached out at least once. Keep timestamps and notes updated as it moves.",
  quoted:
    "A menu or estimate has been shared; we're waiting on the guest to approve, adjust, or decline.",
  booked:
    "The guest confirmed the event—treat like a wins column and pivot to fulfillment planning.",
  closed:
    "Conversation ended cleanly (timing, decline, fulfilled elsewhere, etc.).",
  failed_submission:
    "The public form timed out—verify details with the guest before archiving.",
};
