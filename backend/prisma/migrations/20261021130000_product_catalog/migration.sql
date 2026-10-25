CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_normalized" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_normalized_lower_check"
      CHECK ("name_normalized" = lower("name_normalized"))
);

CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "sku_normalized" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" VARCHAR(1000),
    "category_id" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "image_ref" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "safety_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_sku_normalized_lower_check"
      CHECK ("sku_normalized" = lower("sku_normalized")),
    CONSTRAINT "products_price_positive_check" CHECK ("price" > 0),
    CONSTRAINT "products_minimum_stock_nonnegative_check" CHECK ("minimum_stock" >= 0),
    CONSTRAINT "products_lead_time_days_nonnegative_check" CHECK ("lead_time_days" >= 0),
    CONSTRAINT "products_safety_stock_nonnegative_check" CHECK ("safety_stock" >= 0),
    CONSTRAINT "products_reorder_point_nonnegative_check" CHECK ("reorder_point" >= 0),
    CONSTRAINT "products_image_ref_https_check"
      CHECK ("image_ref" IS NULL OR "image_ref" LIKE 'https://%')
);

CREATE UNIQUE INDEX "categories_name_normalized_key" ON "categories"("name_normalized");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");
CREATE UNIQUE INDEX "products_sku_normalized_key" ON "products"("sku_normalized");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_category_id_is_active_idx" ON "products"("category_id", "is_active");
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
