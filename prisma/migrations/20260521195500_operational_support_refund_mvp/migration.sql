-- Operational Support + Refund MVP (PostgreSQL UTF-8; tables use Unicode text.)

-- CreateEnum
CREATE TYPE "OperationalSupportIssueStatus" AS ENUM (
  'OPEN',
  'WAITING_CUSTOMER',
  'REVIEWING',
  'ESCALATED',
  'RESOLVED'
);

-- CreateEnum
CREATE TYPE "OperationalRefundCaseStatus" AS ENUM (
  'REQUESTED',
  'REVIEWING',
  'APPROVED',
  'DENIED',
  'SUBMITTED_TO_SQUARE',
  'SQUARE_COMPLETED',
  'SQUARE_FAILED'
);

-- CreateTable
CREATE TABLE "operational_support_issues" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "OperationalSupportIssueStatus" NOT NULL,
  "customer_id" UUID,
  "commerce_order_id" UUID,
  "shipment_id" UUID,
  "catering_inquiry_id" UUID,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "resolution_notes" TEXT,
  "created_by_staff_sub" VARCHAR(128),
  "assigned_to_staff_sub" VARCHAR(128),

  CONSTRAINT "operational_support_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_refund_cases" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "OperationalRefundCaseStatus" NOT NULL,
  "support_issue_id" TEXT,
  "commerce_order_id" UUID NOT NULL,
  "payment_record_id" UUID,
  "amount_cents" INTEGER,
  "reason" TEXT NOT NULL,
  "internal_notes" TEXT,
  "approved_by_staff_sub" VARCHAR(128),
  "requested_by_staff_sub" VARCHAR(128),
  "square_refund_id" VARCHAR(128),

  CONSTRAINT "operational_refund_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operational_support_issues_commerce_order_id_idx" ON "operational_support_issues"("commerce_order_id");

-- CreateIndex
CREATE INDEX "operational_support_issues_status_idx" ON "operational_support_issues"("status");

-- CreateIndex
CREATE INDEX "operational_refund_cases_commerce_order_id_idx" ON "operational_refund_cases"("commerce_order_id");

-- CreateIndex
CREATE INDEX "operational_refund_cases_status_idx" ON "operational_refund_cases"("status");

-- AddForeignKey
ALTER TABLE "operational_support_issues"
  ADD CONSTRAINT "operational_support_issues_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_support_issues"
  ADD CONSTRAINT "operational_support_issues_commerce_order_id_fkey"
  FOREIGN KEY ("commerce_order_id") REFERENCES "commerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_support_issues"
  ADD CONSTRAINT "operational_support_issues_shipment_id_fkey"
  FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_support_issues"
  ADD CONSTRAINT "operational_support_issues_catering_inquiry_id_fkey"
  FOREIGN KEY ("catering_inquiry_id") REFERENCES "catering_inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_refund_cases"
  ADD CONSTRAINT "operational_refund_cases_support_issue_id_fkey"
  FOREIGN KEY ("support_issue_id") REFERENCES "operational_support_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_refund_cases"
  ADD CONSTRAINT "operational_refund_cases_commerce_order_id_fkey"
  FOREIGN KEY ("commerce_order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_refund_cases"
  ADD CONSTRAINT "operational_refund_cases_payment_record_id_fkey"
  FOREIGN KEY ("payment_record_id") REFERENCES "payment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
