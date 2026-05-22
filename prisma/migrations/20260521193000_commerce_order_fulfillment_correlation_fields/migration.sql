-- Commerce order storefront provenance + fulfillment partitioning for webhook/correlation UI.

CREATE TYPE "CommerceOrderFulfillmentMode" AS ENUM ('MIXED', 'EXTERNAL_KITCHEN_ONLY', 'NATIVE_RETAIL_ONLY');

ALTER TABLE "commerce_orders" ADD COLUMN "source" TEXT;
ALTER TABLE "commerce_orders"
ADD COLUMN "fulfillment_mode" "CommerceOrderFulfillmentMode" NOT NULL DEFAULT 'MIXED';
