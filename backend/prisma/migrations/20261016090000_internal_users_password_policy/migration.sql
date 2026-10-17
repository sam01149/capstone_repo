ALTER TABLE "users"
  DROP CONSTRAINT IF EXISTS "users_temporary_password_expiry_check";

ALTER TABLE "users"
  DROP COLUMN "temporary_password_expires_at";

CREATE INDEX "audit_logs_target_type_target_id_created_at_idx"
  ON "audit_logs"("target_type", "target_id", "created_at");
