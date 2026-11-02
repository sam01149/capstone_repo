CREATE TABLE "forecast_datasets" (
  "source_hash" CHAR(64) NOT NULL,
  "product_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forecast_datasets_pkey" PRIMARY KEY ("source_hash"),
  CONSTRAINT "forecast_datasets_product_count_check" CHECK ("product_count" BETWEEN 1 AND 10000)
);
-- Unknown historical batch size must never be silently marked complete.
INSERT INTO "forecast_datasets" ("source_hash", "product_count")
SELECT "source_hash", 10000 FROM "demand_weeks" GROUP BY "source_hash";
ALTER TABLE "demand_weeks" ADD CONSTRAINT "demand_weeks_source_hash_fkey"
  FOREIGN KEY ("source_hash") REFERENCES "forecast_datasets"("source_hash") ON DELETE RESTRICT ON UPDATE CASCADE;
