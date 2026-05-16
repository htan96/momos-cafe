-- Operational fields for lightweight catering inquiry management (staff workflows + failed intake).

-- CreateEnum
CREATE TYPE "CateringInquiryStatus" AS ENUM ('new', 'contacted', 'quoted', 'booked', 'closed', 'failed_submission');

-- AlterTable
ALTER TABLE "catering_inquiries" ADD COLUMN "status" "CateringInquiryStatus" NOT NULL DEFAULT 'new';
ALTER TABLE "catering_inquiries" ADD COLUMN "assigned_to" TEXT;
ALTER TABLE "catering_inquiries" ADD COLUMN "last_follow_up_at" TIMESTAMPTZ(6);
ALTER TABLE "catering_inquiries" ADD COLUMN "internal_notes" TEXT;
ALTER TABLE "catering_inquiries" ADD COLUMN "submission_error" TEXT;
ALTER TABLE "catering_inquiries" ADD COLUMN "contacted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "catering_inquiries_status_idx" ON "catering_inquiries"("status");
