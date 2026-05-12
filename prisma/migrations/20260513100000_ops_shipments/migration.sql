-- Ops console: manual shipment tracking per fulfillment group (before carrier API integration).

CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfillment_group_id" UUID NOT NULL,
    "carrier" TEXT,
    "tracking_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shipped_at" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipments_fulfillment_group_id_idx" ON "shipments"("fulfillment_group_id");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "fulfillment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
