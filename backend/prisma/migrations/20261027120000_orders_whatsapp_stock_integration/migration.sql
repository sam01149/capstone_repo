CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_code" VARCHAR(16) NOT NULL,
  "source" VARCHAR(24) NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "customer_name" VARCHAR(120),
  "customer_phone" VARCHAR(32),
  "customer_email" VARCHAR(254),
  "customer_address" VARCHAR(500),
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "total_amount" INTEGER NOT NULL,
  "created_by_user_id" UUID,
  "confirmed_by_user_id" UUID,
  "expires_at" TIMESTAMPTZ(6),
  "confirmed_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "anonymized_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_public_code_key" UNIQUE ("public_code"),
  CONSTRAINT "orders_source_check" CHECK ("source" IN ('PUBLIC_WHATSAPP','INTERNAL')),
  CONSTRAINT "orders_status_check" CHECK ("status" IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED')),
  CONSTRAINT "orders_currency_check" CHECK ("currency" = 'IDR'),
  CONSTRAINT "orders_total_check" CHECK ("total_amount" >= 0),
  CONSTRAINT "orders_version_check" CHECK ("version" >= 0),
  CONSTRAINT "orders_customer_name_check" CHECK ("customer_name" IS NOT NULL OR "anonymized_at" IS NOT NULL),
  CONSTRAINT "orders_public_phone_check" CHECK ("source" <> 'PUBLIC_WHATSAPP' OR "customer_phone" IS NOT NULL OR "anonymized_at" IS NOT NULL),
  CONSTRAINT "orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "orders_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "orders_status_created_at_idx" ON "orders"("status","created_at");
CREATE INDEX "orders_source_created_at_idx" ON "orders"("source","created_at");
CREATE INDEX "orders_expires_at_idx" ON "orders"("expires_at");
CREATE INDEX "orders_completed_at_idx" ON "orders"("completed_at");
CREATE INDEX "orders_cancelled_at_idx" ON "orders"("cancelled_at");

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "order_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "snapshot_sku" VARCHAR(64) NOT NULL, "snapshot_name" VARCHAR(160) NOT NULL, "snapshot_unit" VARCHAR(20) NOT NULL,
  "unit_price" INTEGER NOT NULL, "quantity" DECIMAL(15,3) NOT NULL, "subtotal_amount" INTEGER NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_order_product_key" UNIQUE ("order_id","product_id"),
  CONSTRAINT "order_items_values_check" CHECK ("unit_price" > 0 AND "quantity" > 0 AND "subtotal_amount" >= 0),
  CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

CREATE TABLE "order_mutations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "key" UUID NOT NULL, "kind" VARCHAR(32) NOT NULL,
  "request_hash" CHAR(64) NOT NULL, "order_id" UUID NOT NULL, "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_mutations_pkey" PRIMARY KEY ("id"), CONSTRAINT "order_mutations_key_key" UNIQUE ("key"),
  CONSTRAINT "order_mutations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "order_mutations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "order_mutations_order_id_created_at_idx" ON "order_mutations"("order_id","created_at");

ALTER TABLE "stock_movements" ADD COLUMN "order_item_id" UUID;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_item_id_key" UNIQUE ("order_item_id");
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_type_check";
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_action_check";
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_reason_code_check";
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_type_check" CHECK ("type" IN ('IN','OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGED','EXPIRED','RETURN_IN','SALE_OUT'));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_action_check" CHECK ("action" IN ('SET_OPENING_BALANCE','ADD_STOCK','REDUCE_STOCK','ADJUST_TO_PHYSICAL','MARK_DAMAGED','MARK_EXPIRED','RETURN_CUSTOMER','CONFIRM_ORDER'));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reason_code_check" CHECK ("reason_code" IN ('OPENING_BALANCE','PURCHASE','RESTOCK','MANUAL_REDUCTION','PHYSICAL_COUNT','DAMAGED','EXPIRED','CUSTOMER_RETURN','SALE','OTHER'));
