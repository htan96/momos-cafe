-- Outbox lease + SES idempotency (UTF-8)
ALTER TABLE "email_messages"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "email_messages_idempotency_key_key"
ON "email_messages" ("idempotency_key");

ALTER TABLE "notification_events"
ADD COLUMN "started_processing_at" TIMESTAMPTZ(6);

CREATE INDEX "notification_events_processed_at_idx"
ON "notification_events" ("processed_at");

CREATE INDEX "notification_events_processed_at_started_processing_at_idx"
ON "notification_events" ("processed_at", "started_processing_at");
