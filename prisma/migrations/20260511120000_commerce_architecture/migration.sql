-- Commerce architecture: Customer, cart sessions, platform orders, fulfillment, Square cache, shipping, payments.

CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "external_auth_subject" TEXT,
    "square_customer_id" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE UNIQUE INDEX "customers_external_auth_subject_key" ON "customers"("external_auth_subject");

CREATE TABLE "cart_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "guest_token" TEXT,
    "customer_id" UUID,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "cart_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_sessions_guest_token_key" ON "cart_sessions"("guest_token");
CREATE INDEX "cart_sessions_customer_id_idx" ON "cart_sessions"("customer_id");

ALTER TABLE "cart_sessions" ADD CONSTRAINT "cart_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "line_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "square_catalog_item_id" TEXT,
    "square_variation_id" TEXT,
    "fulfillment_pipeline" TEXT NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cart_items_session_id_idx" ON "cart_items"("session_id");
CREATE UNIQUE INDEX "cart_items_session_id_line_id_key" ON "cart_items"("session_id", "line_id");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cart_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "commerce_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customer_id" UUID,
    "guest_cart_token" TEXT,
    "total_cents" INTEGER NOT NULL,
    "kitchen_subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "retail_subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commerce_orders_status_idx" ON "commerce_orders"("status");
CREATE INDEX "commerce_orders_created_at_idx" ON "commerce_orders"("created_at" DESC);

ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "commerce_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "payload" JSONB,
    "square_catalog_item_id" TEXT,
    "square_variation_id" TEXT,
    "fulfillment_pipeline" TEXT NOT NULL,

    CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commerce_order_items_order_id_idx" ON "commerce_order_items"("order_id");

ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pickup_windows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "pipeline" TEXT NOT NULL DEFAULT 'KITCHEN',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "capacity" INTEGER,

    CONSTRAINT "pickup_windows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fulfillment_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "pipeline" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimated_ready_at" TIMESTAMPTZ(6),
    "pickup_window_id" UUID,

    CONSTRAINT "fulfillment_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fulfillment_groups_order_id_idx" ON "fulfillment_groups"("order_id");

ALTER TABLE "fulfillment_groups" ADD CONSTRAINT "fulfillment_groups_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fulfillment_groups" ADD CONSTRAINT "fulfillment_groups_pickup_window_id_fkey" FOREIGN KEY ("pickup_window_id") REFERENCES "pickup_windows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "fulfillment_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,

    CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fulfillment_items_group_id_order_item_id_key" ON "fulfillment_items"("group_id", "order_item_id");

ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "fulfillment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "commerce_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "square_catalog_item_id" TEXT NOT NULL,
    "square_category_id" TEXT,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_cache_square_catalog_item_id_key" ON "product_cache"("square_catalog_item_id");

CREATE TABLE "product_variant_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_cache_id" UUID NOT NULL,
    "square_variation_id" TEXT NOT NULL,
    "sku" TEXT,
    "price_cents" INTEGER,
    "data" JSONB,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variant_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variant_cache_square_variation_id_key" ON "product_variant_cache"("square_variation_id");
CREATE INDEX "product_variant_cache_product_cache_id_idx" ON "product_variant_cache"("product_cache_id");

ALTER TABLE "product_variant_cache" ADD CONSTRAINT "product_variant_cache_product_cache_id_fkey" FOREIGN KEY ("product_cache_id") REFERENCES "product_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shipping_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID,
    "cart_session_id" UUID,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipping_addresses_customer_id_idx" ON "shipping_addresses"("customer_id");

ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_cart_session_id_fkey" FOREIGN KEY ("cart_session_id") REFERENCES "cart_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_id" UUID,
    "square_payment_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_records_order_id_idx" ON "payment_records"("order_id");

ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
