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
