ALTER TABLE "forecast_runs" ADD COLUMN "idempotency_key" UUID;
ALTER TABLE "forecast_runs" ADD COLUMN "request_hash" CHAR(64);
UPDATE "forecast_runs" SET "idempotency_key" = "id", "request_hash" = repeat('0', 64);
ALTER TABLE "forecast_runs" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "forecast_runs" ALTER COLUMN "request_hash" SET NOT NULL;
CREATE UNIQUE INDEX "forecast_runs_actor_user_id_idempotency_key_key" ON "forecast_runs"("actor_user_id", "idempotency_key");
