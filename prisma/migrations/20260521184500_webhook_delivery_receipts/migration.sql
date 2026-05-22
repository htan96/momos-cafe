-- WebhookDeliveryReceipt + WebhookProcessingStatus (UTF-8)
-- Receipts omit raw payloads; optional SHA-256 of UTF-8 body in payload_hash.

CREATE TYPE "WebhookProcessingStatus" AS ENUM ('accepted', 'ignored', 'processed', 'failed');

CREATE TABLE "webhook_delivery_receipts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT,
    "event_type" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature_valid" BOOLEAN NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL,
    "http_status" INTEGER,
    "error_code" TEXT,
    "commerce_order_id" UUID,
    "payment_record_id" UUID,
    "payload_hash" TEXT,
    "ops_event_id" TEXT,

    CONSTRAINT "webhook_delivery_receipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_delivery_receipts_provider_received_at_idx"
  ON "webhook_delivery_receipts"("provider", "received_at" DESC);

CREATE INDEX "webhook_delivery_receipts_commerce_order_received_at_idx"
  ON "webhook_delivery_receipts"("commerce_order_id", "received_at" DESC);

CREATE INDEX "webhook_delivery_receipts_payment_received_at_idx"
  ON "webhook_delivery_receipts"("payment_record_id", "received_at" DESC);

CREATE INDEX "webhook_delivery_receipts_provider_external_event_idx"
  ON "webhook_delivery_receipts"("provider", "external_event_id");

CREATE UNIQUE INDEX "webhook_delivery_receipts_provider_external_event_partial_key"
  ON "webhook_delivery_receipts"("provider", "external_event_id")
  WHERE ("external_event_id" IS NOT NULL);

