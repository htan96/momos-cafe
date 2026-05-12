-- Secure orchestration: payments lifecycle, Square cache columns, catalog sync state,
-- email threading + notification audit. Safe additive migration.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "auth_metadata" JSONB;

ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'square';
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "square_payment_status" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "captured_at" TIMESTAMPTZ(6);
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_records_idempotency_key_key" ON "payment_records"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "payment_records_square_payment_id_idx" ON "payment_records"("square_payment_id");

ALTER TABLE "product_cache" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "product_cache" ADD COLUMN IF NOT EXISTS "primary_image_url" TEXT;
ALTER TABLE "product_cache" ADD COLUMN IF NOT EXISTS "is_available" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "product_variant_cache" ADD COLUMN IF NOT EXISTS "quantity_on_hand" INTEGER;
ALTER TABLE "product_variant_cache" ADD COLUMN IF NOT EXISTS "inventory_updated_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "catalog_sync_state" (
    "id" TEXT NOT NULL,
    "store_category_square_id" TEXT,
    "last_full_sync_at" TIMESTAMPTZ(6),
    "last_sync_stats" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_sync_state_pkey" PRIMARY KEY ("id")
);

INSERT INTO "catalog_sync_state" ("id", "updated_at")
VALUES ('singleton', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "email_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID,
    "commerce_order_id" UUID,
    "cafe_order_id" UUID,
    "subject_snapshot" TEXT,
    "provider_thread_key" TEXT,

    CONSTRAINT "email_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_threads_provider_thread_key_key" ON "email_threads"("provider_thread_key") WHERE "provider_thread_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "email_threads_customer_id_idx" ON "email_threads"("customer_id");
CREATE INDEX IF NOT EXISTS "email_threads_commerce_order_id_idx" ON "email_threads"("commerce_order_id");

ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_commerce_order_id_fkey" FOREIGN KEY ("commerce_order_id") REFERENCES "commerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thread_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "to_emails" JSONB NOT NULL,
    "subject" TEXT,
    "text_body" TEXT,
    "html_body" TEXT,
    "provider_message_id" TEXT,
    "rfc_message_id" TEXT,
    "in_reply_to" TEXT,
    "references_header" TEXT,
    "fulfillment_group_id" UUID,
    "delivery_status" TEXT NOT NULL DEFAULT 'queued',
    "raw_payload" JSONB,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_messages_provider_message_id_key" ON "email_messages"("provider_message_id") WHERE "provider_message_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "email_messages_thread_id_idx" ON "email_messages"("thread_id");

ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "email_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "order_message_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "order_kind" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "fulfillment_group_id" UUID,

    CONSTRAINT "order_message_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_message_links_order_kind_order_id_idx" ON "order_message_links"("order_kind", "order_id");

ALTER TABLE "order_message_links" ADD CONSTRAINT "order_message_links_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_message_links" ADD CONSTRAINT "order_message_links_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "email_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_customer_id_thread_id_key" ON "conversation_participants"("customer_id", "thread_id");

CREATE INDEX IF NOT EXISTS "conversation_participants_thread_id_idx" ON "conversation_participants"("thread_id");

ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "email_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "notification_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_events_created_at_idx" ON "notification_events"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "notification_events_type_idx" ON "notification_events"("type");
