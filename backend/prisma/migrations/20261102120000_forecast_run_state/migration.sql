ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_completion_check" CHECK (
  ("status" = 'RUNNING' AND "completed_at" IS NULL AND "result" IS NULL) OR
  ("status" IN ('SUCCESS', 'INSUFFICIENT_DATA') AND "completed_at" IS NOT NULL AND "result" IS NOT NULL) OR
  ("status" IN ('FAILED', 'SUPERSEDED') AND "completed_at" IS NOT NULL)
);
