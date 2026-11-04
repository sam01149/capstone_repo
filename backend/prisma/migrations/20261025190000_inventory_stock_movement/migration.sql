ALTER TABLE "products"
  ALTER COLUMN "minimum_stock" TYPE DECIMAL(15,3) USING "minimum_stock"::DECIMAL(15,3),
  ALTER COLUMN "minimum_stock" SET DEFAULT 0,
  ALTER COLUMN "safety_stock" TYPE DECIMAL(15,3) USING "safety_stock"::DECIMAL(15,3),
  ALTER COLUMN "safety_stock" SET DEFAULT 0,
  ALTER COLUMN "reorder_point" TYPE DECIMAL(15,3) USING "reorder_point"::DECIMAL(15,3),
  ALTER COLUMN "reorder_point" SET DEFAULT 0,
  ADD COLUMN "stock_unit" VARCHAR(20) NOT NULL DEFAULT 'UNIT';

ALTER TABLE "products" ADD CONSTRAINT "products_stock_unit_check"
  CHECK ("stock_unit" IN ('UNIT', 'PACK', 'BOX', 'BOTTLE', 'SACK', 'KG', 'GRAM', 'LITER', 'MILLILITER'));

CREATE TABLE "inventory_balances" (
  "product_id" UUID NOT NULL,
  "current_stock" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "inventory_balances_nonnegative_check" CHECK ("current_stock" >= 0),
  CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "inventory_balances_current_stock_idx" ON "inventory_balances"("current_stock");

INSERT INTO "inventory_balances" ("product_id", "current_stock", "version", "updated_at")
SELECT "id", 0, 0, CURRENT_TIMESTAMP FROM "products";

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "quantity" DECIMAL(15,3) NOT NULL,
  "stock_before" DECIMAL(15,3) NOT NULL,
  "stock_after" DECIMAL(15,3) NOT NULL,
  "reason_code" VARCHAR(40) NOT NULL,
  "note" VARCHAR(1000),
  "reference_type" VARCHAR(40),
  "reference_id" VARCHAR(100),
  "idempotency_key" UUID NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "stock_movements_stock_nonnegative_check" CHECK ("stock_before" >= 0 AND "stock_after" >= 0),
  CONSTRAINT "stock_movements_type_check" CHECK ("type" IN ('IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGED', 'EXPIRED', 'RETURN_IN')),
  CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "stock_movements_actor_user_id_idempotency_key_key" ON "stock_movements"("actor_user_id", "idempotency_key");
CREATE INDEX "stock_movements_product_id_occurred_at_id_idx" ON "stock_movements"("product_id", "occurred_at", "id");
CREATE INDEX "stock_movements_type_occurred_at_idx" ON "stock_movements"("type", "occurred_at");
CREATE INDEX "stock_movements_actor_user_id_occurred_at_idx" ON "stock_movements"("actor_user_id", "occurred_at");
