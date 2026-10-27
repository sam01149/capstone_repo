UPDATE "orders"
SET "expires_at" = "created_at" + INTERVAL '24 hours'
WHERE "source" = 'PUBLIC_WHATSAPP' AND "expires_at" IS NULL;

UPDATE "orders"
SET "confirmed_at" = COALESCE("completed_at", "updated_at", "created_at")
WHERE "status" IN ('CONFIRMED','COMPLETED') AND "confirmed_at" IS NULL;

UPDATE "orders"
SET "completed_at" = COALESCE("confirmed_at", "updated_at", "created_at")
WHERE "status" = 'COMPLETED' AND "completed_at" IS NULL;

UPDATE "orders"
SET "cancelled_at" = COALESCE("updated_at", "created_at")
WHERE "status" = 'CANCELLED' AND "cancelled_at" IS NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_public_expiry_check"
    CHECK ("source" <> 'PUBLIC_WHATSAPP' OR "expires_at" IS NOT NULL),
  ADD CONSTRAINT "orders_confirmed_state_check"
    CHECK (
      "status" NOT IN ('CONFIRMED','COMPLETED')
      OR "confirmed_at" IS NOT NULL
    ),
  ADD CONSTRAINT "orders_completed_state_check"
    CHECK ("status" <> 'COMPLETED' OR "completed_at" IS NOT NULL),
  ADD CONSTRAINT "orders_cancelled_state_check"
    CHECK ("status" <> 'CANCELLED' OR "cancelled_at" IS NOT NULL);
