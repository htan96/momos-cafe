-- Operational communication notes + enums (PostgreSQL UTF-8; Unicode text payloads.)

CREATE TYPE "OperationalCommunicationNoteVisibility" AS ENUM ('INTERNAL', 'CUSTOMER_VISIBLE');

CREATE TYPE "OperationalCommunicationNoteKind" AS ENUM (
    'GENERAL',
    'SUPPORT_HANDOFF',
    'REFUND_ESCALATION',
    'SHIPMENT_NOTE'
);

CREATE TABLE "operational_communication_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commerce_order_id" UUID,
    "customer_id" UUID,
    "support_issue_id" TEXT,
    "author_staff_sub" VARCHAR(128),
    "visibility" "OperationalCommunicationNoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "kind" "OperationalCommunicationNoteKind" NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "operational_communication_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operational_communication_notes_scope_xor" CHECK (
        ("commerce_order_id" IS NOT NULL AND "customer_id" IS NULL)
        OR ("commerce_order_id" IS NULL AND "customer_id" IS NOT NULL)
    )
);

ALTER TABLE "operational_communication_notes" ADD CONSTRAINT "operational_communication_notes_commerce_order_id_fkey"
    FOREIGN KEY ("commerce_order_id") REFERENCES "commerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operational_communication_notes" ADD CONSTRAINT "operational_communication_notes_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operational_communication_notes" ADD CONSTRAINT "operational_communication_notes_support_issue_id_fkey"
    FOREIGN KEY ("support_issue_id") REFERENCES "operational_support_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "operational_communication_notes_commerce_order_id_idx"
    ON "operational_communication_notes"("commerce_order_id");

CREATE INDEX "operational_communication_notes_customer_id_idx"
    ON "operational_communication_notes"("customer_id");
