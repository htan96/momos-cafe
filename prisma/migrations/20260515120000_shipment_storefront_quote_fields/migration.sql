-- Storefront shipping quote + label purchase linkage on operational shipment rows.
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "shipping_cents" INTEGER;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "shipping_service" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "selected_shippo_rate_id" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
