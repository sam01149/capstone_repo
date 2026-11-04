CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" VARCHAR(40) NOT NULL,
  "target_id" UUID NOT NULL,
  "recipient_role" VARCHAR(32) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_recipient_role_created_at_idx" ON "notifications"("recipient_role", "created_at");
CREATE UNIQUE INDEX "notifications_one_active_condition" ON "notifications"("kind", "target_id", "recipient_role") WHERE "active";
CREATE TABLE "notification_reads" (
  "notification_id" UUID NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("notification_id", "user_id")
);

CREATE FUNCTION refresh_stock_notification(p_id UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE p RECORD; low_min BOOLEAN; low_rop BOOLEAN; msg TEXT;
BEGIN
  SELECT p0.name, p0.is_active, p0.minimum_stock, p0.reorder_point, COALESCE(b.current_stock, 0) AS stock
    INTO p FROM products p0 LEFT JOIN inventory_balances b ON b.product_id = p0.id WHERE p0.id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  low_min := p.is_active AND p.stock < p.minimum_stock;
  low_rop := p.is_active AND p.stock <= p.reorder_point;
  IF low_min OR low_rop THEN
    msg := 'Stok ' || left(p.name, 160) || CASE WHEN low_min AND low_rop THEN ' di bawah minimum dan mencapai ROP.' WHEN low_min THEN ' di bawah batas minimum.' ELSE ' mencapai ROP.' END;
    INSERT INTO notifications (kind, target_id, recipient_role, message)
      VALUES ('STOCK_ALERT', p_id, 'STOCK_MANAGER', msg)
      ON CONFLICT (kind, target_id, recipient_role) WHERE active DO UPDATE SET message = EXCLUDED.message, updated_at = CURRENT_TIMESTAMP;
  ELSE
    UPDATE notifications SET active = false, updated_at = CURRENT_TIMESTAMP WHERE kind = 'STOCK_ALERT' AND target_id = p_id AND active;
  END IF;
END $$;

CREATE FUNCTION stock_balance_notification_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN PERFORM refresh_stock_notification(NEW.product_id); RETURN NEW; END $$;
CREATE TRIGGER stock_balance_notification AFTER INSERT OR UPDATE OF current_stock ON inventory_balances FOR EACH ROW EXECUTE FUNCTION stock_balance_notification_trigger();

CREATE FUNCTION product_notification_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN PERFORM refresh_stock_notification(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER product_notification AFTER INSERT OR UPDATE OF name, is_active, minimum_stock, reorder_point ON products FOR EACH ROW EXECUTE FUNCTION product_notification_trigger();

SELECT refresh_stock_notification(id) FROM products;
