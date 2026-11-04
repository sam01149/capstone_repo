CREATE TABLE "demand_weeks" (
  "product_id" UUID NOT NULL,
  "week" DATE NOT NULL,
  "quantity" DECIMAL(15,3) NOT NULL,
  "bazaar" BOOLEAN NOT NULL,
  "mini_bazaar" BOOLEAN NOT NULL,
  "source_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_weeks_pkey" PRIMARY KEY ("product_id", "week"),
  CONSTRAINT "demand_weeks_quantity_nonnegative" CHECK ("quantity" >= 0),
  CONSTRAINT "demand_weeks_monday" CHECK (EXTRACT(ISODOW FROM "week") = 1),
  CONSTRAINT "demand_weeks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "demand_weeks_week_idx" ON "demand_weeks"("week");

CREATE TABLE "forecast_runs" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "input_hash" CHAR(64) NOT NULL,
  "input_snapshot" JSONB NOT NULL,
  "model_version" VARCHAR(80) NOT NULL,
  "result" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "forecast_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forecast_runs_status_check" CHECK ("status" IN ('RUNNING', 'SUCCESS', 'INSUFFICIENT_DATA', 'FAILED', 'SUPERSEDED')),
  CONSTRAINT "forecast_runs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "forecast_runs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "forecast_runs_product_id_created_at_idx" ON "forecast_runs"("product_id", "created_at");
CREATE INDEX "forecast_runs_actor_user_id_created_at_idx" ON "forecast_runs"("actor_user_id", "created_at");
CREATE UNIQUE INDEX "forecast_runs_one_active_per_product" ON "forecast_runs"("product_id") WHERE "status" = 'RUNNING';
