-- Optional gate for retail Shippo label purchases (see `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` / application code).
ALTER TABLE "fulfillment_groups" ADD COLUMN "fulfillment_approved_at" TIMESTAMPTZ(6);
ALTER TABLE "fulfillment_groups" ADD COLUMN "fulfillment_approved_by" VARCHAR(128);
