CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "admin_settings" ("id", "data", "updated_at")
VALUES ('default', '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "cafe_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cart" JSONB NOT NULL,
    "customer" JSONB NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "fulfillment_type" TEXT NOT NULL DEFAULT 'PICKUP',
    "scheduled_for" TIMESTAMPTZ(6),
    "estimated_pickup_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "square_payment_id" TEXT,
    "square_order_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "cafe_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cafe_orders_created_at_idx" ON "cafe_orders" ("created_at" DESC);
CREATE INDEX "cafe_orders_status_idx" ON "cafe_orders" ("status");

CREATE TABLE "catering_inquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "event_date" TEXT NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "event_type" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catering_inquiries_pkey" PRIMARY KEY ("id")
);
