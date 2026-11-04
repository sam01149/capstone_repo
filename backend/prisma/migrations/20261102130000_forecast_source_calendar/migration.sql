ALTER TABLE "forecast_datasets" ADD COLUMN "start_week" DATE;
ALTER TABLE "forecast_datasets" ADD COLUMN "end_week" DATE;
ALTER TABLE "forecast_datasets" ADD COLUMN "unrecorded_weeks" JSONB;
ALTER TABLE "forecast_datasets" ADD CONSTRAINT "forecast_dataset_calendar_check" CHECK (
  ("start_week" IS NULL AND "end_week" IS NULL AND "unrecorded_weeks" IS NULL) OR
  ("start_week" IS NOT NULL AND "end_week" IS NOT NULL AND "unrecorded_weeks" IS NOT NULL AND "start_week" <= "end_week" AND
   EXTRACT(ISODOW FROM "start_week") = 1 AND EXTRACT(ISODOW FROM "end_week") = 1 AND
   jsonb_typeof("unrecorded_weeks") = 'array')
);
